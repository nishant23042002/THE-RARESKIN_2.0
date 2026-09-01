import "server-only";

import mongoose from "mongoose";

import { dbConnect } from "@/server/db";
import {
  Cart,
  CheckoutIntent,
  Coupon,
  Order,
  Product,
  nextSequence,
  recordAudit,
  recordPayment,
  type CheckoutIntentDoc,
  type OrderDoc,
} from "@/server/models";
import {
  commitStockForOrder,
  restoreStockForOrder,
  type StockLine,
} from "@/server/commerce/inventory";
import {
  grantStoreCredit,
  refundStoreCreditForOrder,
  spendStoreCredit,
} from "@/server/commerce/store-credit";
import {
  notifyOrderCancelled,
  notifyOrderConfirmed,
  notifyRefundProcessed,
} from "@/server/email";
import { DISCOVERY_SET_SLUG } from "@/lib/catalog";
import type {
  OrderStatus,
  PAYMENT_EVENT_SOURCES,
} from "@/lib/validation/commerce";

import { createRazorpayRefund } from "./razorpay";

type Source = (typeof PAYMENT_EVENT_SOURCES)[number];

/**
 * Order state machine + the payment processors. **Payment-first checkout**: an
 * online order is created only once Razorpay verifies the payment
 * (`finalizeOnlineCheckout` — driven by the callback and the webhook, both
 * idempotent). `cancelUnpaidOrder` and `recordRefund` stay idempotent too — a
 * retried webhook or a cron sweep hitting an already-handled order is a no-op.
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

/** The statuses an order in `from` can move to next (excludes `from` itself). */
export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from] ?? [];
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

// ── finalize an online checkout once Razorpay confirms payment ─────────

export interface FinalizeInput {
  /** the Razorpay order id — binds to exactly one CheckoutIntent */
  providerOrderId: string;
  providerPaymentId: string;
  signature?: string | null;
  /** captured amount from Razorpay, guarded against the locked intent total */
  amountPaise?: number | null;
  instrument?: string | null;
  last4?: string | null;
  upiVpa?: string | null;
  source: Source;
  webhookEventId?: string | null;
  raw?: Record<string, unknown> | null;
}

export type FinalizeResult =
  | { ok: true; orderNumber: string; reused: boolean }
  | {
      ok: false;
      reason: "intent-not-found" | "amount-mismatch" | "sold-out-refunded";
    };

/**
 * Turn a paid `CheckoutIntent` into a real, confirmed order. Idempotent — the
 * checkout callback and the webhook both call this and converge on one order
 * (`idempotencyKey` = the Razorpay order id). A capture that can't be honoured
 * (item sold out, or a stale / tampered amount) is **auto-refunded in full** and
 * no order is created.
 */
