import "server-only";

import { dbConnect } from "@/server/db";
import {
  Order,
  Product,
  type OrderDoc,
  type ProductDoc,
} from "@/server/models";
import { SITE, CONTACT } from "@/lib/site";
import {
  DISCOVERY_SET_SLUG,
  FRAGRANCE_PALETTE,
  isFragranceSlug,
  type FragranceSlug,
} from "@/lib/catalog";

/**
 * One place an order becomes an invoice. Unscoped-by-choice: the caller
 * (`/api/account/orders/[orderNumber]/invoice`) passes the `userId` so the
 * invoice can only ever be pulled by its own customer. Every amount is a
 * pre-formatted `INR 1,234.00` string (the invoice never shows a bare `₹` — the
 * embedded fonts carry a Latin subset only), every date is IST.
 */

// ── money & dates ──────────────────────────────────────────────────────

/** `159800` → `"INR 1,598.00"` — always two decimals, the invoice convention. */
function inr(paise: number): string {
  return `INR ${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const DAY = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const STAMP = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const day = (d: Date | null | undefined) => (d ? DAY.format(d) : null);
const stamp = (d: Date | null | undefined) => (d ? STAMP.format(d) : null);

// ── amount in words (Indian system) ───────────────────────────────────

const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function under100(n: number): string {
  if (n < 20) return ONES[n]!;
  const t = TENS[Math.floor(n / 10)]!;
  return n % 10 ? `${t}-${ONES[n % 10]}` : t;
}
function under1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  return [h ? `${ONES[h]} hundred` : "", r ? under100(r) : ""].filter(Boolean).join(" ");
}

/** `159800` → `"One thousand five hundred ninety-eight rupees only"`. */
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  if (rupees === 0 && p === 0) return "Zero rupees only";

  const crore = Math.floor(rupees / 1_00_00_000);
  const lakh = Math.floor((rupees % 1_00_00_000) / 1_00_000);
  const thousand = Math.floor((rupees % 1_00_000) / 1_000);
  const rest = rupees % 1_000;

  const chunks = [
    crore ? `${under1000(crore)} crore` : "",
    lakh ? `${under100(lakh)} lakh` : "",
    thousand ? `${under100(thousand)} thousand` : "",
    rest ? under1000(rest) : "",
  ].filter(Boolean);

  let words = chunks.join(" ").replace(/\s+/g, " ").trim();
  words = words.charAt(0).toUpperCase() + words.slice(1);
  const paisePart = p ? ` and ${under100(p)} paise` : "";
  return `${words} rupees${paisePart} only`;
}

// ── product visuals (live catalogue join) ─────────────────────────────

/** Force a PDF-safe raster from a Cloudinary URL (react-pdf can't do WebP/AVIF). */
function pdfSafeImage(url: string | null): string | null {
  if (!url) return null;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/f_jpg,q_82,w_640/");
  }
  return url;
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

function concentrationFor(slug: string): string {
  if (slug === DISCOVERY_SET_SLUG) return "Discovery Set — 3 × 10 ml";
  if (isFragranceSlug(slug)) {
    return `Extrait de Parfum — ${FRAGRANCE_PALETTE[slug as FragranceSlug].volumeMl} ml`;
  }
  return "";
}

function titleCaseNotes(notes: string[]): string | null {
  const take = notes.slice(0, 3).map((n) => n.charAt(0).toUpperCase() + n.slice(1).toLowerCase());
  return take.length ? take.join(", ") : null;
}

// ── shapes ─────────────────────────────────────────────────────────────

export interface InvoiceLine {
  name: string;
  sku: string;
  concentration: string;
  noteLine: string | null;
  /** juice hex for the vector flacon glyph, or null (non-fragrance → mark glyph) */
  juice: string | null;
  /** a real packshot URL, PDF-safe, or null → draw the glyph */
  photo: string | null;
  qty: number;
  unitPrice: string;
  lineTotal: string;
}

export interface InvoiceData {
  brand: {
    name: string;
    legalName: string;
    tagline: string;
    site: string;
    email: string;
    phone: string;
    address: string;
    cityLine: string;
  };
  invoiceNumber: string;
  issuedOn: string;
  order: { number: string; placedOn: string; status: string };
  customer: { name: string; phone: string; email: string };
  shipTo: {
    name: string;
    line1: string;
    line2: string | null;
    landmark: string | null;
    city: string;
    state: string;
    pincode: string;
    phone: string;
  };
  items: InvoiceLine[];
  totals: {
    itemsSubtotal: string;
    discount: { label: string; value: string } | null;
    creditApplied: string | null;
    shipping: string;
    codFee: string | null;
    tax:
      | {
          note: string;
          taxableValue: string;
          rows: { label: string; value: string }[];
          total: string;
        }
      | null;
    grandTotal: string;
    grandTotalInWords: string;
  };
  payment: {
    method: string;
    status: string;
    reference: string | null;
    settledOn: string | null;
  };
  customerNote: string | null;
}

const STATUS_LABEL: Record<OrderDoc["status"], string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  processing: "Being prepared",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

function paymentMethodLine(pay: OrderDoc["payment"]): string {
  if (pay.method === "cod") return "Cash on Delivery";
  const inst = (pay.instrument ?? "").toLowerCase();
  if (inst === "upi" && pay.upiVpa) return `Prepaid — UPI (${pay.upiVpa})`;
  if (inst === "card" && pay.last4) return `Prepaid — Card ending ${pay.last4}`;
  if (inst === "netbanking") return "Prepaid — Netbanking";
  if (inst === "wallet") return "Prepaid — Wallet";
  if (inst) return `Prepaid — ${inst.charAt(0).toUpperCase()}${inst.slice(1)}`;
  return "Prepaid — Online";
}

function paymentStatusLine(pay: OrderDoc["payment"]): string {
  if (pay.status === "paid") return "Paid in full";
  if (pay.status === "refunded") return "Refunded";
  if (pay.status === "partially_refunded") return "Partially refunded";
  if (pay.method === "cod") return "Payable to the courier on delivery";
  return "Payment pending";
}

// ── loader ─────────────────────────────────────────────────────────────

export async function loadInvoiceData(
  orderNumber: string,
  userId: string,
): Promise<InvoiceData | null> {
  await dbConnect();
  const o = await Order.findOne({ orderNumber, userId }).lean<OrderDoc | null>();
  if (!o || o.status === "cancelled") return null;

  const ids = [...new Set(o.items.map((i) => String(i.productId)))];
  const products = ids.length
    ? await Product.find({ _id: { $in: ids } })
        .select("slug media notes")
        .lean<Pick<ProductDoc, "_id" | "slug" | "media" | "notes">[]>()
    : [];
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items: InvoiceLine[] = o.items.map((i) => {
    const p = byId.get(String(i.productId));
    const slug = p?.slug ?? i.slug;
    return {
      name: i.name,
      sku: i.sku,
      concentration: concentrationFor(slug),
      noteLine: titleCaseNotes(p?.notes ?? []),
      juice: isFragranceSlug(slug)
        ? FRAGRANCE_PALETTE[slug as FragranceSlug].juice
        : null,
      photo: pdfSafeImage(pickImage(p?.media) ?? i.image),
      qty: i.qty,
      unitPrice: inr(i.unitPricePaise),
      lineTotal: inr(i.lineTotalPaise),
    };
  });

  const pr = o.pricing;
  const gst = pr.gst;
  const tax =
    gst.totalPaise > 0
      ? {
          note: `Prices are inclusive of ${gst.ratePercent}% GST`,
          taxableValue: inr(pr.taxableValuePaise),
          rows:
            gst.igstPaise > 0
              ? [{ label: `IGST ${gst.ratePercent}%`, value: inr(gst.igstPaise) }]
              : [
                  { label: `CGST ${gst.ratePercent / 2}%`, value: inr(gst.cgstPaise) },
                  { label: `SGST ${gst.ratePercent / 2}%`, value: inr(gst.sgstPaise) },
                ],
          total: inr(gst.totalPaise),
        }
      : null;

  const a = o.shippingAddress;

  return {
    brand: {
      name: SITE.name,
      legalName: SITE.legalName,
      tagline: SITE.tagline,
      site: SITE.url.replace(/^https?:\/\//, ""),
      email: CONTACT.email,
      phone: CONTACT.phone,
      address: CONTACT.address,
      cityLine: `${CONTACT.locality}, ${CONTACT.region} ${CONTACT.postalCode}, India`,
    },
    invoiceNumber: o.orderNumber,
    issuedOn: day(o.invoice?.generatedAt ?? o.createdAt) ?? "",
    order: {
      number: o.orderNumber,
      placedOn: day(o.createdAt) ?? "",
      status: STATUS_LABEL[o.status],
    },
    customer: {
      name: o.contact.name,
      phone: o.contact.phone,
      email: o.contact.email,
    },
    shipTo: {
      name: a.name,
      line1: a.line1,
      line2: a.line2 || null,
      landmark: a.landmark || null,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      phone: a.phone,
    },
    items,
    totals: {
      itemsSubtotal: inr(pr.itemsSubtotalPaise),
      discount:
        pr.discountPaise > 0
          ? {
              label: o.coupon?.code ? `Discount (${o.coupon.code})` : "Discount",
              value: `− ${inr(pr.discountPaise)}`,
            }
          : null,
      creditApplied:
        pr.creditAppliedPaise > 0 ? `− ${inr(pr.creditAppliedPaise)}` : null,
      shipping: pr.shippingPaise === 0 ? "Free" : inr(pr.shippingPaise),
      codFee: pr.codFeePaise > 0 ? inr(pr.codFeePaise) : null,
      tax,
      grandTotal: inr(pr.grandTotalPaise),
      grandTotalInWords: amountInWords(pr.grandTotalPaise),
    },
    payment: {
      method: paymentMethodLine(o.payment),
      status: paymentStatusLine(o.payment),
      reference: o.payment.providerPaymentId ?? null,
      settledOn: stamp(o.payment.capturedAt),
    },
    customerNote: o.customerNote?.trim() || null,
  };
}
