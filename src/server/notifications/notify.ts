import "server-only";

import { formatPaise } from "@/lib/money";

import { createNotification } from "./create";

/**
 * The one-liners lifecycle code calls. Each shapes a notification and hands it
 * to `createNotification` (which never throws). Wrapped in `safely` so even a
 * bug in here can't break the caller.
 */
async function safely(label: string, fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[notify] ${label} failed`, err);
  }
}

const ymd = (d = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);

// ── orders ─────────────────────────────────────────────────────────────

export function notifyOrderPlaced(input: {
  orderNumber: string;
  customerName: string;
  totalPaise: number;
  method: "razorpay" | "cod";
  paid: boolean;
}): Promise<void> {
  return safely("orderPlaced", () =>
    createNotification({
      type: input.paid ? "order.paid" : "order.cod",
      category: "orders",
      severity: "success",
      title: `New order · ${input.orderNumber}`,
      body: `${input.customerName} · ${formatPaise(input.totalPaise)} · ${
        input.paid ? input.method.toUpperCase() : "Cash on delivery"
      }`,
      href: `/admin/orders/${input.orderNumber}`,
      entity: { type: "Order", id: input.orderNumber, label: input.orderNumber },
      actor: input.customerName,
      dedupeKey: `order.placed:${input.orderNumber}`,
    }),
  );
}

export function notifyOrderCancelled(input: {
  orderNumber: string;
  reason: string;
  by: string;
}): Promise<void> {
  return safely("orderCancelled", () =>
    createNotification({
      type: "order.cancelled",
      category: "orders",
      severity: "attention",
      title: `Order cancelled · ${input.orderNumber}`,
      body: input.reason || "No reason given",
      href: `/admin/orders/${input.orderNumber}`,
      entity: { type: "Order", id: input.orderNumber, label: input.orderNumber },
      actor: input.by,
      dedupeKey: `order.cancelled:${input.orderNumber}`,
    }),
  );
}

// ── payments ───────────────────────────────────────────────────────────

export function notifyPaymentFailed(input: {
  reference: string;
  reason: string;
}): Promise<void> {
  return safely("paymentFailed", () =>
    createNotification({
      type: "payment.failed",
      category: "payments",
      severity: "attention",
      title: "Payment failed",
      body: `${input.reference} · ${input.reason || "declined"}`,
      href: "/admin/orders?status=pending",
      actor: "System",
      minRole: "operations",
      dedupeKey: `payment.failed:${input.reference}`,
    }),
  );
}

export function notifyPaymentRefunded(input: {
  orderNumber: string;
  amountPaise: number;
  full: boolean;
}): Promise<void> {
  return safely("paymentRefunded", () =>
    createNotification({
      type: "payment.refunded",
      category: "payments",
      severity: "info",
      title: `${input.full ? "Full" : "Partial"} refund · ${input.orderNumber}`,
      body: `${formatPaise(input.amountPaise)} returned to the customer`,
      href: `/admin/orders/${input.orderNumber}`,
      entity: { type: "Order", id: input.orderNumber, label: input.orderNumber },
      actor: "System",
      minRole: "operations",
      dedupeKey: `payment.refunded:${input.orderNumber}:${input.amountPaise}`,
    }),
  );
}

export function notifyPaymentDispute(input: {
  paymentId: string;
  orderNumber?: string | null;
}): Promise<void> {
  return safely("paymentDispute", () =>
    createNotification({
      type: "payment.dispute",
      category: "payments",
      severity: "critical",
      title: "Payment dispute opened",
      body: input.orderNumber
        ? `Order ${input.orderNumber} · payment ${input.paymentId}`
        : `Payment ${input.paymentId} — check Razorpay`,
      href: input.orderNumber ? `/admin/orders/${input.orderNumber}` : null,
      actor: "Razorpay",
      minRole: "admin",
      dedupeKey: `payment.dispute:${input.paymentId}`,
    }),
  );
}

export function notifyOversoldRefund(input: {
  providerOrderId: string;
  orderNumber?: string | null;
  sku: string | null;
  reason: "sold-out" | "amount-mismatch";
}): Promise<void> {
  return safely("oversoldRefund", () =>
    createNotification({
      type: "payment.oversold",
      category: "payments",
      severity: "critical",
      title:
        input.reason === "sold-out"
          ? "Paid order auto-refunded — sold out"
          : "Paid order auto-refunded — amount mismatch",
      body:
        input.reason === "sold-out"
          ? `${input.sku ?? "an item"} went out of stock during payment; the capture was refunded in full`
          : `Captured amount didn't match the quote; refunded in full (${input.providerOrderId})`,
      href: "/admin/orders",
      actor: "System",
      minRole: "admin",
      dedupeKey: `payment.oversold:${input.providerOrderId}`,
    }),
  );
}

// ── reviews ────────────────────────────────────────────────────────────

