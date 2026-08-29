import "server-only";

import twilio from "twilio";

import {
  getEnv,
  getTwilioEnv,
  hasTwilioEnv,
  isProduction,
  isTwilioConfigured,
} from "@/server/env";
import { dbConnect } from "@/server/db";
import { OtpChallenge } from "@/server/models";
import { OTP_LENGTH, OTP_MAX_ATTEMPTS } from "@/lib/auth";

/**
 * OTP send / check — wired to Twilio Verify.
 *
 * Twilio Verify owns the code: generation, delivery, expiry (~10 min), its own
 * send cap (5 / verification) and check cap (5 / verification). This module
 * adds our audit trail, our own attempt counter, request throttling, and a
 * translation of Twilio's error codes into stable client-facing errors.
 *
 * `OTP_LENGTH` must match the "Code Length" configured on the Verify Service —
 * `ensureCodeLength()` fetches the service once and warns loudly on a mismatch.
 *
 * When Twilio is not configured (local dev) a fixed `AUTH_DEV_OTP` is accepted.
 * In production that fallback is never used: a missing / malformed Twilio config
 * errors the flow rather than silently accepting a known code.
 */

type TwilioClient = ReturnType<typeof twilio>;
let client: TwilioClient | null = null;

function getClient(): TwilioClient {
  if (!client) {
    const { accountSid, authToken } = getTwilioEnv();
    client = twilio(accountSid, authToken);
  }
  return client;
}

const DEV_OTP_DEFAULT = "4242424242".slice(0, OTP_LENGTH);
const CHALLENGE_TTL_MS = 15 * 60 * 1000;

/** In dev: the code to accept when Twilio isn't wired up. Never in production. */
function devFallbackCode(): string | null {
  if (isProduction()) return null;
  return getEnv().AUTH_DEV_OTP ?? DEV_OTP_DEFAULT;
}

// ── Twilio Verify Service code-length sanity check (runs once) ────────────

let codeLengthChecked = false;
async function ensureCodeLength(): Promise<void> {
  if (codeLengthChecked) return;
  codeLengthChecked = true;
  try {
    const { verifyServiceSid } = getTwilioEnv();
    const svc = await getClient().verify.v2.services(verifyServiceSid).fetch();
    if (svc.codeLength !== OTP_LENGTH) {
      console.warn(
        `[otp] MISMATCH: Twilio Verify Service code length is ${svc.codeLength}, ` +
          `but NEXT_PUBLIC_OTP_LENGTH is ${OTP_LENGTH}. Set them to the same value ` +
          `(Console → Verify → Services → Settings → Code Length).`,
      );
    }
  } catch (err) {
    console.warn("[otp] could not verify service code length:", (err as Error).message);
  }
}

// ── Twilio error → stable client error ──────────────────────────────────

interface TwilioErrorLike {
  code?: number;
  status?: number;
  message?: string;
}
function isTwilioError(e: unknown): e is TwilioErrorLike {
  return typeof e === "object" && e !== null && "code" in e;
}

interface MappedError {
  error: string;
  burned?: boolean;
  retryAfter?: number;
}
function mapTwilioError(err: unknown, kind: "send" | "check"): MappedError {
  const generic = kind === "send" ? "send-failed" : "check-failed";
  if (!isTwilioError(err)) return { error: generic };
  switch (err.code) {
    case 20404: // service not found — wrong VA SID
      console.error(
        "[otp] Twilio Verify Service not found — check TWILIO_VERIFY_SERVICE_SID (must be a VA… SID).",
      );
      return { error: generic };
    case 60200: // invalid parameter (usually the phone)
    case 60605: // number not reachable / blocked
    case 60033: // invalid 'to' number
      return { error: "invalid-phone" };
    case 60203: // max send attempts for this verification
      return { error: "rate-limited", retryAfter: 600 };
    case 60212: // too many concurrent requests for this phone
    case 60202: // max check attempts for this verification
      return err.code === 60202
        ? { error: "too-many-attempts", burned: true }
        : { error: "rate-limited", retryAfter: 60 };
    case 60410: // verification blocked by fraud guard / SNA
      return { error: "challenge-failed" };
    case 21608: // trial account: number not verified
      console.error(
        "[otp] Twilio trial account — the recipient number must be verified in the console, or upgrade the account.",
      );
      return { error: generic };
    default:
      console.error(`[otp] Twilio ${kind} error ${err.code}: ${err.message}`);
      return { error: generic };
  }
}

