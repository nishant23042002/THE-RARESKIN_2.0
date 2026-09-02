import { Schema, model, models, type Model, type Types } from "mongoose";

import { REVIEW_STATUSES } from "@/lib/validation/review";

/**
 * A product review from a verified buyer.
 *
 * Only created for a product the `userId` has actually received (an order in
 * `delivered` status containing the `sku`). Everything needed to show or audit
 * the review is **snapshotted** — `authorName` (so an account rename never
 * rewrites published reviews), `orderNumber`, `productSlug` — the same principle
 * as the order document.
 *
 * Lifecycle: `pending` → staff moderates in `/admin/reviews` → `approved`
 * (public) or `rejected` (hidden). `Product.ratings` is recomputed from the
 * `approved` set on every moderation.
 */
export interface ReviewDoc {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  productId: Types.ObjectId;
  productSlug: string;
  orderId: Types.ObjectId;
  orderNumber: string;
  sku: string;
  rating: number;
  title: string;
  body: string;
  /** "Nishant S." — computed at submit, never rewritten */
  authorName: string;
  status: (typeof REVIEW_STATUSES)[number];
  moderation: {
    byId: Types.ObjectId | null;
    at: Date | null;
    note: string;
  };
  publishedAt: Date | null;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<ReviewDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productSlug: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    orderNumber: { type: String, required: true },
    sku: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    body: { type: String, required: true },
    authorName: { type: String, required: true },
    status: { type: String, enum: REVIEW_STATUSES, default: "pending" },
    moderation: {
      byId: { type: Schema.Types.ObjectId, ref: "User", default: null },
      at: { type: Date, default: null },
      note: { type: String, default: "" },
    },
    publishedAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false },
);

// Storefront list — approved reviews for a product, newest first.
reviewSchema.index(
  { productSlug: 1, status: 1, publishedAt: -1 },
  { name: "product_status_published" },
);
// Moderation queue.
reviewSchema.index({ status: 1, createdAt: -1 }, { name: "status_created" });
// "Your reviews" on the account page.
reviewSchema.index({ userId: 1, createdAt: -1 }, { name: "user_created" });
// One review per customer per product (editable while pending).
reviewSchema.index(
  { userId: 1, productId: 1 },
  { name: "user_product_unique", unique: true },
);

export const Review: Model<ReviewDoc> =
  (models.Review as Model<ReviewDoc>) ??
  model<ReviewDoc>("Review", reviewSchema);
