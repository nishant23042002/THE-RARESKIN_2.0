import "server-only";

import { Types } from "mongoose";
import { revalidateTag } from "next/cache";

import { dbConnect } from "@/server/db";
import { Product, recordAudit } from "@/server/models";
import { adjustStock } from "@/server/commerce/inventory";
import { isFragranceSlug, DISCOVERY_SET_SLUG } from "@/lib/catalog";
import type { AuthContext } from "@/server/auth/session";
import type {
  ProductCreateInput,
  ProductStatus,
  ProductUpdateInput,
  StockAdjustmentInput,
} from "@/lib/validation/product";

/**
 * Catalogue mutations. Each records an audit row and returns the affected
 * slug(s); the route handler calls `bumpCatalogCache` so the storefront picks
 * the change up on its next request.
 */

export type CatalogActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

interface Req {
  ip: string | null;
  userAgent: string | null;
}

/** Invalidate the storefront catalogue cache for one product (+ the whole list). */
export function bumpCatalogCache(slug?: string | string[]): void {
  revalidateTag("catalog", { expire: 0 });
  const slugs = Array.isArray(slug) ? slug : slug ? [slug] : [];
  for (const s of slugs) revalidateTag(`product:${s}`, { expire: 0 });
}

// ── flatten a partial update to dot-paths so a nested `$set` never nukes a
//    sibling (e.g. `inventory.stock` must not drop `inventory.sku`) ─────────
function toDotSet(
  input: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    const isPlainObject =
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      !("url" in (v as object)); // a mediaRef — set the whole subdoc
    if (isPlainObject) {
      Object.assign(out, toDotSet(v as Record<string, unknown>, path));
    } else {
      out[path] = v;
    }
  }
  return out;
}

// ── create ─────────────────────────────────────────────────────────────

/**
 * The storefront is hardwired to exactly three fragrance slugs + one set slug
 * (`FRAGRANCE_SLUGS` / `DISCOVERY_SET_SLUG` in `src/lib/catalog.ts`, plus
 * `FRAGRANCE_PALETTE` for the vector art). A product created with an unknown
 * slug is a valid DB record and fully editable in the admin, but won't render
 * on the shopper-facing site until a developer registers it there.
 */
function storefrontKnowsSlug(kind: string, slug: string): boolean {
  if (kind === "set") return slug === DISCOVERY_SET_SLUG;
  return isFragranceSlug(slug);
}

export async function createProduct(
  input: ProductCreateInput,
  ctx: AuthContext,
  req: Req,
): Promise<CatalogActionResult<{ slug: string; warning?: string }>> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);

  const clash = await Product.findOne({
    $or: [{ slug: input.slug }, { "inventory.sku": input.inventory.sku }],
  })
    .select("slug")
    .lean();
  if (clash) return { ok: false, error: "slug-or-sku-taken" };

  try {
    const doc = await Product.create({
      ...input,
      createdBy: actor,
      updatedBy: actor,
    });
    await recordAudit({
      actorId: actor,
      actorRole: ctx.user.role,
      action: "product.create",
      targetType: "Product",
      targetId: doc.slug,
      after: { slug: doc.slug, kind: doc.kind, status: doc.status },
      ip: req.ip,
      userAgent: req.userAgent,
    });
    const warning = storefrontKnowsSlug(doc.kind, doc.slug)
      ? undefined
      : `The storefront doesn't know the slug "${doc.slug}" yet — it'll show in the admin but won't render on the shopper-facing site until a developer adds it to src/lib/catalog.ts.`;
    return { ok: true, slug: doc.slug, warning };
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      return { ok: false, error: "slug-or-sku-taken" };
    }
    throw e;
  }
}

// ── update ─────────────────────────────────────────────────────────────

export async function updateProduct(
  slug: string,
  input: ProductUpdateInput,
  ctx: AuthContext,
  req: Req,
): Promise<CatalogActionResult<{ slug: string }>> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);

  const before = (await Product.findOne({ slug }).lean()) as
    | Record<string, unknown>
    | null;
  if (!before) return { ok: false, error: "not-found" };

  const set = toDotSet(input as Record<string, unknown>);
  if (Object.keys(set).length === 0) return { ok: false, error: "empty" };
  set.updatedBy = actor;

  try {
    await Product.updateOne({ slug }, { $set: set });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) {
      return { ok: false, error: "sku-taken" };
    }
    throw e;
  }

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "product.update",
    targetType: "Product",
    targetId: slug,
    before: pick(before, Object.keys(input)),
    after: input as Record<string, unknown>,
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, slug };
}

