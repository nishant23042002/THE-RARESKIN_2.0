import "server-only";

import { unstable_cache } from "next/cache";

import { dbConnect } from "@/server/db";
import {
  Order,
  Product,
  Review,
  type OrderDoc,
  type ProductDoc,
  type ReviewDoc,
} from "@/server/models";
import { isFragranceSlug, DISCOVERY_SET_SLUG } from "@/lib/catalog";
import type { ReviewStatus } from "@/lib/validation/review";

/**
 * Review reads.
 *
 * Storefront reads (`getProductReviews`, `getFeaturedReviews`) are
 * `unstable_cache`d and tagged `reviews` / `reviews:<slug>`; a moderation
 * decision in `/admin/reviews` busts those tags so the PDP + homepage refresh
 * within seconds. Account reads are per-user dynamic data behind `requireUser()`
 * and never cached.
 *
 * Tags:
 *   reviews            every review read
 *   reviews:<slug>     one product's reviews
 */

const REVIEWS_TAG = "reviews";
const productReviewsTag = (slug: string) => `reviews:${slug}`;
const REVALIDATE_SECONDS = 60 * 60 * 24;

// ── shapes ─────────────────────────────────────────────────────────────

export interface ReviewSummary {
  average: number;
  count: number;
  /** [5★, 4★, 3★, 2★, 1★] counts */
  distribution: [number, number, number, number, number];
}

export interface PublicReview {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  publishedAt: string;
}

export interface ProductReviews {
  summary: ReviewSummary;
  items: PublicReview[];
}

export interface FeaturedReview extends PublicReview {
  productName: string;
  productSlug: string;
  href: string | null;
}

export interface ReviewableItem {
  orderNumber: string;
  sku: string;
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  isFragrance: boolean;
  deliveredAt: string | null;
}

export interface MyReview {
  id: string;
  productName: string;
  productSlug: string;
  href: string | null;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  createdAt: string;
  editable: boolean;
}

// ── helpers ────────────────────────────────────────────────────────────

