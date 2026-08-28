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

  const parsed = schema.safeParse(process.env);
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
