import "server-only";

import { revalidateTag } from "next/cache";
import { Types } from "mongoose";

import { dbConnect } from "@/server/db";
import { Review, recordAudit } from "@/server/models";
import { recomputeProductRating } from "@/server/reviews/rating";
import type { AuthContext } from "@/server/auth/session";
import type { ReviewModerateInput } from "@/lib/validation/review";

/**
 * Review moderation. Approving or rejecting recomputes the product's
 * denormalised `ratings` from the `approved` set and busts the storefront cache
 * tags so the PDP + homepage refresh.
 */

export type ReviewActionResult =
  | { ok: true; status: "approved" | "rejected" }
  | { ok: false; error: "not-found" | "noop" };

interface Req {
  ip: string | null;
  userAgent: string | null;
}

export async function moderateReview(
  id: string,
  input: ReviewModerateInput,
  ctx: AuthContext,
  req: Req,
): Promise<ReviewActionResult> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);

  const review = await Review.findById(id);
  if (!review) return { ok: false, error: "not-found" };

  const nextStatus = input.action === "approve" ? "approved" : "rejected";
  if (review.status === nextStatus) return { ok: false, error: "noop" };

  const prevStatus = review.status;
  review.status = nextStatus;
  review.moderation = {
    byId: actor,
    at: new Date(),
    note: input.note ?? "",
  };
  review.publishedAt = nextStatus === "approved" ? new Date() : null;
  await review.save();

  const rating = await recomputeProductRating(String(review.productId));

  revalidateTag("reviews", { expire: 0 });
  revalidateTag(`reviews:${review.productSlug}`, { expire: 0 });
  revalidateTag("catalog", { expire: 0 });
  revalidateTag(`product:${review.productSlug}`, { expire: 0 });

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: input.action === "approve" ? "review.approve" : "review.reject",
    targetType: "Review",
    targetId: id,
    before: { status: prevStatus },
    after: {
      status: nextStatus,
      note: input.note ?? "",
      productRating: rating,
    },
    ip: req.ip,
    userAgent: req.userAgent,
  });

  return { ok: true, status: nextStatus };
}