// ── send ────────────────────────────────────────────────────────────────

export interface SendResult {
  ok: boolean;
  /** dev only — the code to type, surfaced so the UI can show a hint locally */
  devCode?: string;
  error?: string;
  retryAfter?: number;
}

async function recordChallenge(
  phone: string,
  ctx: { ip: string | null; userAgent: string | null },
): Promise<void> {
  await OtpChallenge.create({
    phone,
    purpose: "login",
    attempts: 0,
    maxAttempts: OTP_MAX_ATTEMPTS,
    ip: ctx.ip,
    userAgent: ctx.userAgent,
    requestedAt: new Date(),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
}

export async function sendOtp(
  phone: string,
  ctx: { ip: string | null; userAgent: string | null },
): Promise<SendResult> {
  await dbConnect();

  if (!isTwilioConfigured()) {
    const devCode = devFallbackCode();
    if (!devCode) {
      try {
        getTwilioEnv();
      } catch (err) {
        console.error("[otp]", (err as Error).message);
      }
      return { ok: false, error: "send-failed" };
    }
    if (hasTwilioEnv()) {
      try {
        getTwilioEnv();
      } catch (err) {
        console.warn("[otp]", (err as Error).message, "— using the dev code.");
      }
    }
    await recordChallenge(phone, ctx);
    console.warn(`[otp] dev code for ${phone} is ${devCode}`);
    return { ok: true, devCode };
  }

  void ensureCodeLength();

  try {
    const { verifyServiceSid } = getTwilioEnv();
    const v = await getClient()
      .verify.v2.services(verifyServiceSid)
      .verifications.create({ to: phone, channel: "sms", locale: "en" });
    if (v.status !== "pending") {
      return { ok: false, error: "send-failed" };
    }
    await recordChallenge(phone, ctx);
    return { ok: true };
  } catch (err) {
    const mapped = mapTwilioError(err, "send");
    return { ok: false, error: mapped.error, retryAfter: mapped.retryAfter };
  }
}

// ── check ───────────────────────────────────────────────────────────────

export interface CheckResult {
  ok: boolean;
  /** true when the challenge is spent (too many attempts / expired) */
  burned?: boolean;
  error?: string;
}

export async function checkOtp(
  phone: string,
  code: string,
): Promise<CheckResult> {
  await dbConnect();

  const challenge = await OtpChallenge.findOne({
    phone,
    purpose: "login",
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ requestedAt: -1 });

  if (!challenge) return { ok: false, error: "no-challenge" };
  if (challenge.attempts >= challenge.maxAttempts) {
    return { ok: false, burned: true, error: "too-many-attempts" };
  }

  challenge.attempts += 1;
  await challenge.save();

  let approved = false;
  if (!isTwilioConfigured()) {
    const devCode = devFallbackCode();
    if (!devCode) return { ok: false, error: "check-failed" };
    approved = code === devCode;
  } else {
    try {
      const { verifyServiceSid } = getTwilioEnv();
      const check = await getClient()
        .verify.v2.services(verifyServiceSid)
        .verificationChecks.create({ to: phone, code });
      approved = check.status === "approved";
    } catch (err) {
      const mapped = mapTwilioError(err, "check");
      if (mapped.burned) {
        challenge.attempts = challenge.maxAttempts;
        await challenge.save();
        return { ok: false, burned: true, error: mapped.error };
      }
      return { ok: false, error: mapped.error };
    }
  }

  if (approved) {
    challenge.consumedAt = new Date();
    await challenge.save();
    return { ok: true };
  }

  const burned = challenge.attempts >= challenge.maxAttempts;
  return { ok: false, burned, error: "invalid-code" };
}

/** Recent failed-attempt pressure for a phone — drives the Turnstile gate. */
export async function recentOtpFailures(phone: string): Promise<number> {
  await dbConnect();
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await OtpChallenge.find({
    phone,
    requestedAt: { $gt: since },
  }).select("attempts consumedAt");
  return rows.reduce((n, r) => n + (r.consumedAt ? 0 : r.attempts), 0);
}
