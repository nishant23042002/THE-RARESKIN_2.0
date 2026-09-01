import { NextResponse } from "next/server";

import { sudoConfirmInput } from "@/lib/validation/auth";
import { requireStaff } from "@/server/auth/admin";
import { checkRate, requestContext } from "@/server/auth";
import { confirmSudo } from "@/server/auth/sudo";

/**
 * `POST /api/admin/sudo/confirm` — verify the staff re-auth code and elevate the
 * session (`session.sudoUntil`). On success the client retries the action it was
 * gated on.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireStaff();
  const reqCtx = await requestContext();

  const rate = await checkRate("admin:sudo:user", ctx.user.id);
  if (!rate.success) {
    return NextResponse.json({ ok: false, error: "rate-limited" });
  }

  const parsed = sudoConfirmInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const res = await confirmSudo(ctx, parsed.data.code, reqCtx);
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error ?? "invalid-code" });
  }
  return NextResponse.json({ ok: true, sudoUntil: res.sudoUntil });
}
