/**
 * Template prop shapes. **Every value is plain, presentation-ready data** —
 * money already run through `formatPaise`, dates already formatted in
 * `Asia/Kolkata`. Templates never touch mongoose, `server-only`, `@/…` or a
 * clock; `order-context.ts` does all of that and hands them these.
 */

export interface EmailBrand {
  siteName: string;
  legalName: string;
  supportEmail: string;
  supportAddress: string;
  siteUrl: string;
  /** hosted masthead PNG (`/email/logo`) */
  logoUrl: string;
  /** the account landing */
  accountUrl: string;
  /** deep link to an order's page — order emails set this to the real order;
   *  non-order emails (e.g. new-device) point it at the account page */
  orderUrl: string;
  /** direct download for an order's invoice PDF — as `orderUrl`, non-order
   *  emails just reuse the account URL */
  invoiceUrl: string;
}

export interface EmailLineItem {
  name: string;
  slug: string;
  concentration: string; // "Extrait de Parfum · 50 ml" | "Discovery Set · 3 × 10 ml"
  /** a short olfactory line, e.g. "Citrus, bergamot, white florals" */
  noteLine: string | null;
  sku: string;
  qty: number;
  unitPrice: string; // "₹799"
  lineTotal: string;
  /** product packshot / generated flacon PNG, or null */
  image: string | null;
}

export interface EmailAddress {
  name: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export interface EmailTotals {
  itemsSubtotal: string;
  /** null when zero → the template hides the row */
  discount: string | null;
  discountLabel: string | null;
  creditApplied: string | null;
  shipping: string; // "Free" | "₹79"
  codFee: string | null;
  grandTotal: string;
}

export interface OrderEmailBase {
  brand: EmailBrand;
  orderNumber: string;
  placedAt: string; // "29 Aug 2026, 8:32 pm"
  customerName: string;
  items: EmailLineItem[];
  totals: EmailTotals;
  shippingAddress: EmailAddress;
  paymentLine: string; // "UPI · name@bank" | "Card ending 4242" | "Cash on delivery"
}

export interface OrderConfirmedProps extends OrderEmailBase {
  whatsNext: string;
  discoverySetCredit: { amount: string; expires: string | null } | null;
}

export interface OrderPlacedCodProps extends OrderEmailBase {
  amountDueOnDelivery: string;
  whatsNext: string;
}

export interface PaymentFailedProps extends OrderEmailBase {
  reason: string;
  holdUntil: string | null;
}

export interface OrderCancelledProps extends OrderEmailBase {
  reason: string;
  refundNote: string | null;
}

export interface RefundProcessedProps extends OrderEmailBase {
  refundAmount: string;
  refundReason: string;
  destination: string; // "to your original payment method"
  fullRefund: boolean;
}

export interface OrderShippedProps extends OrderEmailBase {
  carrier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  eta: string | null;
}

export interface OrderDeliveredProps extends OrderEmailBase {
  deliveredAt: string;
}

/** Sent a few days after delivery, asking for a review. Not order-shaped —
 *  it only needs the pieces + a deep link to the review form. */
export interface ReviewRequestProps {
  brand: EmailBrand;
  /** the account holder's first name, or "there" */
  customerName: string;
  orderNumber: string;
  /** IST timestamp, already formatted, or null */
  deliveredAt: string | null;
  items: { name: string; slug: string; image: string | null }[];
  /** deep link to `/account/reviews` */
  reviewUrl: string;
}

/** Security notice — not order-related, so it doesn't extend `OrderEmailBase`. */
export interface NewDeviceProps {
  brand: EmailBrand;
  /** the account holder's first name, or "there" */
  customerName: string;
  /** "Chrome on Windows" | "Safari on iOS" | "a new device" */
  deviceLabel: string;
  /** the sign-in IP, or null when unknown */
  ip: string | null;
  /** IST timestamp, already formatted */
  when: string;
}

export interface EmailPropsMap {
  "order-confirmed": OrderConfirmedProps;
  "order-placed-cod": OrderPlacedCodProps;
  "payment-failed": PaymentFailedProps;
  "order-cancelled": OrderCancelledProps;
  "refund-processed": RefundProcessedProps;
  "order-shipped": OrderShippedProps;
  "order-delivered": OrderDeliveredProps;
  "review-request": ReviewRequestProps;
  "new-device": NewDeviceProps;
}

export type EmailPropsFor<T extends keyof EmailPropsMap> = EmailPropsMap[T];
