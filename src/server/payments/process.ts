import "server-only";

import mongoose, { type ClientSession } from "mongoose";

import { dbConnect } from "@/server/db";
import {
  Coupon,
  Order,
  Product,
  recordAudit,
  recordPayment,
  type OrderDoc,
} from "@/server/models";
import { restoreStockForOrder } from "@/server/commerce/inventory";
import {
  grantStoreCredit,
  refundStoreCreditForOrder,
} from "@/server/commerce/store-credit";
import { DISCOVERY_SET_SLUG } from "@/lib/catalog";
import type {
  OrderStatus,
  PAYMENT_EVENT_SOURCES,
} from "@/lib/validation/commerce";

type Source = (typeof PAYMENT_EVENT_SOURCES)[number];

/**
 * Order state machine + the payment processors. "The webhook is the truth":
 * `confirmPaidOrder`, `markPaymentFailed`, `cancelUnpaidOrder` and `recordRefund`
 * are all **idempotent** — a retried webhook, a callback that races the webhook,
 * or a cron sweep hitting an already-handled order is a clean no-op.
 */

// ── state machine ──────────────────────────────────────────────────────

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "shipped", "cancelled", "refunded"],
  processing: ["shipped", "cancelled", "refunded"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return from === to || TRANSITIONS[from]?.includes(to) === true;
}

/** Mutate the order doc's status + append a timeline entry. Caller saves. */
export function transitionOrder(
  order: OrderDoc & { save?: unknown },
  to: OrderStatus,
  opts: {
    actor: "customer" | "system" | "staff";
    actorId?: mongoose.Types.ObjectId | string | null;
    note?: string;
  },
): void {
  if (!canTransition(order.status, to)) {
    throw new Error(`illegal order transition ${order.status} → ${to}`);
  }
  order.status = to;
  order.timeline.push({
    at: new Date(),
    status: to,
    actor: opts.actor,
    actorId: (opts.actorId ?? null) as OrderDoc["timeline"][number]["actorId"],
    note: opts.note,
  });
}

// ── confirm a paid order ───────────────────────────────────────────────

export interface ConfirmPaymentInput {
  /** either identifier resolves the order */
  orderNumber?: string;
  providerOrderId?: string;
  providerPaymentId: string;
  signature?: string | null;
  source: Source;
  webhookEventId?: string | null;
  /** instrument details from Razorpay */
  instrument?: string | null;
  last4?: string | null;
  upiVpa?: string | null;
  amountPaise?: number | null;
  raw?: Record<string, unknown> | null;
}

export type ConfirmResult =
  | { ok: true; orderNumber: string; reused: boolean }
  | { ok: false; reason: "not-found" | "amount-mismatch" | "bad-state" };

export async function confirmPaidOrder(
  input: ConfirmPaymentInput,
): Promise<ConfirmResult> {
  await dbConnect();
  const dbSession = await mongoose.startSession();
  let out: ConfirmResult | undefined;

  try {
    await dbSession.withTransaction(async () => {
      const order = await findOrder(input, dbSession);
      if (!order) {
        out = { ok: false, reason: "not-found" };
        return;
      }

      // Idempotent: already paid → no-op.
      if (order.payment.status === "paid" || order.status !== "pending") {
        out = { ok: true, orderNumber: order.orderNumber, reused: true };
        return;
      }

      // Amount guard — the Razorpay amount must equal our server total.
      if (
        input.amountPaise != null &&
        input.amountPaise !== order.pricing.grandTotalPaise
      ) {
        out = { ok: false, reason: "amount-mismatch" };
        return;
      }

      transitionOrder(order, "confirmed", {
        actor: "system",
        note:
          input.source === "webhook"
            ? "Payment captured — confirmed by Razorpay webhook."
            : "Payment received.",
      });
      order.payment.status = "paid";
      order.payment.providerPaymentId = input.providerPaymentId;
      if (input.providerOrderId)
        order.payment.providerOrderId = input.providerOrderId;
      if (input.signature) order.payment.signature = input.signature;
      order.payment.instrument = input.instrument ?? order.payment.instrument;
      order.payment.last4 = input.last4 ?? order.payment.last4;
      order.payment.upiVpa = input.upiVpa ?? order.payment.upiVpa;
      order.payment.capturedAt = new Date();
      order.paymentDueBy = null;
      await order.save({ session: dbSession });

      // Discovery-Set credit — issued now, on verified payment (idempotent per
      // order + reason via a unique index in the StoreCredit model).
      for (const item of order.items) {
        if (item.slug !== DISCOVERY_SET_SLUG) continue;
        const product = await Product.findById(item.productId)
          .select("credit")
          .session(dbSession)
          .lean<{ credit?: { amount?: number; expiryDays?: number | null } }>();
        const amount = product?.credit?.amount ?? 0;
        if (amount > 0) {
          await grantStoreCredit(
            {
              userId: order.userId,
              amountPaise: amount,
              reason: "discovery_set_purchase",
              sourceOrderId: order._id,
              expiresAt: product?.credit?.expiryDays
                ? new Date(
                    Date.now() + product.credit.expiryDays * 86_400_000,
                  )
                : null,
              note: "Discovery Set — credit toward a full-size bottle",
            },
            dbSession,
          );
        }
      }

      await recordPayment(
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          provider: "razorpay",
          event: "captured",
          amountPaise: order.pricing.grandTotalPaise,
          providerOrderId: order.payment.providerOrderId,
          providerPaymentId: input.providerPaymentId,
          providerRefundId: null,
          method: input.instrument ?? null,
          last4: input.last4 ?? null,
          upiVpa: input.upiVpa ?? null,
          signatureVerified: Boolean(input.signature) || input.source === "webhook",
          source: input.source,
          webhookEventId: input.webhookEventId ?? null,
          raw: redact(input.raw),
          note: null,
        },
        dbSession,
      );

      out = { ok: true, orderNumber: order.orderNumber, reused: false };
    });
  } finally {
    await dbSession.endSession();
  }

  const result: ConfirmResult = out ?? { ok: false, reason: "not-found" };
  if (result.ok && !result.reused) {
    await recordAudit({
      actorId: null,
      actorRole: "system",
      action: "order.paid",
      targetType: "Order",
      targetId: result.orderNumber,
      after: { source: input.source, paymentId: input.providerPaymentId },
      ip: null,
      userAgent: null,
    });
    // TODO(phase-f): enqueue confirmation email + GST invoice PDF
  }
  return result;
}

