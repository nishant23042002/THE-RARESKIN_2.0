import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import { dbConnect } from "@/server/db";
import { Cart, Product, type CartDoc, type ProductDoc } from "@/server/models";
import { getCurrentUser } from "@/server/auth";
import { toRupees } from "@/lib/money";
import {
  MAX_CART_LINES,
  MAX_LINE_QTY,
  type CartItemInput,
} from "@/lib/validation/commerce";

/**
 * Server cart — persistence + the checkout payload.
 *
 * Identity: a signed-in shopper's cart is keyed by `userId`; a guest's by an
 * opaque token in the `__Host-rrs.cart` cookie. On sign-in the guest cart is
 * folded into the account cart. The storefront's `localStorage` cart stays the
 * fast working bag; it syncs here via `PUT /api/cart`.
 *
 * Never stores a price — items are `{ productId, sku, qty }`, always priced
 * live. `hydrateCart` joins the live catalogue for display.
 */

export const CART_COOKIE = "__Host-rrs.cart";
const CART_TTL_DAYS = 45;

function ttl(): Date {
  return new Date(Date.now() + CART_TTL_DAYS * 86_400_000);
}

async function readToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}

async function writeToken(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: ttl(),
  });
}

// ── item resolution ─────────────────────────────────────────────────────

interface ResolvedItem {
  productId: ProductDoc["_id"];
  sku: string;
  qty: number;
  addedAt: Date;
}

/**
 * Map requested identifiers to catalogue products; drop unknowns, clamp qty.
 *
 * The identifier is normally the inventory SKU, but older storefront carts (and
 * anything that adds by product route) may carry the product *slug* instead —
 * both are accepted and always resolved to the canonical SKU so everything
 * downstream (orders, stock ledger, invoices) is keyed consistently.
 */
async function resolveItems(
  items: CartItemInput[],
): Promise<ResolvedItem[]> {
  const wanted = new Map<string, number>();
  for (const it of items.slice(0, MAX_CART_LINES)) {
    const key = it.sku.trim().toUpperCase();
    if (!key) continue;
    wanted.set(key, Math.min(MAX_LINE_QTY, (wanted.get(key) ?? 0) + it.qty));
  }
  if (wanted.size === 0) return [];

  const keys = [...wanted.keys()];
  const docs = await Product.find({
    $or: [
      { "inventory.sku": { $in: keys } },
      { slug: { $in: keys.map((k) => k.toLowerCase()) } },
    ],
  })
    .select("_id inventory.sku slug")
    .lean<(Pick<ProductDoc, "_id" | "inventory"> & { slug: string })[]>();

  const byKey = new Map<string, Pick<ProductDoc, "_id" | "inventory">>();
  for (const d of docs) {
    byKey.set(d.inventory.sku.toUpperCase(), d);
    byKey.set(d.slug.toUpperCase(), d);
  }

  const now = new Date();
  const out: ResolvedItem[] = [];
  for (const [key, qty] of wanted) {
    const doc = byKey.get(key);
    if (doc) {
      out.push({ productId: doc._id, sku: doc.inventory.sku, qty, addedAt: now });
    }
  }
  return out;
}

function mergeItemLists(
  a: CartDoc["items"],
  b: ResolvedItem[],
): ResolvedItem[] {
  const map = new Map<string, ResolvedItem>();
  for (const it of a) {
    map.set(it.sku, {
      productId: it.productId,
      sku: it.sku,
      qty: it.qty,
      addedAt: it.addedAt,
    });
  }
  for (const it of b) {
    const existing = map.get(it.sku);
    map.set(it.sku, {
      productId: it.productId,
      sku: it.sku,
      qty: Math.min(MAX_LINE_QTY, (existing?.qty ?? 0) + it.qty),
      addedAt: existing?.addedAt ?? it.addedAt,
    });
  }
  return [...map.values()].slice(0, MAX_CART_LINES);
}

// ── read / write (route handlers + server actions only for writes) ──────

/** The current identity's cart, or `null` if none exists yet. Read-only. */
export async function getCart(): Promise<CartDoc | null> {
  await dbConnect();
  const user = await getCurrentUser();
  if (user) {
    const byUser = await Cart.findOne({ userId: user.id }).lean<CartDoc | null>();
    if (byUser) return byUser;
  }
  const token = await readToken();
  if (!token) return null;
  const byToken = await Cart.findById(token).lean<CartDoc | null>();
  // A guest cart that now belongs to someone else is not ours.
  if (byToken && byToken.userId && (!user || String(byToken.userId) !== user.id)) {
    return null;
  }
  return byToken;
}

/**
 * Replace the current identity's cart with `items` (merged, deduped, resolved).
 * Creates the cart + cookie if needed. Call only from a route handler / action.
 */
export async function replaceCartItems(
  items: CartItemInput[],
  opts: { merge?: boolean } = {},
): Promise<CartDoc> {
  await dbConnect();
  const user = await getCurrentUser();
  const resolved = await resolveItems(items);

  let cart =
    (user && (await Cart.findOne({ userId: user.id }))) ||
    (await (async () => {
      const token = await readToken();
      if (!token) return null;
      const byToken = await Cart.findById(token);
      // Ignore a cookie cart that belongs to someone else (a signed-out shopper
      // on a shared machine) — it is not ours to write to.
      if (
        byToken?.userId &&
        (!user || String(byToken.userId) !== user.id)
      ) {
        return null;
      }
      return byToken;
    })());

  if (!cart) {
    const token = randomBytes(24).toString("base64url");
    cart = new Cart({
      _id: token,
      userId: user ? user.id : null,
      items: [],
      expiresAt: ttl(),
    });
    await writeToken(token);
  }

  // Adopt a guest cart on first authed write.
  if (user && !cart.userId) {
    const existingUserCart = await Cart.findOne({ userId: user.id });
    if (existingUserCart && String(existingUserCart._id) !== String(cart._id)) {
      existingUserCart.items = mergeItemLists(existingUserCart.items, resolved);
      existingUserCart.expiresAt = ttl();
      await existingUserCart.save();
      await Cart.deleteOne({ _id: cart._id });
      await writeToken(String(existingUserCart._id));
      return existingUserCart.toObject();
    }
    cart.userId = user.id as unknown as CartDoc["userId"];
  }

  cart.items = opts.merge
    ? mergeItemLists(cart.items, resolved)
    : resolved;
  cart.expiresAt = ttl();
  await cart.save();
  return cart.toObject();
}