function pick(
  obj: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}

// ── status ─────────────────────────────────────────────────────────────

export async function setProductStatus(
  slug: string,
  status: ProductStatus,
  ctx: AuthContext,
  req: Req,
): Promise<CatalogActionResult<{ slug: string }>> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);
  const res = await Product.findOneAndUpdate(
    { slug },
    { $set: { status, updatedBy: actor } },
    { new: false },
  )
    .select("status")
    .lean<{ status: string } | null>();
  if (!res) return { ok: false, error: "not-found" };

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "product.status_change",
    targetType: "Product",
    targetId: slug,
    before: { status: res.status },
    after: { status },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, slug };
}

// ── stock ──────────────────────────────────────────────────────────────

export async function adjustProductStock(
  slug: string,
  input: Omit<StockAdjustmentInput, "productId">,
  ctx: AuthContext,
  req: Req,
): Promise<CatalogActionResult<{ balanceAfter: number }>> {
  await dbConnect();
  const product = await Product.findOne({ slug }).select("_id").lean<{
    _id: Types.ObjectId;
  } | null>();
  if (!product) return { ok: false, error: "not-found" };

  const res = await adjustStock({
    productId: product._id,
    delta: input.delta,
    reason: input.reason,
    note: input.note ?? null,
    actorId: ctx.user.id,
  });
  if (!res.ok) return { ok: false, error: res.error };

  await recordAudit({
    actorId: new Types.ObjectId(ctx.user.id),
    actorRole: ctx.user.role,
    action: "stock.adjust",
    targetType: "Product",
    targetId: slug,
    after: {
      delta: input.delta,
      reason: input.reason,
      balanceAfter: res.balanceAfter,
      note: input.note ?? null,
    },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, balanceAfter: res.balanceAfter };
}

// ── reorder ────────────────────────────────────────────────────────────

export async function reorderProducts(
  slugs: string[],
  ctx: AuthContext,
  req: Req,
): Promise<CatalogActionResult> {
  await dbConnect();
  const actor = new Types.ObjectId(ctx.user.id);
  await Product.bulkWrite(
    slugs.map((slug, i) => ({
      updateOne: { filter: { slug }, update: { $set: { order: i, updatedBy: actor } } },
    })),
  );
  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "product.reorder",
    targetType: "Product",
    targetId: null,
    after: { order: slugs },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true };
}

// ── duplicate ──────────────────────────────────────────────────────────

const DUP_BLOCKLIST = new Set([
  "_id",
  "__v",
  "id",
  "slug",
  "status",
  "inventory",
  "media",
  "ratings",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
]);

export async function duplicateProduct(
  slug: string,
  ctx: AuthContext,
  req: Req,
): Promise<CatalogActionResult<{ slug: string }>> {
  await dbConnect();
  const raw = await Product.findOne({ slug }).lean();
  if (!raw) return { ok: false, error: "not-found" };
  const src = raw as unknown as Record<string, unknown> & {
    inventory: { sku: string; lowStockThreshold: number };
  };
  const actor = new Types.ObjectId(ctx.user.id);

  const carried: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (!DUP_BLOCKLIST.has(k)) carried[k] = v;
  }

  let newSlug = `${slug}-copy`;
  let n = 2;
  while (await Product.exists({ slug: newSlug })) newSlug = `${slug}-copy-${n++}`;

  const doc = await Product.create({
    ...carried,
    slug: newSlug,
    status: "draft",
    inventory: {
      sku: `${src.inventory.sku}-COPY`,
      stock: 0,
      lowStockThreshold: src.inventory.lowStockThreshold,
      trackInventory: true,
      allowBackorder: false,
    },
    media: { gallery: [] },
    seo: {},
    ratings: { average: 0, count: 0 },
    createdBy: actor,
    updatedBy: actor,
  });

  await recordAudit({
    actorId: actor,
    actorRole: ctx.user.role,
    action: "product.duplicate",
    targetType: "Product",
    targetId: doc.slug,
    after: { from: slug, to: doc.slug },
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true, slug: doc.slug };
}
