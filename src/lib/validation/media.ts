/**
 * Media asset validation.
 *
 * A `MediaAsset` is our record of one file in Cloudinary. The storefront never
 * builds Cloudinary URLs from raw strings — it references an asset by id and
 * reads back a stored, validated `secureUrl`.
 */
import { z } from "zod";
import { httpUrl, objectIdString, shortText } from "./primitives";

export const MEDIA_FORMATS = ["jpg", "jpeg", "png", "webp", "avif"] as const;
export const MEDIA_FOLDERS = [
  "products",
  "content",
  "og",
  "invoices",
  "misc",
  "reviews",
  "avatars",
] as const;

/** What a customer is uploading from the account area — maps to a folder + rules
 *  server-side so the browser never picks a folder itself. */
export const ACCOUNT_UPLOAD_PURPOSES = ["review-photo", "avatar"] as const;
export const accountUploadInput = z.object({
  purpose: z.enum(ACCOUNT_UPLOAD_PURPOSES),
});
export type AccountUploadInput = z.infer<typeof accountUploadInput>;

export type MediaFormat = (typeof MEDIA_FORMATS)[number];
export type MediaFolder = (typeof MEDIA_FOLDERS)[number];

/** Payload the client sends to register an upload it has just completed. */
export const mediaConfirmInput = z.object({
  cloudinaryPublicId: z.string().min(1).max(240),
  secureUrl: httpUrl,
  format: z.enum(MEDIA_FORMATS),
  width: z.number().int().positive().max(20_000),
  height: z.number().int().positive().max(20_000),
  bytes: z.number().int().positive().max(25_000_000),
  folder: z.enum(MEDIA_FOLDERS),
  alt: shortText(200).optional(),
  tags: z.array(shortText(40)).max(24).default([]),
});
export type MediaConfirmInput = z.infer<typeof mediaConfirmInput>;

/** Editable fields once an asset exists. */
export const mediaUpdateInput = z.object({
  alt: shortText(200).nullable().optional(),
  tags: z.array(shortText(40)).max(24).optional(),
});
export type MediaUpdateInput = z.infer<typeof mediaUpdateInput>;

/** Params the browser needs from the server to run a signed direct upload. */
export const signUploadInput = z.object({
  folder: z.enum(MEDIA_FOLDERS),
  /** optional stable public id, e.g. a product slug */
  publicId: z
    .string()
    .regex(/^[a-zA-Z0-9_\-/]{1,180}$/, "Invalid public id")
    .optional(),
});
export type SignUploadInput = z.infer<typeof signUploadInput>;

/** A reference to a media asset embedded on another document. */
export const mediaRef = z.object({
  assetId: objectIdString,
  /** denormalised for render without a populate */
  url: httpUrl,
  alt: z.string().max(200).default(""),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type MediaRef = z.infer<typeof mediaRef>;