/** Fold the guest cookie cart into the account cart after sign-in. */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  await dbConnect();
  const token = await readToken();
  if (!token) return;
  const guest = await Cart.findById(token);
  if (!guest || guest.userId) return;

  const userCart = await Cart.findOne({ userId });
  if (!userCart) {
    guest.userId = userId as unknown as CartDoc["userId"];
    guest.expiresAt = ttl();
    await guest.save();
    return;
  }
  userCart.items = mergeItemLists(
    userCart.items,
    guest.items.map((it) => ({
      productId: it.productId,
      sku: it.sku,
      qty: it.qty,
      addedAt: it.addedAt,
    })),
  );
  userCart.expiresAt = ttl();
  await userCart.save();
  await Cart.deleteOne({ _id: guest._id });
  await writeToken(String(userCart._id));
}

/** Empty the current identity's cart (after a successful order). */
export async function clearCart(): Promise<void> {
  await dbConnect();
  const user = await getCurrentUser();
  const token = await readToken();
  const filter = user ? { userId: user.id } : token ? { _id: token } : null;
  if (!filter) return;
  await Cart.updateOne(filter, {
    $set: { items: [], appliedCoupon: null, appliedCredit: false, expiresAt: ttl() },
  });
}

// ── hydration for display ───────────────────────────────────────────────

export interface HydratedCartLine {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  image: string | null;
  qty: number;
  /** rupees, for display */
  unitPrice: number;
  mrp: number;
  lineTotal: number;
  available: boolean;
  /** units in stock now (null when not tracked) */
  stock: number | null;
  maxQty: number;
}

export interface HydratedCart {
  lines: HydratedCartLine[];
  /** SKUs that were in the cart but no longer sellable — dropped from `lines` */
  removed: string[];
  subtotal: number;
  count: number;
}

/** A real uploaded packshot, or `null` — the UI draws the vector flacon when
 *  there is no photography yet. (No static `/images/*` fallback: those files
 *  don't exist until Cloudinary is wired.) */
function lineImage(doc: ProductDoc): string | null {
  return doc.media?.flat?.url ?? doc.media?.hero?.url ?? null;
}

/**
 * Join a set of `{ sku, qty }` against the live catalogue for display.
 *
 * The identifier may be the inventory SKU or (older carts) the product slug —
 * both resolve, and each line is emitted with the canonical SKU.
 */
export async function hydrateItems(
  items: { sku: string; qty: number }[],
): Promise<HydratedCart> {
  await dbConnect();
  const keys = items
    .map((i) => i.sku.trim().toUpperCase())
    .filter(Boolean);
  if (keys.length === 0) return { lines: [], removed: [], subtotal: 0, count: 0 };

  const docs = await Product.find({
    $or: [
      { "inventory.sku": { $in: keys } },
      { slug: { $in: keys.map((k) => k.toLowerCase()) } },
    ],
  }).lean<ProductDoc[]>();
  const byKey = new Map<string, ProductDoc>();
  for (const d of docs) {
    byKey.set(d.inventory.sku.toUpperCase(), d);
    byKey.set(d.slug.toUpperCase(), d);
  }

  const lines: HydratedCartLine[] = [];
  const removed: string[] = [];
  for (const it of items) {
    const key = it.sku.trim().toUpperCase();
    const doc = byKey.get(key);
    const sku = doc?.inventory.sku ?? key;
    const sellable =
      doc &&
      doc.status === "active" &&
      (!doc.inventory.trackInventory ||
        doc.inventory.allowBackorder ||
        doc.inventory.stock > 0);
    if (!doc || !sellable) {
      removed.push(sku);
      continue;
    }
    const tracked = doc.inventory.trackInventory && !doc.inventory.allowBackorder;
    const maxQty = tracked
      ? Math.min(MAX_LINE_QTY, doc.inventory.stock)
      : MAX_LINE_QTY;
    const qty = Math.max(1, Math.min(it.qty, maxQty));
    const unitPrice = toRupees(doc.pricing.price);
    lines.push({
      productId: String(doc._id),
      slug: doc.slug,
      name: doc.name,
      sku,
      image: lineImage(doc),
      qty,
      unitPrice,
      mrp: toRupees(doc.pricing.mrp),
      lineTotal: unitPrice * qty,
      available: true,
      stock: tracked ? doc.inventory.stock : null,
      maxQty,
    });
  }

  return {
    lines,
    removed,
    subtotal: lines.reduce((s, l) => s + l.lineTotal, 0),
    count: lines.reduce((s, l) => s + l.qty, 0),
  };
}

/** Hydrate the current identity's server cart. */
export async function hydrateCart(): Promise<HydratedCart> {
  const cart = await getCart();
  if (!cart) return { lines: [], removed: [], subtotal: 0, count: 0 };
  return hydrateItems(cart.items.map((it) => ({ sku: it.sku, qty: it.qty })));
}
