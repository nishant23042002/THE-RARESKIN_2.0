import { NextResponse } from "next/server";

import { productUpdateInput, productActionInput } from "@/lib/validation/product";
import { requireCatalogueRole, SudoRequiredError } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import {
  updateProduct,
  setProductStatus,
  duplicateProduct,
  deleteProduct,
  bumpCatalogCache,
} from "@/server/admin";

/**
 * `PATCH /api/admin/catalogue/<slug>` — edit a product (partial).
 * `POST  /api/admin/catalogue/<slug>` — `{ action: "status" | "duplicate" }`.
 * `catalog_manager`+.
 */
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctxArg: { params: Promise<{ slug: string }> },
) {
  const ctx = await requireCatalogueRole();
  const { slug } = await ctxArg.params;

  const parsed = productUpdateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  const result = await updateProduct(slug, parsed.data, ctx, req);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error === "not-found" ? 404 : 422,
    });
  }
  bumpCatalogCache(slug);
  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  ctxArg: { params: Promise<{ slug: string }> },
) {
  const ctx = await requireCatalogueRole();
  const { slug } = await ctxArg.params;

  const parsed = productActionInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const req = await requestContext();

  try {
    const result =
      parsed.data.action === "status"
        ? await setProductStatus(slug, parsed.data.status, ctx, req)
        : parsed.data.action === "duplicate"
          ? await duplicateProduct(slug, ctx, req)
          : await deleteProduct(slug, ctx, req);

    if (!result.ok) {
      return NextResponse.json(result, {
        status: result.error === "not-found" ? 404 : 422,
      });
    }
    bumpCatalogCache(
      parsed.data.action === "duplicate" ? [slug, result.slug] : slug,
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SudoRequiredError) {
      return NextResponse.json(
        { ok: false, error: "sudo-required" },
        { status: 409 },
      );
    }
    throw err;
  }
}
