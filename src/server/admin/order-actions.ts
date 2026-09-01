import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { Order, recordAudit, type OrderDoc } from "@/server/models";
import {
  canTransition,
  transitionOrder,
  cancelUnpaidOrder,
  recordRefund,
  createRazorpayRefund,
} from "@/server/payments";
import { notifyOrderStatus } from "@/server/email";
import type { AuthContext } from "@/server/auth/session";
import { assertSudo } from "@/server/auth/admin";
import type { OrderStatus } from "@/lib/validation/commerce";

/**
 * Admin order mutations. Every one records an audit row; the two dangerous ones
 * (`refundOrder`, `cancelOrderByAdmin`) call `assertSudo` first — the route
 * turns the resulting `SudoRequiredError` into a `409` and the client pops the
 * `<SudoGate>`.
 */

export type ActionResult =
  | { ok: true; orderNumber: string; message?: string }
  | { ok: false; error: string };

interface ActorMeta {
  actorId: string;
  actorRole: string;
  ip: string | null;
  userAgent: string | null;
}

function metaFrom(ctx: AuthContext, ip: string | null, ua: string | null): ActorMeta {
  return { actorId: ctx.user.id, actorRole: ctx.user.role, ip, userAgent: ua };
}

// ── advance status / fulfil ────────────────────────────────────────────

export interface AdvanceStatusInput {
  to: OrderStatus;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  eta?: string | null;
}

