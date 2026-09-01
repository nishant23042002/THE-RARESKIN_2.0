import { Schema, model, models, type Model, type Types } from "mongoose";

import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/validation/commerce";

/**
 * An order. Everything that could change in the catalogue — price, name, image,
 * address — is **snapshotted** onto the document at purchase time, so order
 * history never mutates when a product is edited later. All money is integer
 * paise.
 *
 * Phase D creates the order in `pending` with `payment.status: "pending"`; the
 * payment integration (Phase E) drives it forward via the verified webhook.
 */

interface AddressSnapshotSub {
  label?: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  /** two-digit GST state code resolved from the PIN */
  stateCode: string;
  pincode: string;
}

const addressSnapshotSchema = new Schema<AddressSnapshotSub>(
  {
    label: String,
    name: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: String,
    landmark: String,
    city: { type: String, required: true },
    state: { type: String, required: true },
    stateCode: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false },
);

interface OrderItemSub {
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
}

const orderItemSchema = new Schema<OrderItemSub>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, default: null },
    qty: { type: Number, required: true, min: 1 },
    unitPricePaise: { type: Number, required: true, min: 0 },
    mrpPaise: { type: Number, required: true, min: 0 },
    lineTotalPaise: { type: Number, required: true, min: 0 },
    hsnCode: { type: String, default: "33030090" },
  },
  { _id: false },
);

export interface OrderTimelineSub {
  at: Date;
  status: (typeof ORDER_STATUSES)[number];
  actorId: Types.ObjectId | null;
  actor: "customer" | "system" | "staff";
  note?: string;
}

interface CouponSnapshotSub {
  code: string;
  type: string;
  valuePaise: number;
}

const couponSnapshotSchema = new Schema<CouponSnapshotSub>(
  {
    code: { type: String, required: true },
    type: { type: String, required: true },
    valuePaise: { type: Number, default: 0 },
  },
  { _id: false },
);

