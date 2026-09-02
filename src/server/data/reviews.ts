import "server-only";

import { unstable_cache } from "next/cache";

import { dbConnect } from "@/server/db";
import {
  Order,
  Product,
  Review,
  User,
  type OrderDoc,
  type ProductDoc,
  type ReviewDoc,
  type UserDoc,
} from "@/server/models";
import { isFragranceSlug, DISCOVERY_SET_SLUG } from "@/lib/catalog";
import { initialsFrom } from "@/lib/reviews";
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

export interface ReviewPhoto {
  /** the MediaAsset id — carried so the owner's edit form can keep a photo */
  assetId: string;
  url: string;
  width?: number;
  height?: number;
  alt: string;
}

export interface PublicReview {
  id: string;
  authorName: string;
  /** monogram for the avatar placeholder, e.g. "NS" */
  initials: string;
  /** live-joined from the customer's account, or null → show initials */
  avatarUrl: string | null;
  rating: number;
  title: string;
  body: string;
  photos: ReviewPhoto[];
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
  photos: ReviewPhoto[];
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

function reviewPhotos(r: ReviewDoc): ReviewPhoto[] {
  return (r.photos ?? []).map((p) => ({
    assetId: String(p.assetId),
    url: p.url,
    width: p.width,
    height: p.height,
    alt: p.alt || "",
  }));
}

function toPublic(r: ReviewDoc, avatarUrl: string | null): PublicReview {
  return {
    id: String(r._id),
    authorName: r.authorName,
    initials: initialsFrom(r.authorName),
    avatarUrl,
    rating: r.rating,
    title: r.title,
    body: r.body,
    photos: reviewPhotos(r),
    publishedAt: (r.publishedAt ?? r.createdAt).toISOString(),
  };
}

/** avatarUrl by user-id string for a set of reviews. */
async function avatarsFor(rows: ReviewDoc[]): Promise<Map<string, string | null>> {
  const ids = [...new Set(rows.map((r) => String(r.userId)))];
  if (ids.length === 0) return new Map();
  const users = await User.find({ _id: { $in: ids } })
    .select("avatarUrl")
    .lean<Pick<UserDoc, "_id" | "avatarUrl">[]>();
  return new Map(users.map((u) => [String(u._id), u.avatarUrl ?? null]));
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
      const avatars = await avatarsFor(rows);
      return {
        summary: summarise(rows),
        items: rows.map((r) => toPublic(r, avatars.get(String(r.userId)) ?? null)),
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
    const [products, avatars] = await Promise.all([
      Product.find({ slug: { $in: slugs } })
        .select("slug name")
        .lean<Pick<ProductDoc, "slug" | "name">[]>(),
      avatarsFor(rows),
    ]);
    const nameBySlug = new Map(products.map((p) => [p.slug, p.name]));

    return rows.map((r) => ({
      ...toPublic(r, avatars.get(String(r.userId)) ?? null),
      productName: nameBySlug.get(r.productSlug) ?? r.productSlug,
      productSlug: r.productSlug,
      href: hrefForSlug(r.productSlug),
    }));
  },
  ["reviews:featured"],
  { tags: [REVIEWS_TAG], revalidate: REVALIDATE_SECONDS },
);

export interface ShowcasePhoto {
  url: string;
  alt: string;
  /** the product's PDP, when the slug maps to one */
  href: string | null;
}

/**
 * Customer photos from approved reviews, newest first, one per distinct image —
 * the raw material for the homepage "@THERARESKIN" strip. Falls back to nothing
 * when there are none; the caller tops it up with packshots.
 */
export const getReviewShowcasePhotos = unstable_cache(
  async (limit = 12): Promise<ShowcasePhoto[]> => {
    await dbConnect();
    const rows = await Review.find({
      status: "approved",
      "photos.0": { $exists: true },
    })
      .sort({ publishedAt: -1 })
      .limit(limit * 2)
      .select("productSlug photos")
      .lean<Pick<ReviewDoc, "productSlug" | "photos">[]>();

    const seen = new Set<string>();
    const out: ShowcasePhoto[] = [];
    for (const r of rows) {
      for (const p of r.photos ?? []) {
        if (!p.url || seen.has(p.url)) continue;
        seen.add(p.url);
        out.push({
          url: p.url,
          alt: p.alt || "A customer's photo",
          href: hrefForSlug(r.productSlug),
        });
        if (out.length >= limit) return out;
      }
    }
    return out;
  },
  ["reviews:showcase-photos"],
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
    photos: reviewPhotos(r),
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    editable: r.status === "pending",
  }));
}
