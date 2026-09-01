import "server-only";

import type { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import {
  Order,
  Product,
  StoreCredit,
  type OrderDoc,
  type ProductDoc,
} from "@/server/models";
import { getSiteSettings } from "@/server/data/settings";
import { formatPaise } from "@/lib/money";
import { DISCOVERY_SET_SLUG, isFragranceSlug } from "@/lib/catalog";
import { SITE, CONTACT, absoluteUrl } from "@/lib/site";

import type {
  EmailBrand,
  EmailLineItem,
  EmailTotals,
  OrderEmailBase,
} from "./types";

const IST = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const fmtIST = (d: Date | null | undefined): string | null =>
  d ? IST.format(d) : null;

export interface OrderEmailContext {
  /** the recipient address — the order's snapshotted contact email */
  to: string;
  base: OrderEmailBase;
  method: OrderDoc["payment"]["method"];
  status: OrderDoc["status"];
  paymentStatus: OrderDoc["payment"]["status"];
  paymentDueBy: string | null;
  grandTotalPaise: number;
  /** rupee-formatted, `> 0` only when the Discovery-Set credit landed */
  discoverySetCredit: { amount: string; expires: string | null } | null;
  refunds: OrderDoc["refunds"];
}

/** Brand block for a non-order email (security notices etc.). Order emails
 *  override `orderUrl` / `invoiceUrl` via `brandFor`. */
export function accountBrand(): EmailBrand {
  const accountUrl = absoluteUrl("/account");
  return {
    siteName: SITE.name,
    legalName: SITE.legalName,
    supportEmail: CONTACT.email,
    supportAddress: CONTACT.address,
    siteUrl: SITE.url,
    logoUrl: absoluteUrl("/email/logo"),
    accountUrl,
    orderUrl: accountUrl,
    invoiceUrl: accountUrl,
  };
}

function brandFor(orderNumber: string): EmailBrand {
  return {
    ...accountBrand(),
    orderUrl: absoluteUrl(`/account/orders/${orderNumber}`),
    invoiceUrl: absoluteUrl(`/api/account/orders/${orderNumber}/invoice`),
  };
}

type ProductVisual = { image: string | null; notes: string[] };

function pickMedia(media: ProductDoc["media"] | undefined): string | null {
  if (!media) return null;
  return (
    media.gallery?.[0]?.url ??
    media.flat?.url ??
    media.hero?.url ??
    media.box?.url ??
    null
  );
}

/** Live product visuals for the ordered items, keyed by `productId` string. */
async function productVisuals(
  productIds: Types.ObjectId[],
): Promise<Map<string, ProductVisual>> {
  const ids = [...new Set(productIds.map((id) => String(id)))];
  const out = new Map<string, ProductVisual>();
  if (ids.length === 0) return out;
  const docs = await Product.find({ _id: { $in: ids } })
    .select("media notes")
    .lean<Pick<ProductDoc, "_id" | "media" | "notes">[]>();
  for (const d of docs) {
    out.set(String(d._id), {
      image: pickMedia(d.media),
      notes: d.notes ?? [],
    });
  }
  return out;
}

function concentrationFor(slug: string): string {
  if (slug === DISCOVERY_SET_SLUG) return "Discovery Set · 3 × 10 ml";
  return "Extrait de Parfum · 50 ml";
}

function itemsFor(
  o: OrderDoc,
  visuals: Map<string, ProductVisual>,
): EmailLineItem[] {
  return o.items.map((i) => {
    const v = visuals.get(String(i.productId));
    // live catalogue photo → the order's own snapshot → a generated flacon
    const image =
      v?.image ??
      i.image ??
      (isFragranceSlug(i.slug) ? absoluteUrl(`/email/flacon/${i.slug}`) : null);
    const notes = (v?.notes ?? []).slice(0, 3);
    return {
      name: i.name,
      slug: i.slug,
      concentration: concentrationFor(i.slug),
      noteLine: notes.length
        ? notes
            .map((n) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase())
            .join(", ")
        : null,
      sku: i.sku,
      qty: i.qty,
      unitPrice: formatPaise(i.unitPricePaise),
      lineTotal: formatPaise(i.lineTotalPaise),
      image,
    };
  });
}

function totalsFor(o: OrderDoc): EmailTotals {
  const p = o.pricing;
  return {
    itemsSubtotal: formatPaise(p.itemsSubtotalPaise),
    discount: p.discountPaise > 0 ? formatPaise(p.discountPaise) : null,
    discountLabel: o.coupon?.code ? `Coupon · ${o.coupon.code}` : "Discount",
    creditApplied:
      p.creditAppliedPaise > 0 ? formatPaise(p.creditAppliedPaise) : null,
    shipping: p.shippingPaise === 0 ? "Free" : formatPaise(p.shippingPaise),
    codFee: p.codFeePaise > 0 ? formatPaise(p.codFeePaise) : null,
    grandTotal: formatPaise(p.grandTotalPaise),
  };
}

function paymentLineFor(o: OrderDoc): string {
  const pay = o.payment;
  if (pay.method === "cod") return "Cash on delivery";
  if (pay.instrument === "upi" && pay.upiVpa) return `UPI · ${pay.upiVpa}`;
  if (pay.instrument === "card" && pay.last4) return `Card ending ${pay.last4}`;
  const label = pay.instrument ?? pay.method;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * One place an order becomes presentation-ready email props — unscoped
 * (`Order.findOne({ orderNumber })`, like `process.ts`, not the userId-scoped
 * `getUserOrder`). Every number is `formatPaise`d and every date is IST here so
 * templates stay pure.
 */
export async function loadOrderEmailContext(
  orderNumber: string,
): Promise<OrderEmailContext | null> {
  await dbConnect();
  const o = await Order.findOne({ orderNumber }).lean<OrderDoc | null>();
  if (!o) return null;

  const visuals = await productVisuals(o.items.map((i) => i.productId));

  const base: OrderEmailBase = {
    brand: brandFor(o.orderNumber),
    orderNumber: o.orderNumber,
    placedAt: fmtIST(o.createdAt) ?? "",
    customerName: (o.contact.name || o.shippingAddress.name || "there").split(
      " ",
    )[0]!,
    items: itemsFor(o, visuals),
    totals: totalsFor(o),
    shippingAddress: {
      name: o.shippingAddress.name,
      line1: o.shippingAddress.line1,
      line2: o.shippingAddress.line2 || undefined,
      landmark: o.shippingAddress.landmark || undefined,
      city: o.shippingAddress.city,
      state: o.shippingAddress.state,
      pincode: o.shippingAddress.pincode,
      phone: o.shippingAddress.phone,
    },
    paymentLine: paymentLineFor(o),
  };

  let discoverySetCredit: OrderEmailContext["discoverySetCredit"] = null;
  const credit = await StoreCredit.findOne({
    sourceOrderId: o._id,
    reason: "discovery_set_purchase",
  })
    .select("amountPaise expiresAt")
    .lean<{ amountPaise: number; expiresAt: Date | null } | null>();
  if (credit && credit.amountPaise > 0) {
    discoverySetCredit = {
      amount: formatPaise(credit.amountPaise),
      expires: fmtIST(credit.expiresAt),
    };
  }

  return {
    to: (o.contact.email || "").trim().toLowerCase(),
    base,
    method: o.payment.method,
    status: o.status,
    paymentStatus: o.payment.status,
    paymentDueBy: fmtIST(o.paymentDueBy),
    grandTotalPaise: o.pricing.grandTotalPaise,
    discoverySetCredit,
    refunds: o.refunds,
  };
}

/** "Dispatched within 48h · delivery 2–7 working days across India." */
export async function whatsNextLine(): Promise<string> {
  const s = await getSiteSettings();
  return `Dispatched within ${s.shipping.dispatchHours}h · delivery ${s.shipping.deliveryEstimate} across India.`;
}
