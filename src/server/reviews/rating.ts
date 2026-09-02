import "server-only";

import { dbConnect } from "@/server/db";
import { Product, Review } from "@/server/models";

/**
 * Recompute a product's denormalised `ratings { average, count }` from its
 * currently-`approved` reviews. Called after every moderation decision. The
 * average is rounded to one decimal place so the stored value matches what the
 * storefront prints.
 */
export async function recomputeProductRating(
  productId: string,
): Promise<{ average: number; count: number }> {
  await dbConnect();

  const rows = await Review.find({
    productId,
    status: "approved",
  })
    .select("rating")
    .lean<{ rating: number }[]>();

  const count = rows.length;
  const average =
    count > 0
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;

  await Product.updateOne(
    { _id: productId },
    { $set: { "ratings.average": average, "ratings.count": count } },
  );

  return { average, count };
}
