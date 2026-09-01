import { Schema, model, models, type Model, type Types } from "mongoose";

import type { OrderPricing } from "./order";

/**
 * A pre-payment checkout snapshot — **payment-first checkout**.
 *
 * `POST /api/checkout/place` validates the bag (items, address, coupon, credit,
 * pricing) and mints a Razorpay order, but creates **no** `Order` and moves
 * **no** stock. It writes one of these instead: the exact, server-computed
 * snapshot of what the customer agreed to pay. When Razorpay confirms the
 * payment (callback or webhook), `finalizeOnlineCheckout` turns this into a real
 * `Order`. A failed or abandoned payment leaves the intent to TTL-expire — there
 * is nothing to clean up.
 *
 * Never appears in order history. Never holds stock. All money is integer paise.
 */

export const CHECKOUT_INTENT_STATUSES = [
  "pending",
  "consumed",
  "failed",
] as const;

export interface CheckoutIntentDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  status: (typeof CHECKOUT_INTENT_STATUSES)[number];
  /** the Razorpay order id this intent is bound to (unique) */
  razorpayOrderId: string;
  /** == pricing.grandTotalPaise — the locked charge, guarded at finalize */
  amountPaise: number;
  /** snapshot: shaped exactly like `Order.items` */
  items: {
    productId: Types.ObjectId;
    slug: string;
    name: string;
    sku: string;
    image: string | null;
    qty: number;
    unitPricePaise: number;
    mrpPaise: number;
    lineTotalPaise: number;
    hsnCode: string;
  }[];
  pricing: OrderPricing;
  coupon: { code: string; type: string; valuePaise: number } | null;
  creditAppliedPaise: number;
  contact: { name: string; phone: string; email: string };
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  customerNote?: string;
  /** set when status → "consumed" */
  orderNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const checkoutIntentSchema = new Schema<CheckoutIntentDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: CHECKOUT_INTENT_STATUSES,
      default: "pending",
    },
    razorpayOrderId: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 0 },
    items: { type: Schema.Types.Mixed, required: true },
    pricing: { type: Schema.Types.Mixed, required: true },
    coupon: { type: Schema.Types.Mixed, default: null },
    creditAppliedPaise: { type: Number, default: 0 },
    contact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    shippingAddress: { type: Schema.Types.Mixed, required: true },
    billingAddress: { type: Schema.Types.Mixed, required: true },
    customerNote: String,
    orderNumber: { type: String, default: null },
  },
  { timestamps: true, minimize: false },
);

// One intent per Razorpay order.
checkoutIntentSchema.index(
  { razorpayOrderId: 1 },
  { name: "intent_rzp_order_unique", unique: true },
);
checkoutIntentSchema.index(
  { userId: 1, createdAt: -1 },
  { name: "intent_user_created" },
);
// Housekeeping — 24h is long enough that a late webhook still finds the intent;
// a consumed one is disposable (the Order is the record).
checkoutIntentSchema.index(
  { createdAt: 1 },
  { name: "intent_ttl", expireAfterSeconds: 86_400 },
);

export const CheckoutIntent: Model<CheckoutIntentDoc> =
  (models.CheckoutIntent as Model<CheckoutIntentDoc>) ??
  model<CheckoutIntentDoc>("CheckoutIntent", checkoutIntentSchema);
