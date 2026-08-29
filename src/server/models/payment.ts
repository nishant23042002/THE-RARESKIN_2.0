import { Schema, model, models, type Model, type Types } from "mongoose";

import {
  PAYMENT_EVENTS,
  PAYMENT_EVENT_SOURCES,
} from "@/lib/validation/commerce";

/**
 * Immutable payment audit log — one row per event, separate from the order so
 * the money trail is append-only even if the order is edited. Never stores a
 * PAN: only `providerPaymentId`, method, `last4` / UPI handle.
 *
 * "The webhook is the truth." Every state change to an order's payment lands
 * here with the source that caused it (`webhook`, `checkout-callback`, `cron`,
 * `admin`, `dev-simulate`).
 */
export interface PaymentDoc {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  orderNumber: string;
  provider: "razorpay" | "cod" | "manual";
  event: (typeof PAYMENT_EVENTS)[number];
  amountPaise: number;
  currency: "INR";
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  method: string | null; // "upi" | "card" | "netbanking" | "wallet" | "cod"
  last4: string | null;
  upiVpa: string | null;
  signatureVerified: boolean;
  source: (typeof PAYMENT_EVENT_SOURCES)[number];
  /** provider event id, when the row came from a webhook — for cross-ref */
  webhookEventId: string | null;
  /** redacted provider payload snapshot */
  raw: Record<string, unknown> | null;
  note: string | null;
  at: Date;
}

const paymentSchema = new Schema<PaymentDoc>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    provider: {
      type: String,
      enum: ["razorpay", "cod", "manual"],
      required: true,
    },
    event: { type: String, enum: PAYMENT_EVENTS, required: true },
    amountPaise: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    providerOrderId: { type: String, default: null },
    providerPaymentId: { type: String, default: null },
    providerRefundId: { type: String, default: null },
    method: { type: String, default: null },
    last4: { type: String, default: null },
    upiVpa: { type: String, default: null },
    signatureVerified: { type: Boolean, default: false },
    source: { type: String, enum: PAYMENT_EVENT_SOURCES, required: true },
    webhookEventId: { type: String, default: null },
    raw: { type: Schema.Types.Mixed, default: null },
    note: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);

paymentSchema.index({ orderId: 1, at: -1 }, { name: "order_at" });
paymentSchema.index(
  { providerPaymentId: 1 },
  {
    name: "provider_payment",
    partialFilterExpression: { providerPaymentId: { $type: "string" } },
  },
);
paymentSchema.index({ at: -1 }, { name: "at_desc" });

paymentSchema.pre(
  /^(update|delete|findOneAndUpdate|findOneAndDelete|findOneAndReplace|replaceOne)$/i,
  function () {
    throw new Error("payment log is append-only");
  },
);

export const Payment: Model<PaymentDoc> =
  (models.Payment as Model<PaymentDoc>) ??
  model<PaymentDoc>("Payment", paymentSchema);

/** Append-only writer. */
export async function recordPayment(
  entry: Omit<PaymentDoc, "_id" | "at" | "currency"> & {
    currency?: "INR";
    at?: Date;
  },
  session?: import("mongoose").ClientSession,
): Promise<void> {
  await Payment.create(
    [{ ...entry, currency: entry.currency ?? "INR", at: entry.at ?? new Date() }],
    session ? { session } : undefined,
  );
}
