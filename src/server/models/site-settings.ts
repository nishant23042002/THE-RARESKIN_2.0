import { Schema, model, models, type Model, type Types } from "mongoose";

import type { SiteSettingsInput } from "@/lib/validation/site-settings";

/**
 * The one editable configuration document (`key: "singleton"`). Shape mirrors
 * `siteSettingsInput` in the validation layer; that Zod schema is the contract,
 * this schema is storage. Reads go through the settings DAL, which parses the
 * document back through Zod so defaults are always filled in.
 */
export interface SiteSettingsDoc extends SiteSettingsInput {
  _id: Types.ObjectId;
  key: "singleton";
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const siteSettingsSchema = new Schema<SiteSettingsDoc>(
  {
    key: {
      type: String,
      enum: ["singleton"],
      default: "singleton",
      required: true,
      index: { unique: true, name: "key_unique" },
    },

    announcements: {
      type: [
        {
          _id: false,
          text: { type: String, required: true },
          href: String,
          active: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    announcementRotateSeconds: { type: Number, default: 6 },

    shipping: {
      freeAbovePaise: { type: Number, default: 0 },
      flatRatePaise: { type: Number, default: 0 },
      dispatchHours: { type: Number, default: 48 },
      deliveryEstimate: { type: String, default: "2–7 working days" },
      serviceablePincodes: { type: [String], default: [] },
      blockedPincodes: { type: [String], default: [] },
    },

    cod: {
      enabled: { type: Boolean, default: true },
      maxOrderValuePaise: { type: Number, default: 500_000 },
      feePaise: { type: Number, default: 0 },
    },

    gst: {
      gstin: String,
      ratePercent: { type: Number, default: 18 },
      hsnCode: { type: String, default: "33030090" },
      originStateCode: { type: String, default: "27" },
      pricesIncludeTax: { type: Boolean, default: true },
    },

    contact: {
      email: { type: String, required: true },
      phone: { type: String, required: true },
      whatsapp: String,
      addressLine: { type: String, required: true },
      locality: { type: String, required: true },
      region: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: "IN" },
      mapsUrl: String,
      grievanceOfficerName: String,
      grievanceOfficerEmail: String,
    },

    social: {
      instagram: String,
      facebook: String,
      youtube: String,
      x: String,
      linkedin: String,
    },

    flags: {
      storeLive: { type: Boolean, default: false },
      checkoutEnabled: { type: Boolean, default: false },
      codEnabled: { type: Boolean, default: true },
      reviewsEnabled: { type: Boolean, default: false },
      discoverySetEnabled: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
    },

    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, minimize: false },
);

export const SiteSettings: Model<SiteSettingsDoc> =
  (models.SiteSettings as Model<SiteSettingsDoc>) ??
  model<SiteSettingsDoc>("SiteSettings", siteSettingsSchema);
