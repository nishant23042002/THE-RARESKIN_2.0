import { NextResponse } from "next/server";

import { couponInput } from "@/lib/validation/commerce";
import { requireAdminRole } from "@/server/auth/admin";
import { requestContext } from "@/server/auth";
import { createCoupon } from "@/server/admin";

/** `POST /api/admin/coupons` — create a coupon. `admin`+. */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireAdminRole("admin");
  const parsed = couponInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 8) },
      { status: 400 },
    );
  }

  const req = await requestContext();
  const result = await createCoupon(parsed.data, ctx, req);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }
  return NextResponse.json(result, { status: 201 });
}
