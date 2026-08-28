import { Schema, model, models, type Model, type Types } from "mongoose";

import { MEDIA_FORMATS, MEDIA_FOLDERS } from "@/lib/validation/media";

/**
 * One file in Cloudinary, tracked so the admin has a media library and so we
 * can find orphans (assets nothing references) for cleanup. The storefront
 * always renders `secureUrl` from this record — it never assembles Cloudinary
 * URLs from loose strings.
 */
export interface MediaAssetDoc {
  _id: Types.ObjectId;
  cloudinaryPublicId: string;
  secureUrl: string;
  format: (typeof MEDIA_FORMATS)[number];
  width: number;
  height: number;
  bytes: number;
  folder: (typeof MEDIA_FOLDERS)[number];
  alt: string;
  tags: string[];
  uploadedBy: Types.ObjectId | null;
  /** back-references: `"product:aurevan.hero"`, `"content:home.hero"` … */
  usedIn: string[];
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<MediaAssetDoc>(
  {
    cloudinaryPublicId: {
      type: String,
      required: true,
      index: { unique: true, name: "cloudinaryPublicId_unique" },
    },
    secureUrl: { type: String, required: true },
    format: { type: String, enum: MEDIA_FORMATS, required: true },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
    bytes: { type: Number, required: true, min: 1 },
    folder: {
      type: String,
      enum: MEDIA_FOLDERS,
      required: true,
      index: { name: "folder" },
    },
    alt: { type: String, default: "" },
    tags: { type: [String], default: [] },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    usedIn: { type: [String], default: [], index: { name: "usedIn" } },
  },
  { timestamps: true },
);

mediaAssetSchema.index({ tags: 1 }, { name: "tags" });
mediaAssetSchema.index({ createdAt: -1 }, { name: "createdAt_desc" });

export const MediaAsset: Model<MediaAssetDoc> =
  (models.MediaAsset as Model<MediaAssetDoc>) ??
  model<MediaAssetDoc>("MediaAsset", mediaAssetSchema);
