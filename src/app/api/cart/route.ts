import { NextResponse } from "next/server";

import { cartItemsInput } from "@/lib/validation/commerce";
import {
  getCart,
  hydrateCart,
  replaceCartItems,
} from "@/server/data/cart";

/**
 * Server cart sync. The storefront's `localStorage` bag stays the fast working
 * cart; it POSTs its lines here so the bag persists across devices for a
 * signed-in shopper and so checkout has a server-side source of truth.
 *
 *   GET  → the current identity's cart, hydrated against the live catalogue
 *   PUT  → replace the cart with `{ items: [{ sku, qty }] }` (merge with `?merge=1`)
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const [cart, hydrated] = await Promise.all([getCart(), hydrateCart()]);
  return NextResponse.json({
    ok: true,
    appliedCoupon: cart?.appliedCoupon ?? null,
    appliedCredit: cart?.appliedCredit ?? false,
    ...hydrated,
  });
}

export async function PUT(request: Request) {
  const url = new URL(request.url);
  const merge = url.searchParams.get("merge") === "1";

  const parsed = cartItemsInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  await replaceCartItems(parsed.data.items, { merge });
  const hydrated = await hydrateCart();
  return NextResponse.json({ ok: true, ...hydrated });
}
