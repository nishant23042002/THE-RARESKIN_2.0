import { NextResponse } from "next/server";

import { otpVerifyInput } from "@/lib/validation/auth";
import { normalizeIndianMobile } from "@/lib/auth";
import { recordAudit } from "@/server/models";
import {
  checkOtp,
  checkRate,
  createSession,
  requestContext,
  upsertVerifiedUser,
} from "@/server/auth";

/**
 * Finish a login: check the code, get-or-create the account, mint a session.
 *
 * Expected user-facing outcomes (wrong code, expired code, rate-limited) return
 * **200** with `{ ok: false, error }` — they aren't request errors, and a 4xx
 * here would just spam the browser console. Non-2xx is reserved for a malformed
 * request or an actual server/provider failure.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = otpVerifyInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const phone = normalizeIndianMobile(parsed.data.phone);
  if (!phone) {
    return NextResponse.json({ ok: false, error: "invalid-phone" });
  }

  const ctx = await requestContext();
  const ipKey = ctx.ip ?? "unknown";

  const [byIp, byPhone] = await Promise.all([
    checkRate("otp:verify:ip", ipKey),
    checkRate("otp:verify:phone", phone),
  ]);
  if (!byIp.success || !byPhone.success) {
    return NextResponse.json({ ok: false, error: "rate-limited" });
  }

  const check = await checkOtp(phone, parsed.data.code);
  if (!check.ok) {
    if (check.error === "check-failed") {
      return NextResponse.json(
        { ok: false, error: "provider-error" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: false,
      error: check.error ?? "invalid-code",
      burned: check.burned ?? false,
    });
  }

  const { user, created } = await upsertVerifiedUser(phone, ctx);
  const session = await createSession(user, ctx);

  await recordAudit({
    actorId: user._id,
    actorRole: user.role,
    action: created ? "auth.first_login" : "auth.login",
    targetType: "User",
    targetId: String(user._id),
    after: { sessionId: session._id.slice(0, 8), device: session.device },
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return NextResponse.json({
    ok: true,
    created,
    user: {
      id: String(user._id),
      phone: user.phone,
      name: user.name,
      email: user.email,
      role: user.role,
      isStaff: user.role !== "customer",
    },
  });
}