export function notifyReviewSubmitted(input: {
  reviewId: string;
  productName: string;
  authorName: string;
  rating: number;
  photoCount?: number;
}): Promise<void> {
  const photos = input.photoCount
    ? ` · ${input.photoCount} photo${input.photoCount === 1 ? "" : "s"}`
    : "";
  return safely("reviewSubmitted", () =>
    createNotification({
      type: "review.submitted",
      category: "reviews",
      severity: "attention",
      title: `New review · ${input.productName}`,
      body: `${input.rating}★ from ${input.authorName}${photos} — awaiting moderation`,
      href: "/admin/reviews",
      entity: { type: "Review", id: input.reviewId, label: input.productName },
      actor: input.authorName,
      dedupeKey: `review.submitted:${input.reviewId}`,
    }),
  );
}

// ── customers / staff ──────────────────────────────────────────────────

export function notifyContactMessage(input: {
  id: string;
  name: string;
  email: string;
  preview: string;
}): Promise<void> {
  return safely("contactMessage", () =>
    createNotification({
      type: "customer.message",
      category: "customers",
      severity: "attention",
      title: `New enquiry · ${input.name}`,
      body: input.preview,
      href: "/admin/messages",
      entity: { type: "ContactMessage", id: input.id, label: input.name },
      actor: input.name,
      dedupeKey: `customer.message:${input.id}`,
    }),
  );
}

export function notifyNewsletterSubscribed(email: string): Promise<void> {
  return safely("newsletterSubscribed", () =>
    createNotification({
      type: "newsletter.subscribed",
      category: "customers",
      severity: "info",
      title: "Newsletter sign-up",
      body: email,
      href: null,
      actor: email,
      // one row per address per day — a double-submit doesn't double the row
      dedupeKey: `newsletter.subscribed:${email.toLowerCase()}:${ymd()}`,
    }),
  );
}

export function notifyStaffLogin(input: {
  name: string;
  role: string;
  device: string;
  ip: string | null;
}): Promise<void> {
  return safely("staffLogin", () =>
    createNotification({
      type: "auth.staff_login",
      category: "system",
      severity: "attention",
      title: `Staff sign-in · ${input.name}`,
      body: `${input.role} · ${input.device}${input.ip ? ` · ${input.ip}` : ""} (new device)`,
      href: "/admin/staff",
      actor: input.name,
      minRole: "admin",
      dedupeKey: `auth.staff_login:${input.name}:${input.device}:${ymd()}`,
    }),
  );
}

export function notifyStaffInvited(input: {
  name: string;
  role: string;
  by: string;
  created: boolean;
}): Promise<void> {
  return safely("staffInvited", () =>
    createNotification({
      type: "staff.invited",
      category: "system",
      severity: "info",
      title: input.created
        ? `Staff added · ${input.name}`
        : `Staff role set · ${input.name}`,
      body: `${input.role} — by ${input.by}`,
      href: "/admin/staff",
      actor: input.by,
      minRole: "admin",
      dedupeKey: `staff.invited:${input.name}:${input.role}:${Date.now()}`,
    }),
  );
}

export function notifyUserAccountChange(input: {
  name: string;
  change: string;
  by: string;
  severity?: "info" | "attention";
}): Promise<void> {
  return safely("userAccountChange", () =>
    createNotification({
      type: "user.account_change",
      category: "customers",
      severity: input.severity ?? "info",
      title: `Account updated · ${input.name}`,
      body: `${input.change} — by ${input.by}`,
      href: "/admin/customers",
      actor: input.by,
      minRole: "admin",
      dedupeKey: `user.account_change:${input.name}:${Date.now()}`,
    }),
  );
}

// ── inventory / email ──────────────────────────────────────────────────

export function notifyLowStock(input: {
  slug: string;
  name: string;
  stock: number;
  threshold: number;
}): Promise<void> {
  return safely("lowStock", () =>
    createNotification({
      type: "inventory.low_stock",
      category: "inventory",
      severity: input.stock <= 0 ? "critical" : "attention",
      title:
        input.stock <= 0
          ? `Out of stock · ${input.name}`
          : `Low stock · ${input.name}`,
      body: `${input.stock} left (threshold ${input.threshold})`,
      href: `/admin/catalogue/${input.slug}/edit`,
      entity: { type: "Product", id: input.slug, label: input.name },
      actor: "System",
      minRole: "operations",
      // one alert per product per day
      dedupeKey: `inventory.low_stock:${input.slug}:${ymd()}`,
    }),
  );
}

export function notifyEmailBounced(input: {
  email: string;
  reason: "bounced" | "complained";
}): Promise<void> {
  return safely("emailBounced", () =>
    createNotification({
      type: "email.bounced",
      category: "system",
      severity: "attention",
      title:
        input.reason === "complained"
          ? "Email marked as spam"
          : "Email bounced",
      body: `${input.email} — added to the suppression list`,
      href: null,
      actor: "Resend",
      minRole: "admin",
      dedupeKey: `email.${input.reason}:${input.email.toLowerCase()}:${ymd()}`,
    }),
  );
}
