import "server-only";

import { dbConnect } from "@/server/db";
import { Order, type OrderDoc } from "@/server/models";
import { toRupees } from "@/lib/money";

/**
 * Order reads for the account area. Not cached — an order list must always be
 * current, and it is per-user dynamic data behind `requireUser()`.
 */

export interface OrderSummary {
  orderNumber: string;
  placedAt: string;
  status: OrderDoc["status"];
  paymentStatus: OrderDoc["payment"]["status"];
  method: OrderDoc["payment"]["method"];
  itemCount: number;
  firstItemName: string;
  grandTotal: number;
}

export interface OrderDetail extends OrderSummary {
  items: {
    name: string;
    slug: string;
    sku: string;
    image: string | null;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
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
  timeline: { at: string; status: OrderDoc["status"]; note?: string }[];
  customerNote?: string;
}

function toSummary(o: OrderDoc): OrderSummary {
  return {
    orderNumber: o.orderNumber,
    placedAt: o.createdAt.toISOString(),
    status: o.status,
    paymentStatus: o.payment.status,
    method: o.payment.method,
    itemCount: o.items.reduce((s, i) => s + i.qty, 0),
    firstItemName: o.items[0]?.name ?? "—",
    grandTotal: toRupees(o.pricing.grandTotalPaise),
  };
}

export async function listUserOrders(userId: string): Promise<OrderSummary[]> {
  await dbConnect();
  const rows = await Order.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean<OrderDoc[]>();
  return rows.map(toSummary);
}

export async function getUserOrder(
  userId: string,
  orderNumber: string,
): Promise<OrderDetail | null> {
  await dbConnect();
  const o = await Order.findOne({ userId, orderNumber }).lean<OrderDoc | null>();
  if (!o) return null;

  const p = o.pricing;
  return {
    ...toSummary(o),
    items: o.items.map((i) => ({
      name: i.name,
      slug: i.slug,
      sku: i.sku,
      image: i.image,
      qty: i.qty,
      unitPrice: toRupees(i.unitPricePaise),
      lineTotal: toRupees(i.lineTotalPaise),
    })),
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
      note: t.note,
    })),
    customerNote: o.customerNote,
  };
}