// ── mark a payment failed (order stays pending; customer can retry) ─────

export async function markPaymentFailed(input: {
  orderNumber?: string;
  providerOrderId?: string;
  providerPaymentId: string | null;
  reason: string;
  source: Source;
  webhookEventId?: string | null;
  raw?: Record<string, unknown> | null;
}): Promise<{ ok: boolean }> {
  await dbConnect();
  const order = await findOrder(input);
  if (!order || order.payment.status === "paid") return { ok: false };

  order.payment.status = "failed";
  order.timeline.push({
    at: new Date(),
    status: order.status,
    actor: "system",
    actorId: null,
    note: `Payment attempt failed — ${input.reason}. You can retry from checkout.`,
  });
  await order.save();

  await recordPayment({
    orderId: order._id,
    orderNumber: order.orderNumber,
    provider: "razorpay",
    event: "failed",
    amountPaise: order.pricing.grandTotalPaise,
    providerOrderId: order.payment.providerOrderId,
    providerPaymentId: input.providerPaymentId,
    providerRefundId: null,
    method: null,
    last4: null,
    upiVpa: null,
    signatureVerified: input.source === "webhook",
    source: input.source,
    webhookEventId: input.webhookEventId ?? null,
    raw: redact(input.raw),
    note: input.reason,
  });
  // TODO(phase-f): enqueue "payment failed — resume" email
  return { ok: true };
}

// ── cancel an unpaid order (auto-cancel job / customer / admin) ─────────

export async function cancelUnpaidOrder(
  orderId: mongoose.Types.ObjectId | string,
  opts: { reason: string; source: Source; actorId?: string | null },
): Promise<{ ok: boolean; orderNumber?: string }> {
  await dbConnect();
  const dbSession = await mongoose.startSession();
  let result: { ok: boolean; orderNumber?: string } = { ok: false };

  try {
    await dbSession.withTransaction(async () => {
      const order = await Order.findById(orderId).session(dbSession);
      if (!order) return;
      if (order.status !== "pending" || order.payment.status === "paid") {
        result = { ok: false, orderNumber: order.orderNumber };
        return;
      }

      transitionOrder(order, "cancelled", {
        actor: opts.source === "cron" ? "system" : "staff",
        actorId: opts.actorId ?? null,
        note: opts.reason,
      });
      order.payment.status =
        order.payment.status === "failed" ? "failed" : order.payment.status;
      order.paymentDueBy = null;
      await order.save({ session: dbSession });

      // Release the stock hold.
      await restoreStockForOrder(
        order.items.map((i) => ({
          productId: i.productId,
          sku: i.sku,
          qty: i.qty,
        })),
        order._id,
        "cancellation",
        dbSession,
      );

      // Give back any store credit spent on this order.
      if (order.pricing.creditAppliedPaise > 0) {
        await refundStoreCreditForOrder(order.userId, order._id, dbSession);
      }

      // Free the coupon use.
      if (order.coupon?.code) {
        await Coupon.updateOne(
          { code: order.coupon.code, usedCount: { $gt: 0 } },
          { $inc: { usedCount: -1 } },
          { session: dbSession },
        );
      }

      await recordPayment(
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          provider: order.payment.method === "cod" ? "cod" : "razorpay",
          event: "failed",
          amountPaise: order.pricing.grandTotalPaise,
          providerOrderId: order.payment.providerOrderId,
          providerPaymentId: null,
          providerRefundId: null,
          method: null,
          last4: null,
          upiVpa: null,
          signatureVerified: false,
          source: opts.source,
          webhookEventId: null,
          raw: null,
          note: `Order cancelled — ${opts.reason}`,
        },
        dbSession,
      );

      result = { ok: true, orderNumber: order.orderNumber };
    });
  } finally {
    await dbSession.endSession();
  }

  if (result.ok) {
    await recordAudit({
      actorId: opts.actorId ? (opts.actorId as unknown as null) : null,
      actorRole: opts.source === "cron" ? "system" : "staff",
      action: "order.cancelled",
      targetType: "Order",
      targetId: result.orderNumber ?? String(orderId),
      after: { reason: opts.reason, source: opts.source },
      ip: null,
      userAgent: null,
    });
  }
  return result;
}