export async function finalizeOnlineCheckout(
  input: FinalizeInput,
): Promise<FinalizeResult> {
  await dbConnect();

  // Already turned into an order (callback + webhook race, or a plain retry).
  const existing = await Order.findOne({
    "payment.providerOrderId": input.providerOrderId,
  })
    .select("orderNumber")
    .lean<{ orderNumber: string } | null>();
  if (existing) {
    return { ok: true, orderNumber: existing.orderNumber, reused: true };
  }

  const intent = await CheckoutIntent.findOne({
    razorpayOrderId: input.providerOrderId,
  });
  if (!intent) return { ok: false, reason: "intent-not-found" };
  if (intent.status === "consumed" && intent.orderNumber) {
    return { ok: true, orderNumber: intent.orderNumber, reused: true };
  }

  const capturedPaise = input.amountPaise ?? intent.amountPaise;

  // The charge was locked when we minted the Razorpay order — a different
  // captured amount means a stale window or tampering. Refund, create nothing.
  if (input.amountPaise != null && input.amountPaise !== intent.amountPaise) {
    await autoRefund(input.providerPaymentId, capturedPaise, {
      targetType: "CheckoutIntent",
      targetId: String(intent._id),
      reason: "amount-mismatch",
    });
    return { ok: false, reason: "amount-mismatch" };
  }

  // Plain-object snapshot for `Order.create` (the doc stays hydrated so we can
  // flip `intent.status` on it inside the txn).
  const snap = intent.toObject();

  const year = new Date().getFullYear();
  const dbSession = await mongoose.startSession();
  let out: FinalizeResult | undefined;
  let oversoldSku: string | null = null;

  try {
    await dbSession.withTransaction(async () => {
      // Re-check under the txn (withTransaction may retry; the other finaliser
      // may have committed in between).
      const dup = await Order.findOne({
        userId: intent.userId,
        idempotencyKey: input.providerOrderId,
      })
        .select("orderNumber")
        .session(dbSession);
      if (dup) {
        out = { ok: true, orderNumber: dup.orderNumber, reused: true };
        return;
      }

      const seq = await nextSequence(`order-${year}`);
      const orderNumber = `RRS-${year}-${String(seq).padStart(6, "0")}`;

      let orderDoc!: mongoose.HydratedDocument<OrderDoc>;
      try {
        const [doc] = await Order.create(
          [
            {
              orderNumber,
              userId: snap.userId,
              contact: snap.contact,
              items: snap.items,
              pricing: snap.pricing,
              coupon: snap.coupon,
              shippingAddress: snap.shippingAddress,
              billingAddress: snap.billingAddress,
              status: "confirmed",
              payment: {
                method: "razorpay",
                status: "paid",
                provider: "razorpay",
                providerOrderId: input.providerOrderId,
                providerPaymentId: input.providerPaymentId,
                signature: input.signature ?? null,
                instrument: input.instrument ?? null,
                capturedAt: new Date(),
                last4: input.last4 ?? null,
                upiVpa: input.upiVpa ?? null,
              },
              invoice: {
                number: null,
                hsn: snap.items[0]?.hsnCode ?? "33030090",
                url: null,
                generatedAt: null,
              },
              paymentDueBy: null,
              timeline: [
                {
                  at: new Date(),
                  status: "pending",
                  actor: "customer",
                  actorId: intent.userId,
                  note: "Order placed.",
                },
                {
                  at: new Date(),
                  status: "confirmed",
                  actor: "system",
                  actorId: null,
                  note:
                    input.source === "webhook"
                      ? "Payment captured — confirmed by Razorpay webhook."
                      : "Payment received.",
                },
              ],
              customerNote: snap.customerNote,
              idempotencyKey: input.providerOrderId,
              source: "web",
            },
          ],
          { session: dbSession },
        );
        orderDoc = doc;
      } catch (e) {
        if ((e as { code?: number }).code === 11000) {
          const found = await Order.findOne({
            userId: intent.userId,
            idempotencyKey: input.providerOrderId,
          })
            .select("orderNumber")
            .session(dbSession);
          out = found
            ? { ok: true, orderNumber: found.orderNumber, reused: true }
            : { ok: false, reason: "intent-not-found" };
          return;
        }
        throw e;
      }

      // Stock — guarded. If it can't be honoured the customer has already paid,
      // so we abort (create nothing) and refund in the catch below.
      const stockLines = await stockLinesForItems(snap.items, dbSession);
      const stock = await commitStockForOrder(
        stockLines,
        orderDoc._id,
        dbSession,
      );
      if (!stock.ok) {
        oversoldSku = stock.failedSku;
        const err = new Error(`SOLD_OUT:${stock.failedSku}`);
        err.name = "SoldOutError";
        throw err;
      }

      // Store credit — best effort. The payment already covered the charge, so
      // a balance that shrank under us is logged, not fatal.
      if (intent.creditAppliedPaise > 0) {
        const spent = await spendStoreCredit(
          intent.userId,
          intent.creditAppliedPaise,
          orderDoc._id,
          dbSession,
        );
        if (spent < intent.creditAppliedPaise) {
          console.error("[finalize] store credit short", {
            orderNumber,
            want: intent.creditAppliedPaise,
            got: spent,
          });
        }
      }

      // Coupon — unconditional bump (they paid the discounted price).
      if (intent.coupon?.code) {
        await Coupon.updateOne(
          { code: intent.coupon.code },
          { $inc: { usedCount: 1 } },
          { session: dbSession },
        );
      }

      // Discovery-Set credit — idempotent per order + reason.
      for (const item of orderDoc.items) {
        if (item.slug !== DISCOVERY_SET_SLUG) continue;
        const product = await Product.findById(item.productId)
          .select("credit")
          .session(dbSession)
          .lean<{ credit?: { amount?: number; expiryDays?: number | null } }>();
        const amount = product?.credit?.amount ?? 0;
        if (amount > 0) {
          await grantStoreCredit(
            {
              userId: orderDoc.userId,
              amountPaise: amount,
              reason: "discovery_set_purchase",
              sourceOrderId: orderDoc._id,
              expiresAt: product?.credit?.expiryDays
                ? new Date(Date.now() + product.credit.expiryDays * 86_400_000)
                : null,
              note: "Discovery Set — credit toward a full-size bottle",
            },
            dbSession,
          );
        }
      }

      await Cart.updateOne(
        { userId: intent.userId },
        { $set: { items: [], appliedCoupon: null, appliedCredit: false } },
        { session: dbSession },
      );

      intent.status = "consumed";
      intent.orderNumber = orderNumber;
      await intent.save({ session: dbSession });

      await recordPayment(
        {
          orderId: orderDoc._id,
          orderNumber,
          provider: "razorpay",
          event: "captured",
          amountPaise: orderDoc.pricing.grandTotalPaise,
          providerOrderId: input.providerOrderId,
          providerPaymentId: input.providerPaymentId,
          providerRefundId: null,
          method: input.instrument ?? null,
          last4: input.last4 ?? null,
          upiVpa: input.upiVpa ?? null,
          signatureVerified:
            Boolean(input.signature) || input.source === "webhook",
          source: input.source,
          webhookEventId: input.webhookEventId ?? null,
          raw: redact(input.raw),
          note: null,
        },
        dbSession,
      );

      out = { ok: true, orderNumber, reused: false };
    });
  } catch (err) {
    const e = err as Error;
    if (e.name === "SoldOutError") {
      // The customer paid for something we can't ship — refund in full.
      await autoRefund(input.providerPaymentId, capturedPaise, {
        targetType: "CheckoutIntent",
        targetId: String(intent._id),
        reason: "sold-out",
      });
      await CheckoutIntent.updateOne(
        { _id: intent._id, status: "pending" },
        { $set: { status: "failed" } },
      );
      await recordAudit({
        actorId: null,
        actorRole: "system",
        action: "order.oversold_refunded",
        targetType: "CheckoutIntent",
        targetId: String(intent._id),
        after: {
          sku: oversoldSku,
          providerPaymentId: input.providerPaymentId,
          amountPaise: capturedPaise,
        },
        ip: null,
        userAgent: null,
      });
      return { ok: false, reason: "sold-out-refunded" };
    }
    throw err;
  } finally {
    await dbSession.endSession();
  }

  const result: FinalizeResult = out ?? {
    ok: false,
    reason: "intent-not-found",
  };
  if (result.ok && !result.reused) {
    await recordAudit({
      actorId: null,
      actorRole: "system",
      action: "order.placed",
      targetType: "Order",
      targetId: result.orderNumber,
      after: {
        source: input.source,
        paymentId: input.providerPaymentId,
        via: "payment-first",
      },
      ip: null,
      userAgent: null,
    });
    await notifyOrderConfirmed(result.orderNumber);
    // The invoice PDF is generated on demand — see `src/server/invoice/` and
    // `GET /api/account/orders/[orderNumber]/invoice` (linked from the email).
  }
  return result;
}

