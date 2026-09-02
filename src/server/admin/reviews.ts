import "server-only";

import { dbConnect } from "@/server/db";
import {
  Product,
  Review,
  User,
  type ProductDoc,
  type ReviewDoc,
  type UserDoc,
} from "@/server/models";
import { maskPhone } from "@/lib/auth";
import type { ReviewStatus } from "@/lib/validation/review";

/**
 * Review reads for `/admin/reviews`. Not cached — a moderator always needs the
 * current queue.
 */

export interface AdminReviewRow {
  id: string;
  status: ReviewStatus;
  rating: number;
  title: string;
  body: string;
  authorName: string;
  productName: string;
  productSlug: string;
  orderNumber: string;
  customer: { name: string; contact: string } | null;
  createdAt: string;
  publishedAt: string | null;
  moderatedNote: string;
}

export interface AdminReviewList {
  rows: AdminReviewRow[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  counts: { pending: number; approved: number; rejected: number };
}

export interface ListReviewsParams {
  status?: ReviewStatus | "all";
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listReviews(
  params: ListReviewsParams = {},
): Promise<AdminReviewList> {
  await dbConnect();
  const pageSize = Math.min(Math.max(params.pageSize ?? 25, 1), 100);
  const page = Math.max(params.page ?? 1, 1);

  const filter: Record<string, unknown> = {};
  if (params.status && params.status !== "all") filter.status = params.status;

  const q = params.q?.trim();
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { productSlug: rx },
      { authorName: rx },
      { orderNumber: rx },
      { title: rx },
    ];
  }

  const [total, docs, pending, approved, rejected] = await Promise.all([
    Review.countDocuments(filter),
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<ReviewDoc[]>(),
    Review.countDocuments({ status: "pending" }),
    Review.countDocuments({ status: "approved" }),
    Review.countDocuments({ status: "rejected" }),
  ]);

  const slugs = [...new Set(docs.map((d) => d.productSlug))];
  const userIds = [...new Set(docs.map((d) => String(d.userId)))];
  const [products, users] = await Promise.all([
    Product.find({ slug: { $in: slugs } })
      .select("slug name")
      .lean<Pick<ProductDoc, "slug" | "name">[]>(),
    User.find({ _id: { $in: userIds } })
      .select("name email phone")
      .lean<Pick<UserDoc, "_id" | "name" | "email" | "phone">[]>(),
  ]);
  const nameBySlug = new Map(products.map((p) => [p.slug, p.name]));
  const userById = new Map(users.map((u) => [String(u._id), u]));

  return {
    rows: docs.map((d) => {
      const u = userById.get(String(d.userId));
      return {
        id: String(d._id),
        status: d.status,
        rating: d.rating,
        title: d.title,
        body: d.body,
        authorName: d.authorName,
        productName: nameBySlug.get(d.productSlug) ?? d.productSlug,
        productSlug: d.productSlug,
        orderNumber: d.orderNumber,
        customer: u
          ? {
              name: u.name || "—",
              contact: u.email || (u.phone ? maskPhone(u.phone) : "—"),
            }
          : null,
        createdAt: d.createdAt.toISOString(),
        publishedAt: d.publishedAt ? d.publishedAt.toISOString() : null,
        moderatedNote: d.moderation?.note ?? "",
      };
    }),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    pageSize,
    counts: { pending, approved, rejected },
  };
}
