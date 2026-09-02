/**
 * Cart, checkout, coupon and order validation.
 *
 * Isomorphic — the checkout form and the `/api/checkout/*` handlers parse
 * against the same schemas. Money is never taken from the client: the request
 * carries SKUs and quantities, the server prices everything from the live
 * catalogue. See `@/server/commerce`.
 */
import { z } from "zod";

import {
  httpUrl,
  indianMobileE164,
  objectIdString,
  paise,
  pincode,
  shortText,
} from "./primitives";
import { address } from "./user";

// ── enums / constants ───────────────────────────────────────────────────

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ["razorpay", "cod"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Rows in the immutable `payments` audit log. */
export const PAYMENT_EVENTS = [
  "order_created",
  "authorized",
  "captured",
  "failed",
  "refund_created",
  "refunded",
  "refund_failed",
  "disputed",
] as const;
export type PaymentEvent = (typeof PAYMENT_EVENTS)[number];

export const PAYMENT_EVENT_SOURCES = [
  "server",
  "checkout-callback",
  "webhook",
  "admin",
  "cron",
  "dev-simulate",
] as const;

export const REFUND_STATUSES = [
  "created",
  "processed",
  "failed",
] as const;

export const COUPON_TYPES = ["percent", "fixed", "free_shipping"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export const COUPON_STATUSES = ["active", "paused", "expired"] as const;

export const STOCK_LEDGER_REASONS = [
  "order",
  "restock",
  "adjustment",
  "return",
  "cancellation",
] as const;

export const STORE_CREDIT_REASONS = [
  "discovery_set_purchase",
  "refund",
  "goodwill",
  "promo",
] as const;
export const STORE_CREDIT_STATUSES = [
  "active",
  "spent",
  "expired",
  "revoked",
] as const;

/** Max units of any one SKU in a single order — matches the storefront cart. */
export const MAX_LINE_QTY = 12;
/** Max distinct line items in a cart / order. */
export const MAX_CART_LINES = 20;

// ── cart ────────────────────────────────────────────────────────────────

/** One requested line — SKU + quantity, nothing else the client could forge. */
export const cartItemInput = z.object({
  sku: shortText(40).transform((s) => s.toUpperCase()),
  qty: z.number().int().min(1).max(MAX_LINE_QTY),
});
export type CartItemInput = z.infer<typeof cartItemInput>;

export const cartItemsInput = z.object({
  items: z.array(cartItemInput).max(MAX_CART_LINES),
});
export type CartItemsInput = z.infer<typeof cartItemsInput>;

/** Coupon code — 3–24 chars, letters/digits/dash, normalised upper-case. */
export const couponCodeInput = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]{1,22}[A-Za-z0-9]$/, "That coupon code isn’t valid")
  .transform((s) => s.toUpperCase());

// ── checkout ────────────────────────────────────────────────────────────

/** Body of `POST /api/checkout/quote` — a non-binding price preview. */
export const checkoutQuoteInput = z.object({
  items: z.array(cartItemInput).min(1).max(MAX_CART_LINES),
  pincode: pincode.optional(),
  method: z.enum(PAYMENT_METHODS).default("razorpay"),
  couponCode: couponCodeInput.optional(),
  /** apply available store credit toward this order */
  useStoreCredit: z.boolean().default(false),
});
export type CheckoutQuoteInput = z.infer<typeof checkoutQuoteInput>;

const checkoutContact = z.object({
  name: shortText(120),
  phone: indianMobileE164,
  email: z.email("Enter a valid email address").transform((v) => v.trim().toLowerCase()),
});

/**
 * Body of `POST /api/checkout/place`. `shippingAddress` is either a saved
 * address id or a full new address (which is saved to the book). Totals,
 * coupon, credit and stock are all recomputed server-side — this payload only
 * says *what* to buy and *where* to send it.
 */
export const placeOrderInput = z.object({
  items: z.array(cartItemInput).min(1).max(MAX_CART_LINES),
  contact: checkoutContact,
  savedAddressId: objectIdString.nullish(),
  newAddress: address.nullish(),
  billingSameAsShipping: z.boolean().default(true),
  billingAddress: address.nullish(),
  method: z.enum(PAYMENT_METHODS),
  couponCode: couponCodeInput.optional(),
  useStoreCredit: z.boolean().default(false),
  customerNote: shortText(500).optional(),
  /** client-generated UUID so a double-submit can't create two orders */
  idempotencyKey: z.uuid(),
})
  .refine((v) => v.savedAddressId || v.newAddress, {
    message: "A delivery address is required",
    path: ["newAddress"],
  });
