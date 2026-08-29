import "server-only";

import { dbConnect } from "@/server/db";
import { Order, recordPayment, type OrderDoc } from "@/server/models";
import { isRazorpayConfigured, getRazorpayEnv } from "@/server/env";
import { createRazorpayOrder } from "./razorpay";

/**
 * Bridge between a placed (pending) order and Razorpay's hosted checkout.
 * `ensureRazorpayOrder` is idempotent — a retried place-order call, or a
 * customer reopening the drawer, reuses the same Razorpay order id.
 */

export type CheckoutPayment =
  | { kind: "cod" }
  | {
      kind: "razorpay";
      razorpayOrderId: string;
      keyId: string;
      amountPaise: number;
      prefill: { name: string; email: string; contact: string };
    }
  | { kind: "razorpay-dev"; amountPaise: number };

export async function buildCheckoutPayment(
  orderNumber: string,
): Promise<CheckoutPayment | null> {
  await dbConnect();
  const order = await Order.findOne({ orderNumber });
  if (!order) return null;

  if (order.payment.method === "cod") return { kind: "cod" };

  const amountPaise = order.pricing.grandTotalPaise;

  if (!isRazorpayConfigured()) {
    return { kind: "razorpay-dev", amountPaise };
  }

  const { keyId } = getRazorpayEnv();
  const razorpayOrderId = await ensureRazorpayOrder(order);

  return {
    kind: "razorpay",
    razorpayOrderId,
    keyId,
    amountPaise,
    prefill: {
      name: order.contact.name,
      email: order.contact.email,
      contact: order.contact.phone,
    },
  };
}

async function ensureRazorpayOrder(order: OrderDoc & { save: () => Promise<unknown> }): Promise<string> {
  if (order.payment.providerOrderId) return order.payment.providerOrderId;

  const rzp = await createRazorpayOrder({
    amountPaise: order.pricing.grandTotalPaise,
    receipt: order.orderNumber,
    notes: {
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      userId: String(order.userId),
    },
  });

  order.payment.providerOrderId = rzp.id;
  await order.save();

  await recordPayment({
    orderId: order._id,
    orderNumber: order.orderNumber,
    provider: "razorpay",
    event: "order_created",
    amountPaise: order.pricing.grandTotalPaise,
    providerOrderId: rzp.id,
    providerPaymentId: null,
    providerRefundId: null,
    method: null,
    last4: null,
    upiVpa: null,
    signatureVerified: false,
    source: "server",
    webhookEventId: null,
    raw: { id: rzp.id, amount: rzp.amount, status: rzp.status },
    note: null,
  });

  return rzp.id;
}
