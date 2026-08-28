/**
 * Shared Zod building blocks.
 *
 * These are isomorphic — the storefront forms, the admin forms and the server
 * all validate against the same definitions, so a rule is written once. Nothing
 * here may import `mongoose` or any server-only module.
 */
import { z } from "zod";

/** 24-character hex string — the wire form of a MongoDB ObjectId. */
export const objectIdString = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Not a valid id");

/** A non-negative integer amount of paise (see `@/lib/money`). */
export const paise = z
  .number()
  .int("Amount must be a whole number of paise")
  .nonnegative("Amount cannot be negative")
  .max(1_00_00_00_000, "Amount is implausibly large"); // ₹10 crore ceiling

/** URL-safe slug: lowercase letters, digits and single hyphens. */
export const slug = z
  .string()
  .min(1)
  .max(96)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens only",
  );

/** `#rrggbb` or `#rgb` hex colour. */
export const hexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Not a hex colour");

/**
 * A CSS colour value we let the catalogue store for backgrounds — a hex, an
 * `rgb()/rgba()`, a `linear-gradient(...)` or a `var(--token)`. Deliberately
 * permissive but bounded, and it never reaches an HTML sink unescaped.
 */
export const cssColorValue = z
  .string()
  .min(1)
  .max(240)
  .regex(
    /^(#[0-9a-fA-F]{3,8}|rgba?\([\d.,%/ ]+\)|hsla?\([\d.,%/ ]+\)|var\(--[a-z0-9-]+\)|(?:linear|radial|conic)-gradient\([^;{}]+\))$/i,
    "Unsupported colour value",
  );

/** E.164 phone number, e.g. `+917743931331`. */
export const phoneE164 = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Enter a phone number in international format");

/** Indian mobile number in E.164 (`+91` followed by a 10-digit number starting 6–9). */
export const indianMobileE164 = z
  .string()
  .regex(/^\+91[6-9]\d{9}$/, "Enter a valid Indian mobile number");

/** Six-digit Indian PIN code. */
export const pincode = z.string().regex(/^[1-9]\d{5}$/, "Enter a valid PIN code");

/** Email, normalised to lowercase and trimmed. */
export const email = z
  .email("Enter a valid email address")
  .transform((value) => value.trim().toLowerCase());

/** Absolute http(s) URL. */
export const httpUrl = z.url("Enter a valid URL");

/** Trimmed non-empty string with an upper bound, for names / labels / titles. */
export const shortText = (max = 160) =>
  z
    .string()
    .trim()
    .min(1, "This field is required")
    .max(max, `Keep this under ${max} characters`);

/** Trimmed multi-line string with an upper bound, for descriptions / notes. */
export const longText = (max = 8_000) =>
  z.string().trim().min(1).max(max, `Keep this under ${max} characters`);

/** HSN code for GST classification (4–8 digits; perfume is `33030090`). */
export const hsnCode = z.string().regex(/^\d{4,8}$/, "Enter a 4–8 digit HSN code");
