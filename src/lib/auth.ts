/**
 * Isomorphic auth helpers — phone normalisation and the shapes the client sees.
 * No secrets, no DB. The server-only side lives in `@/server/auth`.
 */
import type { UserRole } from "@/lib/validation/user";

/** The current signed-in user, as exposed to client code. Never carries PII
 *  beyond what the account UI shows. */
export interface SessionUser {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  role: UserRole;
  isStaff: boolean;
}

export const SESSION_COOKIE = "__Host-rrs.session";

/**
 * OTP code length. **Must equal the "Code Length" set on your Twilio Verify
 * Service** (Console → Verify → Services → Settings) — Twilio generates codes at
 * that length and this drives the input, validation, and the copy. Twilio Verify
 * supports 4–10. Override with `NEXT_PUBLIC_OTP_LENGTH`; default 4.
 */
export const OTP_LENGTH: number = (() => {
  const n = Number(process.env.NEXT_PUBLIC_OTP_LENGTH);
  return Number.isInteger(n) && n >= 4 && n <= 10 ? n : 4;
})();

/** How many verify attempts before a challenge is burned (mirrors Twilio's
 *  default per-verification check cap). */
export const OTP_MAX_ATTEMPTS = 5;
/** Sliding session lifetimes. */
export const CUSTOMER_SESSION_DAYS = 30;
export const STAFF_SESSION_HOURS = 8;

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/**
 * Normalise a user-entered Indian mobile number to E.164 (`+91XXXXXXXXXX`).
 * Accepts `9876543210`, `09876543210`, `919876543210`, `+91 98765 43210`, etc.
 * Returns `null` if it isn't a plausible Indian mobile.
 */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let ten = digits;
  if (ten.length === 12 && ten.startsWith("91")) ten = ten.slice(2);
  else if (ten.length === 11 && ten.startsWith("0")) ten = ten.slice(1);
  if (!INDIAN_MOBILE.test(ten)) return null;
  return `+91${ten}`;
}

/** `+919011285958` → `+91 90112 •••58` for display in confirmations. */
export function maskPhone(e164: string): string {
  const m = e164.match(/^\+91(\d{5})(\d{3})(\d{2})$/);
  if (!m) return e164;
  return `+91 ${m[1]} •••${m[3]}`;
}