/** Flag an intent whose payment attempt failed (analytics only — no order). */
export async function markIntentFailed(
  razorpayOrderId: string,
  reason: string,
): Promise<void> {
  await dbConnect();
  const res = await CheckoutIntent.updateOne(
    { razorpayOrderId, status: "pending" },
    { $set: { status: "failed" } },
  );
  if (res.modifiedCount > 0) {
    console.info("[checkout] payment attempt failed", { razorpayOrderId, reason });
  }
}

/** Resolve `{ trackInventory, allowBackorder }` for each ordered line. */
async function stockLinesForItems(
  items: CheckoutIntentDoc["items"],
  session: mongoose.ClientSession,
): Promise<StockLine[]> {
  const skus = items.map((i) => i.sku);
  const docs = await Product.find({ "inventory.sku": { $in: skus } })
    .select("inventory.sku inventory.trackInventory inventory.allowBackorder")
    .session(session)
    .lean<
      {
        inventory: {
          sku: string;
          trackInventory: boolean;
          allowBackorder: boolean;
        };
      }[]
    >();
  const bySku = new Map(docs.map((d) => [d.inventory.sku, d.inventory]));
  return items.map((i) => {
    const inv = bySku.get(i.sku);
    return {
      productId: i.productId,
      sku: i.sku,
      qty: i.qty,
      trackInventory: inv?.trackInventory ?? true,
      allowBackorder: inv?.allowBackorder ?? false,
    };
  });
}

