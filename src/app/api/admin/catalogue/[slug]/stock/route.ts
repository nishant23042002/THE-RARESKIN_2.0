import { NextResponse } from "next/server";

import { stockAdjustmentBody } from "@/lib/validation/product";
import { requireCatalogueRole } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { adjustProductStock, bumpCatalogCache } from "@/server/admin";

/**
 * `POST /api/admin/catalogue/<slug>/stock` — a ledgered stock adjustment.
 * Whoever can manage the catalogue can restock it (`catalog_manager` or
 * `operations`+). Bumps the catalogue cache so a level crossing the 0/nonzero
 * boundary flips the storefront `available` flag on the next request.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctxArg: { params: Promise<{ slug: string }> },
) {
  const ctx = await requireCatalogueRole();
  const { slug } = await ctxArg.params;

  const parsed = stockAdjustmentBody.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 6) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  const result = await adjustProductStock(slug, parsed.data, ctx, req);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error === "not-found" ? 404 : 422,
    });
  }
  bumpCatalogCache(slug);
  return NextResponse.json(result);
}
