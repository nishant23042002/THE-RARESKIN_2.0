import { NextResponse } from "next/server";

import { productReorderInput } from "@/lib/validation/product";
import { requireCatalogueRole } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { reorderProducts, bumpCatalogCache } from "@/server/admin";

/** `POST /api/admin/catalogue/reorder` — set each product's grid position. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireCatalogueRole();
  const parsed = productReorderInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const req = await requestContext();
  const result = await reorderProducts(parsed.data.slugs, ctx, req);
  if (!result.ok) return NextResponse.json(result, { status: 422 });
  bumpCatalogCache(parsed.data.slugs);
  return NextResponse.json(result);
}
