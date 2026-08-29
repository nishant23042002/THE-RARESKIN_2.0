import "server-only";

import { getEnv } from "@/server/env";

/**
 * Cloudflare Turnstile verification for the OTP form.
 *
 * When `TURNSTILE_SECRET_KEY` is unset the check is skipped (local dev). In
 * production the OTP routes require a passing token once a phone/IP has failed
 * a couple of times, and always on the first request from a fresh client if
 * the widget is rendered.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const isTurnstileConfigured = () =>
  Boolean(getEnv().TURNSTILE_SECRET_KEY);

export async function verifyTurnstile(
  token: string | null | undefined,
  ip: string | null,
): Promise<{ ok: boolean; reason?: string }> {
  const secret = getEnv().TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, reason: "not-configured" };
  if (!token) return { ok: false, reason: "missing-token" };

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // never cache a challenge verification
      cache: "no-store",
    });
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    return data.success
      ? { ok: true }
      : { ok: false, reason: (data["error-codes"] ?? []).join(",") || "failed" };
  } catch {
    // Fail closed on a network error only in production.
    return {
      ok: getEnv().NODE_ENV !== "production",
      reason: "verify-unreachable",
    };
  }
}
