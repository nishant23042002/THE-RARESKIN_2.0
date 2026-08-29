/**
 * Site settings — the single editable configuration document.
 *
 * One row in the `siteSettings` collection (`key: "singleton"`). Everything an
 * operator can change about how the store behaves without a deploy lives here:
 * the announcement bar, shipping and COD rules, GST parameters, contact
 * details, and the launch / maintenance switches.
 */
import { z } from "zod";
import {
  email,
  httpUrl,
  hsnCode,
  paise,
  phoneE164,
  pincode,
  shortText,
} from "./primitives";

const announcementMessage = z.object({
  text: shortText(140),
  href: z.string().max(200).optional(),
  active: z.boolean().default(true),
});

const shippingSettings = z.object({
  /** free shipping across India above this order value; 0 = always free */
  freeAbovePaise: paise.default(0),
  /** flat charge when the threshold is not met */
  flatRatePaise: paise.default(0),
  dispatchHours: z.number().int().min(0).max(240).default(48),
  deliveryEstimate: shortText(80).default("2–7 working days"),
  /** empty = every serviceable-looking PIN is allowed */
  serviceablePincodes: z.array(pincode).max(20_000).default([]),
  blockedPincodes: z.array(pincode).max(20_000).default([]),
});

const codSettings = z.object({
  enabled: z.boolean().default(true),
  maxOrderValuePaise: paise.default(500_000),
  feePaise: paise.default(0),
});

const gstSettings = z.object({
  gstin: z
    .string()
    .regex(
      /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z]\d$/,
      "Enter a valid 15-character GSTIN",
    )
    .optional(),
  /** percent, tax-inclusive pricing. 0 turns the tax breakdown off entirely
   *  (no CGST/SGST/IGST split, no GST line on the order) — the storefront
   *  price is then simply the price. Flip to 18 to bring the engine back. */
  ratePercent: z.number().min(0).max(28).default(0),
  hsnCode: hsnCode.default("33030090"),
  originStateCode: z
    .string()
    .regex(/^\d{2}$/, "Two-digit state code")
    .default("27"), // Maharashtra
  pricesIncludeTax: z.boolean().default(true),
});

const contactSettings = z.object({
  email,
  phone: phoneE164,
  whatsapp: phoneE164.optional(),
  addressLine: shortText(240),
  locality: shortText(80),
  region: shortText(80),
  postalCode: pincode,
  country: z.string().length(2).default("IN"),
  mapsUrl: z.string().max(400).optional(),
  grievanceOfficerName: shortText(120).optional(),
  grievanceOfficerEmail: email.optional(),
});

const socialLinks = z
  .object({
    instagram: httpUrl.optional(),
    facebook: httpUrl.optional(),
    youtube: httpUrl.optional(),
    x: httpUrl.optional(),
    linkedin: httpUrl.optional(),
  })
  .prefault({});

const featureFlags = z
  .object({
    /** master switch: false = storefront shows a coming-soon holding page */
    storeLive: z.boolean().default(false),
    checkoutEnabled: z.boolean().default(false),
    codEnabled: z.boolean().default(true),
    reviewsEnabled: z.boolean().default(false),
    discoverySetEnabled: z.boolean().default(true),
    maintenanceMode: z.boolean().default(false),
  })
  .prefault({});

export const siteSettingsInput = z.object({
  announcements: z.array(announcementMessage).max(8).default([]),
  announcementRotateSeconds: z.number().int().min(3).max(60).default(6),
  shipping: shippingSettings.prefault({}),
  cod: codSettings.prefault({}),
  gst: gstSettings.prefault({}),
  contact: contactSettings,
  social: socialLinks,
  flags: featureFlags,
});
export type SiteSettingsInput = z.infer<typeof siteSettingsInput>;

/** Partial patch used by the admin settings form. */
export const siteSettingsUpdateInput = siteSettingsInput.partial();
export type SiteSettingsUpdateInput = z.infer<typeof siteSettingsUpdateInput>;