function hrefForSlug(slug: string): string | null {
  if (slug === DISCOVERY_SET_SLUG) return "/discovery-set";
  if (isFragranceSlug(slug)) return `/fragrances/${slug}`;
  return null;
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

function toPublic(r: ReviewDoc): PublicReview {
  return {
    id: String(r._id),
    authorName: r.authorName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
  };
}

/** Aggregate a set of approved reviews into a summary. */
function summarise(rows: Pick<ReviewDoc, "rating">[]): ReviewSummary {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let total = 0;
  for (const r of rows) {
    const i = 5 - r.rating; // rating 5 → index 0
    if (i >= 0 && i < 5) distribution[i] += 1;
    total += r.rating;
  }
  const count = rows.length;
  return {
    count,
    average: count > 0 ? total / count : 0,
    distribution,
  };
}

// ── storefront (cached) ────────────────────────────────────────────────

export function getProductReviews(slug: string): Promise<ProductReviews> {
  return unstable_cache(
    async (): Promise<ProductReviews> => {
      await dbConnect();
      const rows = await Review.find({
        productSlug: slug,
        status: "approved",
      })
        .sort({ publishedAt: -1 })
        .limit(60)
        .lean<ReviewDoc[]>();
      return {
        summary: summarise(rows),
        items: rows.map(toPublic),
      };
    },
    ["reviews:product", slug],
    {
      tags: [REVIEWS_TAG, productReviewsTag(slug)],
      revalidate: REVALIDATE_SECONDS,
    },
  )();
}

export const getFeaturedReviews = unstable_cache(
  async (limit = 6): Promise<FeaturedReview[]> => {
    await dbConnect();
    const rows = await Review.find({ status: "approved" })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean<ReviewDoc[]>();

    const slugs = [...new Set(rows.map((r) => r.productSlug))];
    const products = await Product.find({ slug: { $in: slugs } })
      .select("slug name")
      .lean<Pick<ProductDoc, "slug" | "name">[]>();
    const nameBySlug = new Map(products.map((p) => [p.slug, p.name]));

    return rows.map((r) => ({
      ...toPublic(r),
      productName: nameBySlug.get(r.productSlug) ?? r.productSlug,
      productSlug: r.productSlug,
      href: hrefForSlug(r.productSlug),
    }));
  },
  ["reviews:featured"],
  { tags: [REVIEWS_TAG], revalidate: REVALIDATE_SECONDS },
);

// ── account (uncached) ─────────────────────────────────────────────────

/** Did this user receive a delivery containing this product? */
export async function hasDeliveredPurchase(
  userId: string,
  productId: string,
): Promise<{ orderId: string; orderNumber: string } | null> {
  await dbConnect();
  const order = await Order.findOne({
    userId,
    status: "delivered",
    "items.productId": productId,
  })
    .select("_id orderNumber")
    .sort({ "fulfilment.deliveredAt": -1 })
    .lean<Pick<OrderDoc, "_id" | "orderNumber"> | null>();
  return order
    ? { orderId: String(order._id), orderNumber: order.orderNumber }
    : null;
}

/**
 * Products this user has received and not yet reviewed — the "to review" list on
 * `/account/reviews`. One entry per product (the most recent delivery wins).
 */
export async function getReviewableItems(
  userId: string,
): Promise<ReviewableItem[]> {
  await dbConnect();

  const [orders, reviewed] = await Promise.all([
    Order.find({ userId, status: "delivered" })
      .sort({ "fulfilment.deliveredAt": -1, createdAt: -1 })
      .lean<OrderDoc[]>(),
    Review.find({ userId }).select("productId").lean<
      Pick<ReviewDoc, "productId">[]
    >(),
  ]);

  const done = new Set(reviewed.map((r) => String(r.productId)));
  const seen = new Set<string>();
  const picks: {
    productId: string;
    sku: string;
    slug: string;
    name: string;
    orderNumber: string;
    deliveredAt: Date | null;
  }[] = [];

  for (const o of orders) {
    for (const it of o.items) {
      const pid = String(it.productId);
      if (done.has(pid) || seen.has(pid)) continue;
      seen.add(pid);
      picks.push({
        productId: pid,
        sku: it.sku,
        slug: it.slug,
        name: it.name,
        orderNumber: o.orderNumber,
        deliveredAt: o.fulfilment?.deliveredAt ?? null,
      });
    }
  }

  if (picks.length === 0) return [];

  const products = await Product.find({
    _id: { $in: picks.map((p) => p.productId) },
  })
    .select("slug media")
    .lean<Pick<ProductDoc, "_id" | "slug" | "media">[]>();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  return picks.map((p) => {
    const doc = byId.get(p.productId);
    return {
      orderNumber: p.orderNumber,
      sku: p.sku,
      productId: p.productId,
      slug: p.slug,
      name: p.name,
      image: doc ? pickImage(doc.media) : null,
      isFragrance: isFragranceSlug(p.slug),
      deliveredAt: p.deliveredAt ? p.deliveredAt.toISOString() : null,
    };
  });
}

/** This user's submitted reviews, newest first. */
export async function getMyReviews(userId: string): Promise<MyReview[]> {
  await dbConnect();
  const rows = await Review.find({ userId })
    .sort({ createdAt: -1 })
    .lean<ReviewDoc[]>();

  const slugs = [...new Set(rows.map((r) => r.productSlug))];
  const products = await Product.find({ slug: { $in: slugs } })
    .select("slug name")
    .lean<Pick<ProductDoc, "slug" | "name">[]>();
  const nameBySlug = new Map(products.map((p) => [p.slug, p.name]));

  return rows.map((r) => ({
    id: String(r._id),
    productName: nameBySlug.get(r.productSlug) ?? r.productSlug,
    productSlug: r.productSlug,
    href: hrefForSlug(r.productSlug),
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    editable: r.status === "pending",
  }));
}