export async function advanceOrderStatus(
  orderNumber: string,
  input: AdvanceStatusInput,
  ctx: AuthContext,
  req: { ip: string | null; userAgent: string | null },
): Promise<ActionResult> {
  await dbConnect();
  const meta = metaFrom(ctx, req.ip, req.userAgent);

  const order = await Order.findOne({ orderNumber });
  if (!order) return { ok: false, error: "not-found" };

  const from = order.status;
  if (from === input.to) return { ok: false, error: "no-op" };
  if (!canTransition(from, input.to)) {
    return { ok: false, error: "illegal-transition" };
  }

  transitionOrder(order, input.to, {
    actor: "staff",
    actorId: new Types.ObjectId(meta.actorId),
    note:
      input.to === "shipped" && input.carrier
        ? `Shipped via ${input.carrier}${input.trackingNumber ? ` — ${input.trackingNumber}` : ""}`
        : undefined,
  });

  if (input.to === "shipped") {
    order.fulfilment.carrier = input.carrier?.trim() || null;
    order.fulfilment.trackingNumber = input.trackingNumber?.trim() || null;
    order.fulfilment.trackingUrl = input.trackingUrl?.trim() || null;
    order.fulfilment.shippedAt = new Date();
  }
  if (input.to === "delivered") {
    order.fulfilment.deliveredAt = new Date();
  }

  await order.save();

  await recordAudit({
    actorId: new Types.ObjectId(meta.actorId),
    actorRole: meta.actorRole,
    action: "order.status_change",
    targetType: "Order",
    targetId: orderNumber,
    before: { status: from },
    after: {
      status: input.to,
      carrier: order.fulfilment.carrier,
      trackingNumber: order.fulfilment.trackingNumber,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  if (input.to === "shipped") {
    await notifyOrderStatus(orderNumber, "shipped", {
      carrier: order.fulfilment.carrier,
      trackingNumber: order.fulfilment.trackingNumber,
      trackingUrl: order.fulfilment.trackingUrl,
      eta: input.eta?.trim() || null,
    });
  } else if (input.to === "delivered") {
    await notifyOrderStatus(orderNumber, "delivered");
  }

  return { ok: true, orderNumber };
}

// ── internal note ──────────────────────────────────────────────────────

export async function addInternalNote(
  orderNumber: string,
  text: string,
  ctx: AuthContext,
  req: { ip: string | null; userAgent: string | null },
): Promise<ActionResult> {
  await dbConnect();
  const meta = metaFrom(ctx, req.ip, req.userAgent);

  const res = await Order.updateOne(
    { orderNumber },
    {
      $push: {
        internalNotes: {
          at: new Date(),
          actorId: new Types.ObjectId(meta.actorId),
          text: text.trim(),
        },
      },
    },
  );
  if (res.matchedCount === 0) return { ok: false, error: "not-found" };

  await recordAudit({
    actorId: new Types.ObjectId(meta.actorId),
    actorRole: meta.actorRole,
    action: "order.note_added",
    targetType: "Order",
    targetId: orderNumber,
    after: { text: text.trim().slice(0, 240) },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return { ok: true, orderNumber };
}

// ── refund (sudo) ──────────────────────────────────────────────────────

export interface RefundOrderInput {
  amountPaise?: number;
  reason: string;
}

export async function refundOrder(
  orderNumber: string,
  input: RefundOrderInput,
  ctx: AuthContext,
  req: { ip: string | null; userAgent: string | null },
): Promise<ActionResult> {
  assertSudo(ctx);
  await dbConnect();
  const meta = metaFrom(ctx, req.ip, req.userAgent);

  const order = await Order.findOne({ orderNumber }).lean<OrderDoc | null>();
  if (!order) return { ok: false, error: "not-found" };

  if (order.payment.method !== "razorpay") {
    return { ok: false, error: "not-refundable-cod" };
  }
  if (!["paid", "partially_refunded"].includes(order.payment.status)) {
    return { ok: false, error: "not-refundable-status" };
  }
  if (!order.payment.providerPaymentId) {
    return { ok: false, error: "no-payment-id" };
  }

  const remaining =
    order.pricing.grandTotalPaise - order.payment.refundedPaise;
  const amount = input.amountPaise ?? remaining;
  if (amount <= 0 || amount > remaining) {
    return { ok: false, error: "amount-out-of-range" };
  }

  let providerRefundId: string | null = null;
  let providerStatus = "created";
  try {
    const rzp = await createRazorpayRefund(
      order.payment.providerPaymentId,
      amount,
      { reason: input.reason.slice(0, 250), ref: orderNumber },
    );
    providerRefundId = rzp.id;
    providerStatus = rzp.status;
  } catch (err) {
    console.error("[admin] refund API call failed", { orderNumber, err });
    return { ok: false, error: "provider-error" };
  }

  await recordRefund({
    orderNumber,
    amountPaise: amount,
    providerRefundId,
    status: providerStatus === "processed" ? "processed" : "created",
    reason: input.reason,
    actorId: meta.actorId,
    source: "admin",
    via: "razorpay",
    restock: false,
  });

  await recordAudit({
    actorId: new Types.ObjectId(meta.actorId),
    actorRole: meta.actorRole,
    action: "order.refund",
    targetType: "Order",
    targetId: orderNumber,
    after: {
      amountPaise: amount,
      reason: input.reason,
      providerRefundId,
      providerStatus,
    },
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return {
    ok: true,
    orderNumber,
    message:
      providerStatus === "processed"
        ? "Refund processed."
        : "Refund initiated — Razorpay will confirm shortly.",
  };
}

// ── cancel (sudo, COD only) ────────────────────────────────────────────

export async function cancelOrderByAdmin(
  orderNumber: string,
  reason: string,
  ctx: AuthContext,
  req: { ip: string | null; userAgent: string | null },
): Promise<ActionResult> {
  assertSudo(ctx);
  await dbConnect();

  const order = await Order.findOne({ orderNumber })
    .select("_id status payment.method payment.status")
    .lean<Pick<OrderDoc, "_id" | "status" | "payment"> | null>();
  if (!order) return { ok: false, error: "not-found" };

  if (order.payment.method !== "cod" || order.payment.status === "paid") {
    return { ok: false, error: "use-refund" };
  }
  if (!["pending", "confirmed", "processing"].includes(order.status)) {
    return { ok: false, error: "not-cancellable" };
  }

  const res = await cancelUnpaidOrder(order._id, {
    reason,
    source: "admin",
    actorId: ctx.user.id,
    allowStatuses: ["pending", "confirmed", "processing"],
  });
  if (!res.ok) return { ok: false, error: "cancel-failed" };

  await recordAudit({
    actorId: new Types.ObjectId(ctx.user.id),
    actorRole: ctx.user.role,
    action: "order.cancel_admin",
    targetType: "Order",
    targetId: orderNumber,
    after: { reason },
    ip: req.ip,
    userAgent: req.userAgent,
  });

  return { ok: true, orderNumber, message: "Order cancelled, stock restored." };
}
