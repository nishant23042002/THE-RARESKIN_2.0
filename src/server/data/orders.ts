import "server-only";

import { dbConnect } from "@/server/db";
import {
  Order,
  Product,
  type OrderDoc,
  type ProductDoc,
} from "@/server/models";
import { toRupees } from "@/lib/money";
import { DISCOVERY_SET_SLUG, isFragranceSlug } from "@/lib/catalog";

/**
 * Order reads for the account area. Not cached — an order list must always be
 * current, and it is per-user dynamic data behind `requireUser()`.
 *
 * Product visuals (image + notes + the link back to the PDP) are joined **live**
 * from the catalogue at read time, keyed by the snapshotted `productId`, so a
 * later change to a product's gallery flows straight through to order history.
 * The order's own snapshot (`items[].image`) is only the fallback.
 */

// ── live catalogue join ────────────────────────────────────────────────

export interface ProductVisual {
  /** best available packshot URL from the live gallery, or null → draw the vector */
  image: string | null;
  /** the PDP this item links to, or null when the slug no longer resolves */
  href: string | null;
  isFragrance: boolean;
  /** a short olfactory line for the order — the product's headline notes */
  notes: string[];
}

function pickImage(media: ProductDoc["media"] | undefined): string | null {
  if (!media) return null;
  return (
    media.gallery?.[0]?.url ??
    media.flat?.url ??
    media.hero?.url ??
    media.box?.url ??
    null
  );
}

function hrefForSlug(slug: string): string | null {
  if (slug === DISCOVERY_SET_SLUG) return "/discovery-set";
  if (isFragranceSlug(slug)) return `/fragrances/${slug}`;
  return null;
}

/** Live visuals for a set of ordered items, keyed by `productId` string. */
async function productVisuals(
  productIds: (OrderDoc["items"][number]["productId"] | string)[],
): Promise<Map<string, ProductVisual>> {
  const ids = [...new Set(productIds.map((id) => String(id)))];
  const out = new Map<string, ProductVisual>();
  if (ids.length === 0) return out;

  const docs = await Product.find({ _id: { $in: ids } })
    .select("slug media notes")
    .lean<Pick<ProductDoc, "_id" | "slug" | "media" | "notes">[]>();

  for (const d of docs) {
    out.set(String(d._id), {
      image: pickImage(d.media),
      href: hrefForSlug(d.slug),
      isFragrance: isFragranceSlug(d.slug),
      notes: (d.notes ?? []).slice(0, 4),
    });
  }
  return out;
}

// ── shapes ─────────────────────────────────────────────────────────────

export interface OrderThumb {
  slug: string;
  name: string;
  qty: number;
  image: string | null;
  isFragrance: boolean;
}

export interface OrderSummary {
  orderNumber: string;
  placedAt: string;
  status: OrderDoc["status"];
  paymentStatus: OrderDoc["payment"]["status"];
  method: OrderDoc["payment"]["method"];
  itemCount: number;
  /** distinct line items (not summed quantity) */
  lineCount: number;
  firstItemName: string;
  grandTotal: number;
  /** up to three ordered items, for the row's stacked visuals */
  thumbs: OrderThumb[];
}

export interface OrderItemView {
  name: string;
  slug: string;
  sku: string;
  image: string | null;
  href: string | null;
  isFragrance: boolean;
  notes: string[];
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItemView[];
  pricing: {
    itemsSubtotal: number;
    discount: number;
    creditApplied: number;
    shipping: number;
    codFee: number;
    taxableValue: number;
    gst: {
      ratePercent: number;
      cgst: number;
      sgst: number;
      igst: number;
      total: number;
    };
    grandTotal: number;
  };
  coupon: { code: string } | null;
  shippingAddress: OrderDoc["shippingAddress"];
  timeline: {
    at: string;
    status: OrderDoc["status"];
    actor: OrderDoc["timeline"][number]["actor"];
    note?: string;
  }[];
  customerNote?: string;
}

// ── mappers ────────────────────────────────────────────────────────────

function toSummary(
  o: OrderDoc,
  visuals: Map<string, ProductVisual>,
): OrderSummary {
  return {
    orderNumber: o.orderNumber,
    placedAt: o.createdAt.toISOString(),
    status: o.status,
    paymentStatus: o.payment.status,
    method: o.payment.method,
    itemCount: o.items.reduce((s, i) => s + i.qty, 0),
    lineCount: o.items.length,
    firstItemName: o.items[0]?.name ?? "—",
    grandTotal: toRupees(o.pricing.grandTotalPaise),
    thumbs: o.items.slice(0, 3).map((i) => {
      const v = visuals.get(String(i.productId));
      return {
        slug: i.slug,
        name: i.name,
        qty: i.qty,
        image: v?.image ?? i.image ?? null,
        isFragrance: v?.isFragrance ?? isFragranceSlug(i.slug),
      };
    }),
  };
}

// ── queries ────────────────────────────────────────────────────────────

export async function listUserOrders(userId: string): Promise<OrderSummary[]> {
  await dbConnect();
  const rows = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean<OrderDoc[]>();

  const visuals = await productVisuals(
    rows.flatMap((o) => o.items.map((i) => i.productId)),
  );
  return rows.map((o) => toSummary(o, visuals));
}

export async function getUserOrder(
  userId: string,
  orderNumber: string,
): Promise<OrderDetail | null> {
  await dbConnect();
  const o = await Order.findOne({ userId, orderNumber }).lean<OrderDoc | null>();
  if (!o) return null;

  const visuals = await productVisuals(o.items.map((i) => i.productId));
  const p = o.pricing;

  return {
    ...toSummary(o, visuals),
    items: o.items.map((i) => {
      const v = visuals.get(String(i.productId));
      return {
        name: i.name,
        slug: i.slug,
        sku: i.sku,
        image: v?.image ?? i.image ?? null,
        href: v?.href ?? hrefForSlug(i.slug),
        isFragrance: v?.isFragrance ?? isFragranceSlug(i.slug),
        notes: v?.notes ?? [],
        qty: i.qty,
        unitPrice: toRupees(i.unitPricePaise),
        lineTotal: toRupees(i.lineTotalPaise),
      };
    }),
    pricing: {
      itemsSubtotal: toRupees(p.itemsSubtotalPaise),
      discount: toRupees(p.discountPaise),
      creditApplied: toRupees(p.creditAppliedPaise),
      shipping: toRupees(p.shippingPaise),
      codFee: toRupees(p.codFeePaise),
      taxableValue: toRupees(p.taxableValuePaise),
      gst: {
        ratePercent: p.gst.ratePercent,
        cgst: toRupees(p.gst.cgstPaise),
        sgst: toRupees(p.gst.sgstPaise),
        igst: toRupees(p.gst.igstPaise),
        total: toRupees(p.gst.totalPaise),
      },
      grandTotal: toRupees(p.grandTotalPaise),
    },
    coupon: o.coupon ? { code: o.coupon.code } : null,
    shippingAddress: o.shippingAddress,
    timeline: o.timeline.map((t) => ({
      at: t.at.toISOString(),
      status: t.status,
      actor: t.actor,
      note: t.note,
    })),
    customerNote: o.customerNote,
  };
}