// ── refunds (webhook refund.processed + the admin engine) ───────────────

export async function recordRefund(input: {
  orderNumber: string;
  amountPaise: number;
  providerRefundId: string | null;
  status: "created" | "processed" | "failed";
  reason: string;
  actorId?: string | null;
  source: Source;
  via?: "razorpay" | "manual";
  restock?: boolean;
}): Promise<{ ok: boolean; orderStatus?: OrderStatus }> {
  await dbConnect();
  const dbSession = await mongoose.startSession();
  let result: { ok: boolean; orderStatus?: OrderStatus } = { ok: false };

  try {
    await dbSession.withTransaction(async () => {
      const order = await Order.findOne({
        orderNumber: input.orderNumber,
      }).session(dbSession);
      if (!order) return;

      // Idempotent on the provider refund id.
      const already =
        input.providerRefundId &&
        order.refunds.some(
          (r) => r.providerRefundId === input.providerRefundId,
        );
      if (already) {
        result = { ok: true, orderStatus: order.status };
        return;
      }

      order.refunds.push({
        amountPaise: input.amountPaise,
        reason: input.reason,
        providerRefundId: input.providerRefundId,
        status: input.status,
        actorId: (input.actorId ??
          null) as OrderDoc["refunds"][number]["actorId"],
        via: input.via ?? "razorpay",
        createdAt: new Date(),
      });

      if (input.status === "processed") {
        order.payment.refundedPaise += input.amountPaise;
        const full =
          order.payment.refundedPaise >= order.pricing.grandTotalPaise;
        order.payment.status = full ? "refunded" : "partially_refunded";
        if (full && canTransition(order.status, "refunded")) {
          transitionOrder(order, "refunded", {
            actor: input.source === "webhook" ? "system" : "staff",
            actorId: input.actorId ?? null,
            note: `Refunded ${input.amountPaise} paise — ${input.reason}`,
          });
        } else {
          order.timeline.push({
            at: new Date(),
            status: order.status,
            actor: input.source === "webhook" ? "system" : "staff",
            actorId: null,
            note: `Partial refund ${input.amountPaise} paise — ${input.reason}`,
          });
        }

        if (input.restock) {
          await restoreStockForOrder(
            order.items.map((i) => ({
              productId: i.productId,
              sku: i.sku,
              qty: i.qty,
            })),
            order._id,
            "return",
            dbSession,
          );
        }
      }

      await order.save({ session: dbSession });

      await recordPayment(
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          provider: "razorpay",
          event: input.status === "failed" ? "refund_failed" : "refunded",
          amountPaise: input.amountPaise,
          providerOrderId: order.payment.providerOrderId,
          providerPaymentId: order.payment.providerPaymentId,
          providerRefundId: input.providerRefundId,
          method: null,
          last4: null,
          upiVpa: null,
          signatureVerified: input.source === "webhook",
          source: input.source,
          webhookEventId: null,
          raw: null,
          note: input.reason,
        },
        dbSession,
      );

      result = { ok: true, orderStatus: order.status };
    });
  } finally {
    await dbSession.endSession();
  }
  return result;
}

// ── helpers ────────────────────────────────────────────────────────────

async function findOrder(
  by: { orderNumber?: string; providerOrderId?: string },
  session?: ClientSession,
) {
  const filter = by.orderNumber
    ? { orderNumber: by.orderNumber }
    : by.providerOrderId
      ? { "payment.providerOrderId": by.providerOrderId }
      : null;
  if (!filter) return null;
  const q = Order.findOne(filter);
  if (session) q.session(session);
  return q.exec();
}

/** Keep only non-sensitive keys from a provider payload for the log. */
function redact(
  raw: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!raw) return null;
  const allow = [
    "id",
    "entity",
    "amount",
    "currency",
    "status",
    "method",
    "order_id",
    "invoice_id",
    "international",
    "captured",
    "created_at",
    "error_code",
    "error_description",
    "vpa",
  ];
  const out: Record<string, unknown> = {};
  for (const k of allow) if (k in raw) out[k] = raw[k];
  return out;
}
