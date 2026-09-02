import { NextResponse } from "next/server";

import { productCreateInput } from "@/lib/validation/product";
import { requireCatalogueRole } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { createProduct, bumpCatalogCache } from "@/server/admin";

/** `POST /api/admin/catalogue` — create a product. `catalog_manager`+. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireCatalogueRole();
  const parsed = productCreateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  const result = await createProduct(parsed.data, ctx, req);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  bumpCatalogCache(result.slug);
  return NextResponse.json(result, { status: 201 });
}