/**
 * Refund a captured payment we can't turn into a fulfilled order. Never throws —
 * a failed refund is logged loudly (orphan payment → manual action) and the
 * audit trail lets a human retry.
 */
async function autoRefund(
  paymentId: string,
  amountPaise: number,
  meta: { targetType: string; targetId: string; reason: string },
): Promise<void> {
  try {
    const rzp = await createRazorpayRefund(paymentId, amountPaise, {
      reason: meta.reason,
      ref: meta.targetId,
    });
    await recordAudit({
      actorId: null,
      actorRole: "system",
      action: "payment.auto_refund",
      targetType: meta.targetType,
      targetId: meta.targetId,
      after: { reason: meta.reason, paymentId, refundId: rzp.id, amountPaise },
      ip: null,
      userAgent: null,
    });
  } catch (err) {
    console.error(
      "[payments] AUTO-REFUND FAILED — orphan payment, needs manual action",
      { paymentId, amountPaise, reason: meta.reason, ref: meta.targetId, err },
    );
  }
}

// ── cancel an unpaid order (auto-cancel job / customer / admin) ─────────

export async function cancelUnpaidOrder(
  orderId: mongoose.Types.ObjectId | string,
  opts: {
    reason: string;
    source: Source;
    actorId?: string | null;
    /** which order statuses this cancel may act on — default `["pending"]` (the
     *  auto-cancel / customer path). An admin COD cancel widens it. */
    allowStatuses?: OrderStatus[];
  },
): Promise<{ ok: boolean; orderNumber?: string }> {
  await dbConnect();
  const allow = opts.allowStatuses ?? ["pending"];
  const dbSession = await mongoose.startSession();
  let result: { ok: boolean; orderNumber?: string } = { ok: false };

  try {
    await dbSession.withTransaction(async () => {
      const order = await Order.findById(orderId).session(dbSession);
      if (!order) return;
      if (!allow.includes(order.status) || order.payment.status === "paid") {
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
    // Phase F — "your order was cancelled" (nothing charged).
    if (result.orderNumber) {
      await notifyOrderCancelled(result.orderNumber, opts.reason);
    }
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
  // hoisted for the post-commit email — only set on a *new* processed refund
  let emailPayload:
    | { orderNumber: string; refundIndex: number; fullRefund: boolean }
    | undefined;

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
      const refundIndex = order.refunds.length - 1;

      if (input.status === "processed") {
        order.payment.refundedPaise += input.amountPaise;
        const full =
          order.payment.refundedPaise >= order.pricing.grandTotalPaise;
        order.payment.status = full ? "refunded" : "partially_refunded";
        emailPayload = {
          orderNumber: order.orderNumber,
          refundIndex,
          fullRefund: full,
        };
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

  // Phase F — "your refund is on its way", once per refund.
  const refundEmail = emailPayload;
  if (result.ok && refundEmail) {
    await notifyRefundProcessed({
      orderNumber: refundEmail.orderNumber,
      providerRefundId: input.providerRefundId,
      refundIndex: refundEmail.refundIndex,
      amountPaise: input.amountPaise,
      reason: input.reason,
      fullRefund: refundEmail.fullRefund,
    });
  }

  return result;
}

// ── helpers ────────────────────────────────────────────────────────────

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
