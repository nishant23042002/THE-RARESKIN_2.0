import "server-only";

import { dbConnect } from "@/server/db";
import {
  Order,
  Payment,
  Product,
  User,
  type OrderDoc,
  type PaymentDoc,
  type ProductDoc,
} from "@/server/models";
import { nextStatuses } from "@/server/payments";
import { DISCOVERY_SET_SLUG, isFragranceSlug } from "@/lib/catalog";
import {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/validation/commerce";

/**
 * Order reads for the admin. Not cached — an operator always needs the current
 * state. Everything here is behind `requireAdminRole` in the page / route.
 */

// ── IST day boundaries (Vercel runs UTC; the shop is in India) ──────────

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function istDayStart(daysAgo = 0): Date {
  const ist = new Date(Date.now() + IST_OFFSET_MS);
  ist.setUTCHours(0, 0, 0, 0);
  ist.setUTCDate(ist.getUTCDate() - daysAgo);
  return new Date(ist.getTime() - IST_OFFSET_MS);
}

// ── live catalogue visuals (mirrors src/server/data/orders.ts) ──────────

export interface ItemVisual {
  image: string | null;
  href: string | null;
  isFragrance: boolean;
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

async function itemVisuals(
  productIds: (OrderDoc["items"][number]["productId"] | string)[],
): Promise<Map<string, ItemVisual>> {
  const ids = [...new Set(productIds.map(String))];
  const out = new Map<string, ItemVisual>();
  if (ids.length === 0) return out;
  const docs = await Product.find({ _id: { $in: ids } })
    .select("slug media")
    .lean<Pick<ProductDoc, "_id" | "slug" | "media">[]>();
  for (const d of docs) {
    out.set(String(d._id), {
      image: pickImage(d.media),
      href: hrefForSlug(d.slug),
      isFragrance: isFragranceSlug(d.slug),
    });
  }
  return out;
}

// ── list ───────────────────────────────────────────────────────────────

export interface AdminOrderRow {
  orderNumber: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: OrderDoc["payment"]["status"];
  method: PaymentMethod;
  customerName: string;
  customerPhone: string;
  itemCount: number;
  grandTotalPaise: number;
}

export interface AdminOrderList {
  rows: AdminOrderRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
}

export interface ListOrdersParams {
  status?: OrderStatus | "all";
  method?: PaymentMethod | "all";
  q?: string;
  page?: number;
  pageSize?: number;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listOrders(
  params: ListOrdersParams = {},
): Promise<AdminOrderList> {
  await dbConnect();

  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
  const page = Math.max(params.page ?? 1, 1);

  const filter: Record<string, unknown> = {};
  if (params.status && params.status !== "all" && ORDER_STATUSES.includes(params.status)) {
    filter.status = params.status;
  }
  if (params.method && params.method !== "all" && PAYMENT_METHODS.includes(params.method)) {
    filter["payment.method"] = params.method;
  }

  const q = params.q?.trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { orderNumber: rx },
      { "contact.name": rx },
      { "contact.email": rx },
      { "contact.phone": rx },
    ];
  }

  const [total, docs] = await Promise.all([
    Order.countDocuments(filter),
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .select(
        "orderNumber createdAt status payment.status payment.method contact.name contact.phone items pricing.grandTotalPaise",
      )
      .lean<OrderDoc[]>(),
  ]);

  return {
    rows: docs.map((o) => ({
      orderNumber: o.orderNumber,
      placedAt: o.createdAt.toISOString(),
      status: o.status,
      paymentStatus: o.payment.status,
      method: o.payment.method,
      customerName: o.contact.name,
      customerPhone: o.contact.phone,
      itemCount: o.items.reduce((s, i) => s + i.qty, 0),
      grandTotalPaise: o.pricing.grandTotalPaise,
    })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
  };
}

// ── detail ─────────────────────────────────────────────────────────────

export interface AdminOrderItem {
  name: string;
  slug: string;
  sku: string;
  qty: number;
  unitPricePaise: number;
  mrpPaise: number;
  lineTotalPaise: number;
  image: string | null;
  href: string | null;
  isFragrance: boolean;
}

export interface AdminTimelineEntry {
  at: string;
  status: OrderStatus;
  actor: OrderDoc["timeline"][number]["actor"];
  actorName: string | null;
  note?: string;
}

export interface AdminPaymentEntry {
  at: string;
  event: PaymentDoc["event"];
  provider: PaymentDoc["provider"];
  amountPaise: number;
  method: string | null;
  providerPaymentId: string | null;
  providerRefundId: string | null;
  source: PaymentDoc["source"];
  signatureVerified: boolean;
  note: string | null;
}

export interface AdminInternalNote {
  at: string;
  actorName: string | null;
  text: string;
}

export interface AdminRefundEntry {
  at: string;
  amountPaise: number;
  reason: string;
  status: string;
  via: string;
  providerRefundId: string | null;
}

export interface AdminOrderDetail {
  orderNumber: string;
  placedAt: string;
  status: OrderStatus;
  allowedTransitions: OrderStatus[];
  method: PaymentMethod;
  payment: {
    status: OrderDoc["payment"]["status"];
    provider: string | null;
    instrument: string | null;
    last4: string | null;
    upiVpa: string | null;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    capturedAt: string | null;
    refundedPaise: number;
  };
  fulfilment: {
    carrier: string | null;
    trackingNumber: string | null;
    trackingUrl: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    role: string;
    orderCount: number;
  } | null;
  contact: { name: string; phone: string; email: string };
  shippingAddress: OrderDoc["shippingAddress"];
  billingAddress: OrderDoc["billingAddress"];
  items: AdminOrderItem[];
  pricing: OrderDoc["pricing"];
  coupon: { code: string; type: string; valuePaise: number } | null;
  customerNote?: string;
  timeline: AdminTimelineEntry[];
  payments: AdminPaymentEntry[];
  refunds: AdminRefundEntry[];
  internalNotes: AdminInternalNote[];
}

export async function getOrderForAdmin(
  orderNumber: string,
): Promise<AdminOrderDetail | null> {
  await dbConnect();
  const o = await Order.findOne({ orderNumber }).lean<OrderDoc | null>();
  if (!o) return null;

  const [visuals, payments, customer, orderCount] = await Promise.all([
    itemVisuals(o.items.map((i) => i.productId)),
    Payment.find({ orderId: o._id }).sort({ at: -1 }).lean<PaymentDoc[]>(),
    User.findById(o.userId)
      .select("name phone email role")
      .lean<{ _id: unknown; name: string; phone: string; email: string | null; role: string } | null>(),
    Order.countDocuments({ userId: o.userId }),
  ]);

  // resolve every actor id referenced by the timeline / notes to a name
  const actorIds = [
    ...new Set(
      [
        ...o.timeline.map((t) => t.actorId),
        ...o.internalNotes.map((n) => n.actorId),
      ]
        .filter(Boolean)
        .map(String),
    ),
  ];
  const actors = actorIds.length
    ? await User.find({ _id: { $in: actorIds } })
        .select("name")
        .lean<{ _id: unknown; name: string }[]>()
    : [];
  const actorName = new Map(actors.map((a) => [String(a._id), a.name || null]));

  return {
    orderNumber: o.orderNumber,
    placedAt: o.createdAt.toISOString(),
    status: o.status,
    allowedTransitions: nextStatuses(o.status),
    method: o.payment.method,
    payment: {
      status: o.payment.status,
      provider: o.payment.provider,
      instrument: o.payment.instrument,
      last4: o.payment.last4,
      upiVpa: o.payment.upiVpa,
      providerOrderId: o.payment.providerOrderId,
      providerPaymentId: o.payment.providerPaymentId,
      capturedAt: o.payment.capturedAt ? o.payment.capturedAt.toISOString() : null,
      refundedPaise: o.payment.refundedPaise,
    },
    fulfilment: {
      carrier: o.fulfilment.carrier,
      trackingNumber: o.fulfilment.trackingNumber,
      trackingUrl: o.fulfilment.trackingUrl,
      shippedAt: o.fulfilment.shippedAt ? o.fulfilment.shippedAt.toISOString() : null,
      deliveredAt: o.fulfilment.deliveredAt
        ? o.fulfilment.deliveredAt.toISOString()
        : null,
    },
    customer: customer
      ? {
          id: String(customer._id),
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          role: customer.role,
          orderCount,
        }
      : null,
    contact: o.contact,
    shippingAddress: o.shippingAddress,
    billingAddress: o.billingAddress,
    items: o.items.map((i) => {
      const v = visuals.get(String(i.productId));
      return {
        name: i.name,
        slug: i.slug,
        sku: i.sku,
        qty: i.qty,
        unitPricePaise: i.unitPricePaise,
        mrpPaise: i.mrpPaise,
        lineTotalPaise: i.lineTotalPaise,
        image: v?.image ?? i.image ?? null,
        href: v?.href ?? hrefForSlug(i.slug),
        isFragrance: v?.isFragrance ?? isFragranceSlug(i.slug),
      };
    }),
    pricing: o.pricing,
    coupon: o.coupon,
    customerNote: o.customerNote,
    timeline: o.timeline.map((t) => ({
      at: t.at.toISOString(),
      status: t.status,
      actor: t.actor,
      actorName: t.actorId ? (actorName.get(String(t.actorId)) ?? null) : null,
      note: t.note,
    })),
    payments: payments.map((p) => ({
      at: p.at.toISOString(),
      event: p.event,
      provider: p.provider,
      amountPaise: p.amountPaise,
      method: p.method,
      providerPaymentId: p.providerPaymentId,
      providerRefundId: p.providerRefundId,
      source: p.source,
      signatureVerified: p.signatureVerified,
      note: p.note,
    })),
    refunds: o.refunds.map((r) => ({
      at: r.createdAt.toISOString(),
      amountPaise: r.amountPaise,
      reason: r.reason,
      status: r.status,
      via: r.via,
      providerRefundId: r.providerRefundId,
    })),
    internalNotes: o.internalNotes.map((n) => ({
      at: n.at.toISOString(),
      actorName: actorName.get(String(n.actorId)) ?? null,
      text: n.text,
    })),
  };
}

// ── dashboard ──────────────────────────────────────────────────────────

export interface AdminDashboard {
  today: { orders: number; revenuePaise: number };
  awaitingShipment: number;
  lowStock: number;
  last7Days: { date: string; orders: number; revenuePaise: number }[];
  fulfilmentQueue: AdminOrderRow[];
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  await dbConnect();
  const dayStart = istDayStart(0);
  const weekStart = istDayStart(6);

  const [todayAgg, weekAgg, awaitingShipment, lowStock, queue] = await Promise.all([
    Order.aggregate<{ orders: number; revenuePaise: number }>([
      {
        $match: {
          createdAt: { $gte: dayStart },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: null,
          orders: { $sum: 1 },
          revenuePaise: { $sum: "$pricing.grandTotalPaise" },
        },
      },
    ]),
    Order.aggregate<{ _id: string; orders: number; revenuePaise: number }>([
      {
        $match: {
          createdAt: { $gte: weekStart },
          status: { $nin: ["cancelled", "refunded"] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt",
              format: "%Y-%m-%d",
              timezone: "Asia/Kolkata",
            },
          },
          orders: { $sum: 1 },
          revenuePaise: { $sum: "$pricing.grandTotalPaise" },
        },
      },
    ]),
    Order.countDocuments({ status: { $in: ["confirmed", "processing"] } }),
    Product.countDocuments({
      "inventory.trackInventory": true,
      $expr: { $lte: ["$inventory.stock", "$inventory.lowStockThreshold"] },
    }),
    listOrders({ status: "confirmed", pageSize: 20 }),
  ]);

  const byDay = new Map(weekAgg.map((d) => [d._id, d]));
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = istDayStart(6 - i);
    const key = new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
    const hit = byDay.get(key);
    return {
      date: key,
      orders: hit?.orders ?? 0,
      revenuePaise: hit?.revenuePaise ?? 0,
    };
  });

  return {
    today: {
      orders: todayAgg[0]?.orders ?? 0,
      revenuePaise: todayAgg[0]?.revenuePaise ?? 0,
    },
    awaitingShipment,
    lowStock,
    last7Days,
    fulfilmentQueue: queue.rows,
  };
}
