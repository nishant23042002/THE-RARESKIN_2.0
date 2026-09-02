import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { getEnv, isUpstashConfigured } from "@/server/env";

/**
 * Sliding-window rate limiting.
 *
 * Uses Upstash Redis when configured (works across serverless instances). Falls
 * back to an in-process map for local development — single-instance only, so
 * NEVER rely on the fallback in production; the OTP routes log a warning once
 * if Upstash is missing.
 */
if (typeof window !== "undefined") {
  throw new Error("@/server/auth must never be imported into client code");
}

type Duration = `${number} ${"s" | "m" | "h" | "d"}`;

// Tuned so a legitimate user (including on a shared office / campus NAT) never
// hits a wall, while abuse is still shut down. Twilio Verify separately caps
// attempts-per-code at 5 and expires codes in ~10 min.
const RULES = {
  "otp:start:phone": { limit: 5, window: "15 m" as Duration },
  "otp:start:ip": { limit: 30, window: "15 m" as Duration },
  "otp:verify:phone": { limit: 12, window: "15 m" as Duration },
  "otp:verify:ip": { limit: 50, window: "15 m" as Duration },
  // Staff sudo re-auth — scoped per user. Deliberately tight.
  "admin:sudo:user": { limit: 8, window: "15 m" as Duration },
  // Google OAuth start — scoped per IP (no user yet on the sign-in path).
  "auth:google:ip": { limit: 20, window: "15 m" as Duration },
  // Checkout: a quote is cheap (recompute on every field change); placing an
  // order is not. Scoped per user/IP.
  "checkout:quote:ip": { limit: 120, window: "5 m" as Duration },
  "checkout:place:user": { limit: 12, window: "10 m" as Duration },
  "checkout:place:ip": { limit: 20, window: "10 m" as Duration },
} as const;

export type RateRule = keyof typeof RULES;

export interface RateResult {
  success: boolean;
  remaining: number;
  /** epoch ms when the window resets */
  reset: number;
}

let redis: Redis | null = null;
const upstashLimiters = new Map<RateRule, Ratelimit>();
let warnedNoUpstash = false;

function durationMs(d: Duration): number {
  const [n, unit] = d.split(" ") as [string, "s" | "m" | "h" | "d"];
  const mult = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[unit];
  return Number(n) * mult;
}

// ── in-process fallback ─────────────────────────────────────────────────
const memoryHits = new Map<string, number[]>();

function memoryLimit(rule: RateRule, key: string): RateResult {
  const { limit, window } = RULES[rule];
  const span = durationMs(window);
  const now = Date.now();
  const bucketKey = `${rule}:${key}`;
  const hits = (memoryHits.get(bucketKey) ?? []).filter((t) => now - t < span);
  const success = hits.length < limit;
  if (success) hits.push(now);
  memoryHits.set(bucketKey, hits);
  return {
    success,
    remaining: Math.max(0, limit - hits.length),
    reset: (hits[0] ?? now) + span,
  };
}

// occasional sweep so the map doesn't grow forever in a long-lived dev server
setInterval(
  () => {
    const now = Date.now();
    for (const [k, v] of memoryHits) {
      const fresh = v.filter((t) => now - t < 864e5);
      if (fresh.length) memoryHits.set(k, fresh);
      else memoryHits.delete(k);
    }
  },
  60 * 60 * 1000,
).unref?.();

// ── upstash ─────────────────────────────────────────────────────────────
function getUpstashLimiter(rule: RateRule): Ratelimit {
  let limiter = upstashLimiters.get(rule);
  if (limiter) return limiter;
  if (!redis) {
    const env = getEnv();
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL!,
      token: env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  const { limit, window } = RULES[rule];
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, window),
    prefix: `rl:${rule}`,
    analytics: false,
  });
  upstashLimiters.set(rule, limiter);
  return limiter;
}

/** Consume one token for `rule` scoped to `key`. */
export async function checkRate(
  rule: RateRule,
  key: string,
): Promise<RateResult> {
  if (isUpstashConfigured()) {
    const res = await getUpstashLimiter(rule).limit(key);
    return {
      success: res.success,
      remaining: res.remaining,
      reset: res.reset,
    };
  }
  if (!warnedNoUpstash) {
    warnedNoUpstash = true;
    console.warn(
      "[rate-limit] Upstash not configured — using in-process fallback (dev only).",
    );
  }
  return memoryLimit(rule, key);
}
