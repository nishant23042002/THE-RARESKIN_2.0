import "server-only";

import { Types } from "mongoose";
import { revalidatePath, revalidateTag } from "next/cache";

import { dbConnect } from "@/server/db";
import { SiteSettings, recordAudit } from "@/server/models";
import { SETTINGS_TAG } from "@/server/data/settings";
import {
  siteSettingsInput,
  type SiteSettingsInput,
  type SiteSettingsUpdateInput,
} from "@/lib/validation/site-settings";
import { CONTACT } from "@/lib/site";
import type { AuthContext } from "@/server/auth/session";

/**
 * Site-settings mutation. One editable document (`key: "singleton"`). The patch
 * is deep-merged onto the current (parsed, default-filled) settings and the
 * whole result is re-parsed through Zod, so the row stored is always complete
 * and valid. Every write busts the `settings` cache tag + revalidates `/` (the
 * announcement bar, footer and holding-page gate all live in the store layout).
 */

interface Req {
  ip: string | null;
  userAgent: string | null;
}

const editorFallback = (): SiteSettingsInput =>
  siteSettingsInput.parse({
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

/**
 * The editor reads the DB **directly** (not the cached DAL) so it always shows
 * ground truth — a stale cache would otherwise be silently re-persisted on save.
 */
async function readCurrentSettings(): Promise<SiteSettingsInput> {
  await dbConnect();
  const doc = await SiteSettings.findOne({ key: "singleton" }).lean();
  if (!doc) return editorFallback();
  // serialise first — a lean doc carries ObjectId / Date instances (e.g. the
  // `founderPortrait.assetId` ref) that the isomorphic Zod schema rejects.
  const parsed = siteSettingsInput.safeParse(JSON.parse(JSON.stringify(doc)));
  return parsed.success ? parsed.data : editorFallback();
}

export async function getSettingsForEdit(): Promise<SiteSettingsInput> {
  return readCurrentSettings();
}

function deepMerge<T>(base: T, patch: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const cur = out[k];
    const bothPlainObjects =
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      cur !== null &&
      typeof cur === "object" &&
      !Array.isArray(cur);
    out[k] = bothPlainObjects
      ? deepMerge(cur, v as Record<string, unknown>)
      : v;
  }
  return out as T;
}

export async function updateSiteSettings(
  input: SiteSettingsUpdateInput,
  ctx: AuthContext,
  req: Req,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await dbConnect();

  const current = await readCurrentSettings();
  const merged = deepMerge(current, input as Record<string, unknown>);
  const parsed = siteSettingsInput.safeParse(merged);
  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  // Only the sections whose value actually changed — the form PATCHes the whole
  // object, so a naive record would list every group every time.
  const changed = (Object.keys(parsed.data) as (keyof typeof parsed.data)[]).filter(
    (k) =>
      JSON.stringify((current as Record<string, unknown>)[k]) !==
      JSON.stringify((parsed.data as Record<string, unknown>)[k]),
  );
  if (changed.length === 0) return { ok: true };

  await SiteSettings.updateOne(
    { key: "singleton" },
    { $set: { ...parsed.data, updatedBy: new Types.ObjectId(ctx.user.id) } },
    { upsert: true },
  );

  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidatePath("/");

  await recordAudit({
    actorId: new Types.ObjectId(ctx.user.id),
    actorRole: ctx.user.role,
    action: "settings.update",
    targetType: "SiteSettings",
    targetId: "singleton",
    before: pickSections(current, changed as string[]),
    after: pickSections(parsed.data, changed as string[]),
    ip: req.ip,
    userAgent: req.userAgent,
  });
  return { ok: true };
}

/** Would this patch flip a launch switch that needs a fresh sudo check? */
export async function settingsPatchFlipsLaunchFlag(
  input: SiteSettingsUpdateInput,
): Promise<boolean> {
  const flags = input.flags;
  if (!flags) return false;
  const current = await readCurrentSettings();
  return (
    (flags.storeLive !== undefined &&
      flags.storeLive !== current.flags.storeLive) ||
    (flags.maintenanceMode !== undefined &&
      flags.maintenanceMode !== current.flags.maintenanceMode)
  );
}

function pickSections(
  obj: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in obj) out[k] = obj[k];
  return out;
}
