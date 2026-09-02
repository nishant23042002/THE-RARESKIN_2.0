import "server-only";

import { dbConnect } from "@/server/db";
import { Product, type ProductDoc } from "@/server/models";

import { notifyLowStock } from "./notify";

/**
 * After a stock commit, raise a `low_stock` notification for any line that just
 * crossed at or below its threshold. "Just crossed" = the pre-commit level
 * (`stock + qty`) was above it — so a product that's been sitting low doesn't
 * re-alert on every sale (the day-scoped dedupe key is a second guard).
 */
export async function checkLowStockForOrder(
  lines: { slug?: string; sku?: string; productId?: unknown; qty: number }[],
): Promise<void> {
  try {
    if (lines.length === 0) return;
    await dbConnect();

    const ids = lines
      .map((l) => l.productId)
      .filter((v): v is string => Boolean(v))
      .map(String);
    const slugs = lines
      .map((l) => l.slug)
      .filter((v): v is string => Boolean(v));

    const docs = await Product.find(
      ids.length
        ? { _id: { $in: ids } }
        : { slug: { $in: slugs } },
    )
      .select("slug name inventory")
      .lean<Pick<ProductDoc, "_id" | "slug" | "name" | "inventory">[]>();

    for (const doc of docs) {
      const inv = doc.inventory;
      if (!inv?.trackInventory) continue;
      const threshold = inv.lowStockThreshold ?? 0;
      const line = lines.find(
        (l) =>
          (l.productId && String(l.productId) === String(doc._id)) ||
          l.slug === doc.slug ||
          l.sku === inv.sku,
      );
      const qty = line?.qty ?? 0;
      const crossedNow =
        inv.stock <= threshold && inv.stock + qty > threshold;
      if (crossedNow) {
        await notifyLowStock({
          slug: doc.slug,
          name: doc.name,
          stock: inv.stock,
          threshold,
        });
      }
    }
  } catch (err) {
    console.error("[notify] checkLowStockForOrder failed", err);
  }
}
