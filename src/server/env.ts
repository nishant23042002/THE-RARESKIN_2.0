import { z } from "zod";

/**
 * Validated server environment.
 *
 * Only this module reads `process.env` for secrets — every other server module
 * imports the typed `env` object from here (the Data Access Layer pattern from
 * the Next.js security guide). Values are parsed once, lazily, and a bad or
 * missing variable fails loudly with the full list of problems rather than a
 * vague `undefined` deep in a query.
 *
 * `NEXT_PUBLIC_*` values are intentionally absent — those belong in client code
 * and are inlined at build time. This module is not `server-only` (the seed and
 * migration scripts need it), but it refuses to run in a browser.
 */
if (typeof window !== "undefined") {
  throw new Error("@/server/env must never be imported into client code");
}
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // ── Database ────────────────────────────────────────────────────────────
  MONGODB_URI: z
    .string()
    .min(1, "MONGODB_URI is required")
    .refine(
      (v) => v.startsWith("mongodb://") || v.startsWith("mongodb+srv://"),
      "MONGODB_URI must be a mongodb:// or mongodb+srv:// connection string",
    ),
  MONGODB_DB: z.string().min(1).default("rareskin"),

  // ── Cloudinary (optional until media features are exercised) ─────────────
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),

  // ── On-demand cache revalidation (POST /api/revalidate) ─────────────────
  REVALIDATE_SECRET: z.string().min(16).optional(),

  // ── Auth — Twilio Verify (OTP) ─────────────────────────────────────────
  // Format is checked in `getTwilioEnv()` (at the point of use) rather than
  // here, so a wrong value doesn't take down the whole app / the build.
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_VERIFY_SERVICE_SID: z.string().min(1).optional(),
  /** Local/dev fallback OTP when Twilio is not configured. Must be the same
   *  length as NEXT_PUBLIC_OTP_LENGTH (4–10 digits). Never used in production. */
  AUTH_DEV_OTP: z
    .string()
    .regex(/^\d{4,10}$/)
    .optional(),

  // ── Auth — Cloudflare Turnstile (bot check on the OTP form) ─────────────
  TURNSTILE_SECRET_KEY: z.string().min(1).optional(),

  // ── Rate limiting — Upstash Redis (falls back to in-process locally) ────
  UPSTASH_REDIS_REST_URL: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // ── Seed / bootstrap (only read by scripts/seed.ts) ─────────────────────
  SEED_SUPERADMIN_PHONE: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, "SEED_SUPERADMIN_PHONE must be +91XXXXXXXXXX")
    .optional(),
  SEED_SUPERADMIN_NAME: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | null = null;

/** Parse and memoise the server environment. Throws with a readable summary. */
export function getEnv(): ServerEnv {
  if (cached) return cached;

  // Treat an empty value (`FOO=` in a .env file) as unset, so optional
  // formatted vars don't fail validation on "".
  const raw = Object.fromEntries(
    Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ""),
  );
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment. Fix these variables (see .env.example):\n${issues}`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** Cloudinary config, asserted present. Call from Cloudinary code paths only. */
export function getCloudinaryEnv(): {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
} {
  const env = getEnv();
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }
  return {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  };
}

export const isProduction = () => getEnv().NODE_ENV === "production";

/** Twilio Verify config, asserted present and well-formed. */
export function getTwilioEnv(): {
  accountSid: string;
  authToken: string;
  verifyServiceSid: string;
} {
  const env = getEnv();
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    throw new Error(
      "Twilio Verify is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID.",
    );
  }
  if (!TWILIO_ACCOUNT_SID.startsWith("AC")) {
    throw new Error(
      `TWILIO_ACCOUNT_SID should be an Account SID (starts with "AC"). Got "${TWILIO_ACCOUNT_SID.slice(0, 2)}…".`,
    );
  }
  if (!TWILIO_VERIFY_SERVICE_SID.startsWith("VA")) {
    const got = TWILIO_VERIFY_SERVICE_SID.slice(0, 2);
    const hint =
      got === "MG"
        ? " — that looks like a Messaging Service SID; you need the Verify Service SID from Console → Verify → Services."
        : "";
    throw new Error(
      `TWILIO_VERIFY_SERVICE_SID should be a Verify Service SID (starts with "VA"). Got "${got}…".${hint}`,
    );
  }
  return {
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
    verifyServiceSid: TWILIO_VERIFY_SERVICE_SID,
  };
}

/** True when real SMS delivery is wired up AND the SIDs are the right kind. A
 *  malformed value counts as "not configured" so dev keeps working and a broken
 *  prod config fails loudly rather than silently accepting a fixed code. */
export const isTwilioConfigured = () => {
  const env = getEnv();
  return Boolean(
    env.TWILIO_ACCOUNT_SID?.startsWith("AC") &&
      env.TWILIO_AUTH_TOKEN &&
      env.TWILIO_VERIFY_SERVICE_SID?.startsWith("VA"),
  );
};

/** Twilio env vars are present (even if malformed) — used to decide whether a
 *  misconfiguration should be a hard error vs. a quiet dev fallback. */
export const hasTwilioEnv = () => {
  const env = getEnv();
  return Boolean(
    env.TWILIO_ACCOUNT_SID ||
      env.TWILIO_AUTH_TOKEN ||
      env.TWILIO_VERIFY_SERVICE_SID,
  );
};

export const isUpstashConfigured = () => {
  const env = getEnv();
  return Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);
};
