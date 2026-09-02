import { NextResponse } from "next/server";

import {
  couponUpdateInput,
  couponActionInput,
} from "@/lib/validation/commerce";
import { requireAdminRole } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { updateCoupon, setCouponStatus } from "@/server/admin";

/**
 * `PATCH /api/admin/coupons/<code>` — edit a coupon (partial; `code` immutable).
 * `POST  /api/admin/coupons/<code>` — `{ action: "status", status }`.
 * `admin`+.
 */
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  ctxArg: { params: Promise<{ code: string }> },
) {
  const ctx = await requireAdminRole("admin");
  const { code } = await ctxArg.params;

  const parsed = couponUpdateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  const result = await updateCoupon(decodeURIComponent(code), parsed.data, ctx, req);
  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error === "not-found" ? 404 : 422,
    });
  }
  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  ctxArg: { params: Promise<{ code: string }> },
) {
  const ctx = await requireAdminRole("admin");
  const { code } = await ctxArg.params;

  const parsed = couponActionInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const req = await requestContext();
  const result = await setCouponStatus(
    decodeURIComponent(code),
    parsed.data.status,
    ctx,
    req,
  );
  if (!result.ok) {
    return NextResponse.json(result, {
      status: result.error === "not-found" ? 404 : 422,
    });
  }
  return NextResponse.json(result);
}
