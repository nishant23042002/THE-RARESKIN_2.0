import "server-only";

import { dbConnect } from "@/server/db";
import { Order, Review, type OrderDoc } from "@/server/models";
import { notifyReviewSubmitted } from "@/server/notifications";
import { firstNameLastInitial } from "@/lib/reviews";
import type {
  ReviewEditInput,
  ReviewSubmitInput,
} from "@/lib/validation/review";

/**
 * Customer-side review mutations. A review can only be created against an order
 * the user owns that is already `delivered` and actually contains the reviewed
 * `sku`; the unique `(userId, productId)` index is the backstop against a second
 * review for the same product.
 */

export type SubmitResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error:
        | "order-not-found"
        | "not-delivered"
        | "item-not-in-order"
        | "already-reviewed";
    };

export async function submitReview(
  input: ReviewSubmitInput,
  userId: string,
  userName: string | null,
): Promise<SubmitResult> {
  await dbConnect();

  const order = await Order.findOne({
    userId,
    orderNumber: input.orderNumber,
  }).lean<OrderDoc | null>();

  if (!order) return { ok: false, error: "order-not-found" };
  if (order.status !== "delivered") return { ok: false, error: "not-delivered" };

  const item = order.items.find((i) => i.sku === input.sku);
  if (!item) return { ok: false, error: "item-not-in-order" };

  try {
    const authorName = firstNameLastInitial(userName);
    const doc = await Review.create({
      userId,
      productId: item.productId,
      productSlug: item.slug,
      orderId: order._id,
      orderNumber: order.orderNumber,
      sku: item.sku,
      rating: input.rating,
      title: input.title,
      body: input.body,
      authorName,
      status: "pending",
    });
    await notifyReviewSubmitted({
      reviewId: String(doc._id),
      productName: item.name,
      authorName,
      rating: input.rating,
    });
    return { ok: true, id: String(doc._id) };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      (err as { code?: number }).code === 11000
    ) {
      return { ok: false, error: "already-reviewed" };
    }
    throw err;
  }
}

export type EditResult =
  | { ok: true }
  | { ok: false; error: "not-found" | "not-editable" };

export async function editReview(
  id: string,
  input: ReviewEditInput,
  userId: string,
): Promise<EditResult> {
  await dbConnect();

  const review = await Review.findOne({ _id: id, userId });
  if (!review) return { ok: false, error: "not-found" };
  if (review.status !== "pending") return { ok: false, error: "not-editable" };

  review.rating = input.rating;
  review.title = input.title;
  review.body = input.body;
  review.editedAt = new Date();
  await review.save();

  return { ok: true };
}
