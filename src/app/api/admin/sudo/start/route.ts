import { NextResponse } from "next/server";

import { requireStaff } from "@/server/auth/admin";
import { checkRate, requestContext } from "@/server/auth";
import { startSudo } from "@/server/auth/sudo";

/**
 * `POST /api/admin/sudo/start` — send a fresh OTP to the signed-in staff
 * member's own phone so they can elevate the session for a dangerous action.
 * Expected outcomes return 200 `{ ok: false, error }` (see the auth routes).
 */
export const dynamic = "force-dynamic";

export async function POST() {
  const ctx = await requireStaff();
  const reqCtx = await requestContext();

  const rate = await checkRate("admin:sudo:user", ctx.user.id);
  if (!rate.success) {
    return NextResponse.json({ ok: false, error: "rate-limited" });
  }

  const res = await startSudo(ctx, reqCtx);
  if (!res.ok) {
    return NextResponse.json({
      ok: false,
      error: res.error ?? "send-failed",
      retryAfter: res.retryAfter,
    });
  }
  return NextResponse.json({ ok: true, devCode: res.devCode });
}
