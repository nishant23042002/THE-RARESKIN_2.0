/**
 * Product review validation.
 *
 * Isomorphic — the `/account/reviews` form and the `/api/account/reviews`
 * handlers parse against the same schemas. A review is only ever submitted by a
 * signed-in user against an order that is already `delivered`; the server
 * re-checks that (see `@/server/reviews/submit`).
 */
import { z } from "zod";

import { objectIdString, shortText } from "./primitives";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_TITLE_MAX = 80;
export const REVIEW_BODY_MAX = 2000;

/** What the customer fills in. `orderNumber` + `sku` prove the purchase. */
export const reviewSubmitInput = z.object({
  orderNumber: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  rating: z.number().int().min(1).max(5),
  title: shortText(REVIEW_TITLE_MAX),
  body: shortText(REVIEW_BODY_MAX),
});
export type ReviewSubmitInput = z.infer<typeof reviewSubmitInput>;

/** Editing an own review while it's still `pending` — content only. */
export const reviewEditInput = z.object({
  rating: z.number().int().min(1).max(5),
  title: shortText(REVIEW_TITLE_MAX),
  body: shortText(REVIEW_BODY_MAX),
});
export type ReviewEditInput = z.infer<typeof reviewEditInput>;

/** Staff decision in `/admin/reviews`. */
export const reviewModerateInput = z.object({
  action: z.enum(["approve", "reject"]),
  note: shortText(300).optional(),
});
export type ReviewModerateInput = z.infer<typeof reviewModerateInput>;

/** `id` of a review in a route param. */
export const reviewIdParam = objectIdString;
