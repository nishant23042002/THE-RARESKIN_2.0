import { NextResponse } from "next/server";

import { otpStartInput } from "@/lib/validation/auth";
import { normalizeIndianMobile } from "@/lib/auth";
import { isProduction } from "@/server/env";
import {
  checkRate,
  isTurnstileConfigured,
  requestContext,
  sendOtp,
  verifyTurnstile,
} from "@/server/auth";

/**
 * Start a login: normalise the phone, throttle, (optionally) check Turnstile,
 * and send a code. The response is identical whether or not an account exists
 * (no enumeration). Expected outcomes (bad number, rate-limited, failed bot
 * check) return **200** with `{ ok: false, error }` so they don't spam the
 * browser console; non-2xx is only for a malformed request or a provider
 * failure.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = otpStartInput.safeParse(await request.json().catch(() => null));
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
    checkRate("otp:start:ip", ipKey),
    checkRate("otp:start:phone", phone),
  ]);
  if (!byIp.success || !byPhone.success) {
    const retryAfter = Math.max(
      1,
      Math.ceil((Math.min(byIp.reset, byPhone.reset) - Date.now()) / 1000),
    );
    return NextResponse.json({ ok: false, error: "rate-limited", retryAfter });
  }

  if (isTurnstileConfigured()) {
    const check = await verifyTurnstile(parsed.data.turnstileToken, ctx.ip);
    if (!check.ok) {
      return NextResponse.json({ ok: false, error: "challenge-failed" });
    }
  }

  const result = await sendOtp(phone, ctx);
  if (!result.ok) {
    const err = result.error ?? "send-failed";
    // expected outcomes → 200 { ok: false }; only a true provider failure → 502
    const expected = err === "invalid-phone" || err === "rate-limited" || err === "challenge-failed";
    return NextResponse.json(
      { ok: false, error: err, ...(result.retryAfter ? { retryAfter: result.retryAfter } : {}) },
      expected ? undefined : { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    channel: "sms",
    // dev convenience only — never present in production or with real Twilio
    ...(isProduction() ? {} : result.devCode ? { devCode: result.devCode } : {}),
  });
}