const timelineSchema = new Schema<OrderTimelineSub>(
  {
    at: { type: Date, default: Date.now },
    status: { type: String, enum: ORDER_STATUSES, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actor: {
      type: String,
      enum: ["customer", "system", "staff"],
      default: "system",
    },
    note: String,
  },
  { _id: false },
);

export interface OrderPricing {
  itemsSubtotalPaise: number;
  discountPaise: number;
  creditAppliedPaise: number;
  shippingPaise: number;
  codFeePaise: number;
  /** taxable value = grand total ÷ (1 + rate) for tax-inclusive pricing */
  taxableValuePaise: number;
  gst: {
    ratePercent: number;
    cgstPaise: number;
    sgstPaise: number;
    igstPaise: number;
    totalPaise: number;
  };
  grandTotalPaise: number;
  currency: "INR";
}

export interface OrderDoc {
  _id: Types.ObjectId;
  orderNumber: string;
  userId: Types.ObjectId;
  contact: { name: string; phone: string; email: string };
  items: OrderItemSub[];
  pricing: OrderPricing;
  coupon: { code: string; type: string; valuePaise: number } | null;
  shippingAddress: AddressSnapshotSub;
  billingAddress: AddressSnapshotSub;
  status: (typeof ORDER_STATUSES)[number];
  payment: {
    method: (typeof PAYMENT_METHODS)[number];
    status: (typeof PAYMENT_STATUSES)[number];
    provider: string | null;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    /** the verified checkout-callback signature, kept for audit */
    signature: string | null;
    /** payment instrument, e.g. "upi" | "card" | "netbanking" | "wallet" */
    instrument: string | null;
    capturedAt: Date | null;
    last4: string | null;
    upiVpa: string | null;
    refundedPaise: number;
  };
  /** legacy — COD orders leave this null; online orders are born paid */
  paymentDueBy: Date | null;
  fulfilment: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: Date | null;
    deliveredAt: Date | null;
  };
  invoice: { number: string | null; hsn: string; url: string | null; generatedAt: Date | null };
  refunds: {
    amountPaise: number;
    reason: string;
    providerRefundId: string | null;
    status: string;
    actorId: Types.ObjectId | null;
    via: string;
    createdAt: Date;
  }[];
  timeline: OrderTimelineSub[];
  customerNote?: string;
  internalNotes: { at: Date; actorId: Types.ObjectId; text: string }[];
  /** the client UUID that produced this order — dedupes double-submits */
  idempotencyKey: string;
  source: "web";
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<OrderDoc>(
  {
    orderNumber: {
      type: String,
      required: true,
      index: { unique: true, name: "orderNumber_unique" },
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    contact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    items: { type: [orderItemSchema], required: true },
    pricing: {
      itemsSubtotalPaise: { type: Number, required: true },
      discountPaise: { type: Number, default: 0 },
      creditAppliedPaise: { type: Number, default: 0 },
      shippingPaise: { type: Number, default: 0 },
      codFeePaise: { type: Number, default: 0 },
      taxableValuePaise: { type: Number, required: true },
      gst: {
        ratePercent: { type: Number, required: true },
        cgstPaise: { type: Number, default: 0 },
        sgstPaise: { type: Number, default: 0 },
        igstPaise: { type: Number, default: 0 },
        totalPaise: { type: Number, required: true },
      },
      grandTotalPaise: { type: Number, required: true },
      currency: { type: String, enum: ["INR"], default: "INR" },
    },
    coupon: { type: couponSnapshotSchema, default: null },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    billingAddress: { type: addressSnapshotSchema, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "pending" },
    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      status: { type: String, enum: PAYMENT_STATUSES, default: "pending" },
      provider: { type: String, default: null },
      providerOrderId: { type: String, default: null },
      providerPaymentId: { type: String, default: null },
      signature: { type: String, default: null },
      instrument: { type: String, default: null },
      capturedAt: { type: Date, default: null },
      last4: { type: String, default: null },
      upiVpa: { type: String, default: null },
      refundedPaise: { type: Number, default: 0 },
    },
    paymentDueBy: { type: Date, default: null },
    fulfilment: {
      carrier: { type: String, default: null },
      trackingNumber: { type: String, default: null },
      trackingUrl: { type: String, default: null },
      shippedAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
    },
    invoice: {
      number: { type: String, default: null },
      hsn: { type: String, default: "33030090" },
      url: { type: String, default: null },
      generatedAt: { type: Date, default: null },
    },
    refunds: {
      type: [
        {
          _id: false,
          amountPaise: { type: Number, required: true },
          reason: { type: String, required: true },
          providerRefundId: { type: String, default: null },
          status: { type: String, default: "created" },
          actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
          via: { type: String, default: "razorpay" }, // "razorpay" | "manual"
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    timeline: { type: [timelineSchema], default: [] },
    customerNote: String,
    internalNotes: {
      type: [
        {
          _id: false,
          at: { type: Date, default: Date.now },
          actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
          text: { type: String, required: true },
        },
      ],
      default: [],
    },
    idempotencyKey: { type: String, required: true },
    source: { type: String, enum: ["web"], default: "web" },
  },
  { timestamps: true, minimize: false },
);

orderSchema.index({ userId: 1, createdAt: -1 }, { name: "user_created" });
orderSchema.index({ status: 1, createdAt: -1 }, { name: "status_created" });
orderSchema.index(
  { "payment.providerOrderId": 1 },
  {
    name: "provider_order",
    partialFilterExpression: { "payment.providerOrderId": { $type: "string" } },
  },
);
// Two callers finalising one payment (checkout callback + webhook) must resolve
// to the same order. Online orders set `idempotencyKey` to the Razorpay order
// id; a COD order uses the client-generated UUID that dedupes a double-submit.
orderSchema.index(
  { userId: 1, idempotencyKey: 1 },
  { name: "user_idem_unique", unique: true },
);

export const Order: Model<OrderDoc> =
  (models.Order as Model<OrderDoc>) ?? model<OrderDoc>("Order", orderSchema);
