/**
 * Isomorphic checkout DTOs and helpers.
 *
 * These mirror what `/api/checkout/*` returns. The server derives them from
 * `@/server/commerce` (which is `server-only`); the client imports the shapes
 * from here. Money in `*Paise` fields is integer paise; `lines[].unitPrice` etc.
 * are rupees for display.
 */
import type { OrderStatus, PaymentMethod } from "@/lib/validation/commerce";

export interface QuoteLine {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  qty: number;
  unitPrice: number;
  mrp: number;
  lineTotal: number;
  available: boolean;
  stock: number | null;
  maxQty: number;
}

export interface QuoteWarning {
  sku: string;
  kind: "removed" | "qty-reduced";
  message: string;
}

export interface QuotePricing {
  itemsSubtotalPaise: number;
  discountPaise: number;
  creditAppliedPaise: number;
  shippingPaise: number;
  codFeePaise: number;
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
  freeShipping: boolean;
}

export interface Serviceability {
  pincode: string;
  serviceable: boolean;
  reason: "ok" | "malformed" | "blocked" | "out-of-area";
  region: { stateCode: string; state: string } | null;
  cod: {
    available: boolean;
    reason: "ok" | "disabled" | "over-limit" | "not-serviceable";
    maxOrderValuePaise: number;
  };
}

export interface CheckoutQuoteResponse {
  ok: true;
  lines: QuoteLine[];
  warnings: QuoteWarning[];
  pricing: QuotePricing;
  serviceability: Serviceability | null;
  methods: PaymentMethod[];
  storeCreditBalancePaise: number;
  coupon:
    | { applied: true; code: string; type: string }
    | { applied: false; code: string; reason: string }
    | null;
  shipStateCode: string | null;
}

export interface CheckoutQuoteErrorResponse {
  ok: false;
  code: "empty-cart";
  message: string;
}

/** How the client should collect payment. */
export type CheckoutPaymentDirective =
  | { kind: "cod" }
  | {
      kind: "razorpay";
      razorpayOrderId: string;
      keyId: string;
      amountPaise: number;
      prefill: { name: string; email: string; contact: string };
    }
  | { kind: "razorpay-dev"; amountPaise: number };

type OnlineDirective = Extract<
  CheckoutPaymentDirective,
  { kind: "razorpay" | "razorpay-dev" }
>;

/**
 * `POST /api/checkout/place`. **Payment-first:** a COD order exists immediately;
 * an online checkout returns only an `intentId` + a payment directive — the
 * order is created once Razorpay verifies the payment.
 */
export type PlaceOrderSuccess =
  | {
      ok: true;
      kind: "cod";
      orderNumber: string;
      orderId: string;
      pricing: QuotePricing;
      payment: { kind: "cod" };
    }
  | {
      ok: true;
      kind: "online";
      intentId: string;
      pricing: QuotePricing;
      payment: OnlineDirective;
    };

export interface PlaceOrderFailure {
  ok: false;
  code:
    | "auth-required"
    | "bad-request"
    | "rate-limited"
    | "empty-cart"
    | "cart-changed"
    | "address-required"
    | "not-serviceable"
    | "method-unavailable"
    | "coupon-invalid"
    | "credit-changed"
    | "sold-out"
    | "payment-init-failed"
    | "transaction-unsupported";
  message?: string;
  details?: unknown;
}

/** `POST /api/payments/razorpay/callback` and `/api/payments/dev-simulate`. */
export interface PaymentConfirmResponse {
  ok: boolean;
  orderNumber?: string;
  refunded?: boolean;
  error?:
    | "bad-request"
    | "auth-required"
    | "signature"
    | "not-found"
    | "failed"
    | "sold-out"
    | "amount-mismatch"
    | "intent-not-found";
}

/** Customer-facing label for an order status. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  processing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};
