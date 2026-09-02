import "server-only";

import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import {
  MediaAsset,
  Order,
  Review,
  type OrderDoc,
} from "@/server/models";
import { notifyReviewSubmitted } from "@/server/notifications";
import { firstNameLastInitial } from "@/lib/reviews";
import type { MediaRef } from "@/lib/validation/media";
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

/** Keep only photo refs that are real `reviews/` assets this user uploaded, and
 *  return them with the stored dimensions. */
async function ownPhotos(
  photos: MediaRef[],
  userId: string,
): Promise<{ assetId: Types.ObjectId; url: string; alt: string; width?: number; height?: number }[]> {
  if (photos.length === 0) return [];
  const ids = photos.map((p) => p.assetId);
  const assets = await MediaAsset.find({
    _id: { $in: ids },
    folder: "reviews",
    uploadedBy: userId,
  })
    .select("_id secureUrl width height alt")
    .lean<
      { _id: Types.ObjectId; secureUrl: string; width: number; height: number; alt: string }[]
    >();
  const byId = new Map(assets.map((a) => [String(a._id), a]));
  return photos
    .map((p) => byId.get(p.assetId))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .map((a) => ({
      assetId: a._id,
      url: a.secureUrl,
      alt: a.alt ?? "",
      width: a.width,
      height: a.height,
    }));
}

async function tagAssets(
  assetIds: Types.ObjectId[],
  reviewId: string,
): Promise<void> {
  if (assetIds.length === 0) return;
  await MediaAsset.updateMany(
    { _id: { $in: assetIds } },
    { $addToSet: { usedIn: `review:${reviewId}` } },
  );
}

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

  const photos = await ownPhotos(input.photos, userId);

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
      photos,
      authorName,
      status: "pending",
    });
    await tagAssets(
      photos.map((p) => p.assetId),
      String(doc._id),
    );
    await notifyReviewSubmitted({
      reviewId: String(doc._id),
      productName: item.name,
      authorName,
      rating: input.rating,
      photoCount: photos.length,
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

  const photos = await ownPhotos(input.photos, userId);
  const prevIds = new Set(review.photos.map((p) => String(p.assetId)));
  const nextIds = new Set(photos.map((p) => String(p.assetId)));

  review.rating = input.rating;
  review.title = input.title;
  review.body = input.body;
  review.photos = photos;
  review.editedAt = new Date();
  await review.save();

  // untag assets dropped from the review, tag the new ones
  const dropped = [...prevIds].filter((x) => !nextIds.has(x));
  if (dropped.length) {
    await MediaAsset.updateMany(
      { _id: { $in: dropped.map((x) => new Types.ObjectId(x)) } },
      { $pull: { usedIn: `review:${id}` } },
    );
  }
  await tagAssets(
    photos.map((p) => p.assetId),
    id,
  );

  return { ok: true };
}