export type PlaceOrderInput = z.infer<typeof placeOrderInput>;

// ── payments (Phase E) ─────────────────────────────────────────────────

/** Body of `POST /api/payments/razorpay/callback` — the fast confirmation path
 *  after the hosted checkout succeeds. The webhook is authoritative. */
export const razorpayCallbackInput = z.object({
  razorpay_order_id: z.string().min(6).max(64),
  razorpay_payment_id: z.string().min(6).max(64),
  razorpay_signature: z.string().min(16).max(256),
});
export type RazorpayCallbackInput = z.infer<typeof razorpayCallbackInput>;

/** Dev-only: simulate a payment outcome when Razorpay isn't configured. */
export const devPaymentSimulateInput = z.object({
  intentId: z.string().min(12).max(64),
  outcome: z.enum(["paid", "failed"]),
});

/** Admin refund. `orderNumber` comes from the route path, not the body. */
export const refundInput = z.object({
  /** omit for a full refund of the remaining amount */
  amountPaise: paise.optional(),
  reason: shortText(240),
});
export type RefundInput = z.infer<typeof refundInput>;

// ── admin: order management (Phase G1) ──────────────────────────────────

/** `PATCH /api/admin/orders/[orderNumber]` — advance status, with the tracking
 *  fields when moving to `shipped`. */
export const orderStatusAdvanceInput = z.object({
  action: z.literal("status"),
  to: z.enum(ORDER_STATUSES),
  carrier: shortText(80).optional(),
  trackingNumber: shortText(80).optional(),
  trackingUrl: httpUrl.max(500).optional(),
  eta: shortText(60).optional(),
});
export type OrderStatusAdvanceInput = z.infer<typeof orderStatusAdvanceInput>;

/** `PATCH /api/admin/orders/[orderNumber]` — add an internal (staff-only) note. */
export const orderNoteInput = z.object({
  action: z.literal("note"),
  text: shortText(1000),
});
export type OrderNoteInput = z.infer<typeof orderNoteInput>;

export const orderPatchInput = z.discriminatedUnion("action", [
  orderStatusAdvanceInput,
  orderNoteInput,
]);

/** `POST /api/admin/orders/[orderNumber]/cancel` — COD only. */
export const orderCancelInput = z.object({
  reason: shortText(240),
});
export type OrderCancelInput = z.infer<typeof orderCancelInput>;

// ── admin: coupon CRUD (schema lives here; UI is Phase H) ────────────────

export const couponInput = z.object({
  code: couponCodeInput,
  type: z.enum(COUPON_TYPES),
  /** percent (0–100) or a paise amount, per `type`; ignored for free_shipping */
  value: z.number().min(0).default(0),
  minSubtotalPaise: paise.default(0),
  maxUses: z.number().int().min(0).default(0), // 0 = unlimited
  usesPerUser: z.number().int().min(0).default(1), // 0 = unlimited
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  stackable: z.boolean().default(false),
  status: z.enum(COUPON_STATUSES).default("active"),
  note: shortText(200).optional(),
});
export type CouponInput = z.infer<typeof couponInput>;

/**
 * Partial patch from the admin coupon edit form. `code` is immutable (orders
 * snapshot `coupon.code`), so it's dropped. Date fields accept `null` to clear.
 */
export const couponUpdateInput = z.object({
  type: z.enum(COUPON_TYPES).optional(),
  value: z.number().min(0).optional(),
  minSubtotalPaise: paise.optional(),
  maxUses: z.number().int().min(0).optional(),
  usesPerUser: z.number().int().min(0).optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  stackable: z.boolean().optional(),
  status: z.enum(COUPON_STATUSES).optional(),
  note: shortText(200).nullable().optional(),
});
export type CouponUpdateInput = z.infer<typeof couponUpdateInput>;

/** `POST /api/admin/coupons/[code]` — quick status toggle. */
export const couponActionInput = z.object({
  action: z.literal("status"),
  status: z.enum(COUPON_STATUSES),
});
