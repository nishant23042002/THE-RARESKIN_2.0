import "server-only";

import { formatPaise } from "@/lib/money";

import { accountBrand, loadOrderEmailContext, whatsNextLine } from "./order-context";
import { enqueueAndDrain } from "./outbox";

const IST_DATETIME = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** tiny non-crypto hash for a dedupe key */
function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

/**
 * The one-liners the order-lifecycle code calls. Each loads the order, shapes
 * the template props, and enqueues (+ opportunistic drain). **Every one swallows
 * its own errors** — a mail failure must never roll back a payment.
 */

async function safely(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error(`[email] ${label} failed`, err);
  }
}

export function notifyOrderConfirmed(orderNumber: string): Promise<void> {
  return safely("notifyOrderConfirmed", async () => {
    const ctx = await loadOrderEmailContext(orderNumber);
    if (!ctx?.to) return;
    await enqueueAndDrain({
      template: "order-confirmed",
      to: ctx.to,
      orderNumber,
      dedupeKey: `order-confirmed:${orderNumber}`,
      props: {
        ...ctx.base,
        whatsNext: await whatsNextLine(),
        discoverySetCredit: ctx.discoverySetCredit,
      },
    });
  });
}

export function notifyOrderPlacedCod(orderNumber: string): Promise<void> {
  return safely("notifyOrderPlacedCod", async () => {
    const ctx = await loadOrderEmailContext(orderNumber);
    if (!ctx?.to) return;
    await enqueueAndDrain({
      template: "order-placed-cod",
      to: ctx.to,
      orderNumber,
      dedupeKey: `order-placed-cod:${orderNumber}`,
      props: {
        ...ctx.base,
        amountDueOnDelivery: ctx.base.totals.grandTotal,
        whatsNext: await whatsNextLine(),
      },
    });
  });
}

export function notifyPaymentFailed(
  orderNumber: string,
  reason: string,
): Promise<void> {
  return safely("notifyPaymentFailed", async () => {
    const ctx = await loadOrderEmailContext(orderNumber);
    if (!ctx?.to) return;
    await enqueueAndDrain({
      template: "payment-failed",
      to: ctx.to,
      orderNumber,
      dedupeKey: `payment-failed:${orderNumber}`,
      props: {
        ...ctx.base,
        reason: reason || "the payment could not be completed",
        holdUntil: ctx.paymentDueBy,
      },
    });
  });
}

export function notifyOrderCancelled(
  orderNumber: string,
  reason: string,
): Promise<void> {
  return safely("notifyOrderCancelled", async () => {
    const ctx = await loadOrderEmailContext(orderNumber);
    if (!ctx?.to) return;
    const usedCredit =
      ctx.base.totals.creditApplied != null &&
      ctx.base.totals.creditApplied !== "₹0";
    await enqueueAndDrain({
      template: "order-cancelled",
      to: ctx.to,
      orderNumber,
      dedupeKey: `order-cancelled:${orderNumber}`,
      props: {
        ...ctx.base,
        reason,
        refundNote: usedCredit
          ? "any store credit you used has been returned"
          : null,
      },
    });
  });
}

export function notifyRefundProcessed(input: {
  orderNumber: string;
  providerRefundId: string | null;
  refundIndex: number;
  amountPaise: number;
  reason: string;
  fullRefund: boolean;
}): Promise<void> {
  return safely("notifyRefundProcessed", async () => {
    const ctx = await loadOrderEmailContext(input.orderNumber);
    if (!ctx?.to) return;
    await enqueueAndDrain({
      template: "refund-processed",
      to: ctx.to,
      orderNumber: input.orderNumber,
      dedupeKey: `refund-processed:${
        input.providerRefundId ?? `${input.orderNumber}:${input.refundIndex}`
      }`,
      props: {
        ...ctx.base,
        refundAmount: formatPaise(input.amountPaise),
        refundReason: input.reason,
        destination: "to your original payment method",
        fullRefund: input.fullRefund,
      },
    });
  });
}

/**
 * First sign-in from a new browser + OS. Best-effort, dedupe-guarded per
 * (user, day, device+ip). Only sent when the account has an email on file —
 * many customers never add one.
 */
export function notifyNewDevice(input: {
  userId: string;
  email: string | null;
  name: string;
  device: { browser: string | null; os: string | null };
  ip: string | null;
  at?: Date;
}): Promise<void> {
  return safely("notifyNewDevice", async () => {
    const email = input.email?.trim().toLowerCase();
    if (!email || !email.includes("@")) return;

    const at = input.at ?? new Date();
    const ymd = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(at); // YYYY-MM-DD
    const deviceLabel =
      [input.device.browser, input.device.os].filter(Boolean).join(" on ") ||
      "a new device";

    await enqueueAndDrain({
      template: "new-device",
      to: email,
      userId: input.userId,
      dedupeKey: `new-device:${input.userId}:${ymd}:${hash(
        `${input.device.browser}|${input.device.os}|${input.ip ?? ""}`,
      )}`,
      props: {
        brand: accountBrand(),
        customerName: input.name?.trim().split(" ")[0] || "there",
        deviceLabel,
        ip: input.ip,
        when: IST_DATETIME.format(at),
      },
    });
  });
}

/** Fired by the admin when an order is advanced to `shipped` / `delivered`. */
export function notifyOrderStatus(
  orderNumber: string,
  status: "shipped" | "delivered",
  fulfilment?: {
    carrier?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    eta?: string | null;
  },
): Promise<void> {
  return safely(`notifyOrderStatus:${status}`, async () => {
    const ctx = await loadOrderEmailContext(orderNumber);
    if (!ctx?.to) return;
    if (status === "shipped") {
      await enqueueAndDrain({
        template: "order-shipped",
        to: ctx.to,
        orderNumber,
        dedupeKey: `order-shipped:${orderNumber}`,
        props: {
          ...ctx.base,
          carrier: fulfilment?.carrier ?? null,
          trackingNumber: fulfilment?.trackingNumber ?? null,
          trackingUrl: fulfilment?.trackingUrl ?? null,
          eta: fulfilment?.eta ?? null,
        },
      });
    } else {
      await enqueueAndDrain({
        template: "order-delivered",
        to: ctx.to,
        orderNumber,
        dedupeKey: `order-delivered:${orderNumber}`,
        props: { ...ctx.base, deliveredAt: ctx.base.placedAt },
      });
    }
  });
}
