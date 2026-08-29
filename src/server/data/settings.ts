import "server-only";

import { unstable_cache } from "next/cache";

import { dbConnect } from "@/server/db";
import { SiteSettings } from "@/server/models";
import {
  siteSettingsInput,
  type SiteSettingsInput,
} from "@/lib/validation/site-settings";
import { CONTACT } from "@/lib/site";

/**
 * Site settings DAL.
 *
 * The one editable config document (`key: "singleton"`). Reads are cached under
 * the `settings` tag and always parsed back through the Zod schema so every
 * field has its default filled in even if the stored document predates it.
 * If the row doesn't exist yet (fresh DB, no seed) a schema-default object is
 * returned so pages still render.
 */

export const SETTINGS_TAG = "settings";
const REVALIDATE_SECONDS = 60 * 60 * 24;

function fallbackSettings(): SiteSettingsInput {
  return siteSettingsInput.parse({
    contact: {
      email: CONTACT.email,
      phone: CONTACT.phoneHref,
      addressLine: CONTACT.address,
      locality: CONTACT.locality,
      region: CONTACT.region,
      postalCode: CONTACT.postalCode,
      country: "IN",
    },
  });
}

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettingsInput> => {
    await dbConnect();
    const doc = await SiteSettings.findOne({ key: "singleton" }).lean();
    if (!doc) return fallbackSettings();
    const parsed = siteSettingsInput.safeParse(doc);
    return parsed.success ? parsed.data : fallbackSettings();
  },
  ["site-settings:singleton"],
  { tags: [SETTINGS_TAG], revalidate: REVALIDATE_SECONDS },
);
