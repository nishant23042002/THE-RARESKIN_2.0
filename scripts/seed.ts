import "./_bootstrap";

import {
  dbConnect,
  dbDisconnect,
  Product,
  SiteSettings,
  User,
  recordAudit,
} from "@/server/db";
import { getEnv } from "@/server/env";
import { toPaise } from "@/lib/money";
import {
  productCreateInput,
  siteSettingsInput,
  type ProductCreateInput,
} from "@/lib/validation";
import { CONTACT } from "@/lib/site";
import {
  SEED_DISCOVERY_SET as DISCOVERY_SET,
  SEED_FRAGRANCES as fragranceList,
  type SeedFragrance as Fragrance,
} from "./seed-data";

/**
 * Idempotent bootstrap seed.
 *
 *   pnpm db:seed            insert anything missing; leave existing rows alone
 *   pnpm db:seed --fresh    drop products + settings first, then insert
 *
 * Prices are read from the static catalogue in rupees and stored as paise.
 * Media is intentionally left empty — Cloudinary uploads happen in the admin
 * once real photography exists.
 *
 * Run `pnpm db:migrate` first in production so indexes exist before inserts.
 */

const args = new Set(process.argv.slice(2));
const FRESH = args.has("--fresh");

function fragranceToProduct(f: Fragrance, order: number): ProductCreateInput {
  return productCreateInput.parse({
    kind: "fragrance",
    slug: f.slug,
    status: "active",
    name: f.name,
    pronunciation: f.pronunciation,
    title: f.title,
    poem: f.poem,
    impression: f.impression,
    concentration: "extrait",
    mood: f.mood,
    notes: f.notes,
    notesByPhase: f.notesByPhase,
    longevity: f.longevity,
    sillage: f.sillage,
    wearOccasion: f.wearOccasion,
    colour: {
      juiceHex: f.juice,
      accent: f.accent,
      ground: f.ground,
      onGround: f.onGround,
      onGroundInverse: f.onGroundInverse,
    },
    pricing: { price: toPaise(f.price), mrp: toPaise(f.mrp), currency: "INR" },
    volumeMl: f.volumeMl,
    hsnCode: "33030090",
    inventory: {
      sku: `RRS-EXT-${f.slug.toUpperCase()}-${f.volumeMl}`,
      stock: 0,
      lowStockThreshold: 6,
      trackInventory: true,
      allowBackorder: false,
    },
    media: { gallery: [] },
    seo: {
      // no brand suffix — the metadata template adds "— THE RARESKIN"
      metaTitle: `${f.name} — ${f.title}`,
      metaDescription: f.poem.slice(0, 155),
    },
    order,
  });
}

function discoverySetToProduct(order: number): ProductCreateInput {
  return productCreateInput.parse({
    kind: "set",
    slug: DISCOVERY_SET.slug,
    status: "active",
    name: DISCOVERY_SET.name,
    pronunciation: undefined,
    title: DISCOVERY_SET.headline,
    poem: DISCOVERY_SET.detail,
    impression: "Keep the one that becomes yours.",
    concentration: "extrait",
    mood: ["Curious", "Considered", "Yours"],
    notes: ["Citrus", "White florals", "Amber", "Woods", "Leather", "Oud"],
    notesByPhase: {
      arrive: "Three openings",
      linger: "Three hearts",
      stay: "Three signatures",
    },
    longevity: 4,
    sillage: "Varies by extrait",
    wearOccasion: "However you want to test them",
    colour: {
      juiceHex: "#c5872f",
      accent: "var(--color-orvelis)",
      ground: "linear-gradient(158deg, #2a2620, #1c1915 56%, #12100c)",
      onGround: "#ece3d3",
      onGroundInverse: "#241c16",
    },
    pricing: {
      price: toPaise(DISCOVERY_SET.price),
      mrp: toPaise(DISCOVERY_SET.mrp),
      currency: "INR",
    },
    volumeMl: DISCOVERY_SET.perVialMl * DISCOVERY_SET.vialCount,
    hsnCode: "33030090",
    inventory: {
      sku: "RRS-DISCOVERY-SET",
      stock: 0,
      lowStockThreshold: 6,
      trackInventory: true,
      allowBackorder: false,
    },
    media: { gallery: [] },
    seo: {
      metaTitle: "The Discovery Set",
      metaDescription: DISCOVERY_SET.detail.slice(0, 155),
    },
    order,
    components: fragranceList.map((f) => ({
      productSlug: f.slug,
      volumeMl: DISCOVERY_SET.perVialMl,
    })),
    credit: {
      amount: toPaise(DISCOVERY_SET.price),
      appliesTo: "first_full_size",
      perCustomer: 1,
      stackable: false,
      expiryDays: null,
    },
  });
}

function buildSettings() {
  return siteSettingsInput.parse({
    announcements: [
      { text: "Launch offer — ₹799 (was ₹1,199)", active: true },
      { text: "Free shipping across India", active: true },
      { text: "Cash on delivery available", active: true },
      { text: "Discovery Set — all three for ₹799", active: true },
      { text: "Extrait de Parfum. Nothing lighter.", active: true },
    ],
    announcementRotateSeconds: 4,
    shipping: {
      freeAbovePaise: 0,
      flatRatePaise: 0,
      dispatchHours: 48,
      deliveryEstimate: "2–7 working days",
      serviceablePincodes: [],
      blockedPincodes: [],
    },
    cod: {
      enabled: true,
      maxOrderValuePaise: toPaise(5000),
      feePaise: 0,
    },
    gst: {
      ratePercent: 18,
      hsnCode: "33030090",
      originStateCode: "27",
      pricesIncludeTax: true,
    },
    contact: {
      email: CONTACT.email,
      phone: CONTACT.phoneHref,
      addressLine: CONTACT.address,
      locality: CONTACT.locality,
      region: CONTACT.region,
      postalCode: CONTACT.postalCode,
      country: "IN",
      mapsUrl: CONTACT.mapsUrl,
      grievanceOfficerEmail: CONTACT.email,
    },
    social: {},
    flags: {
      storeLive: false,
      checkoutEnabled: false,
      codEnabled: true,
      reviewsEnabled: false,
      discoverySetEnabled: true,
      maintenanceMode: false,
    },
  });
}

async function main() {
  const env = getEnv();
  await dbConnect();
  console.log(`seeding ${env.MONGODB_DB}${FRESH ? "  (--fresh)" : ""}`);

  if (FRESH) {
    await Promise.all([
      Product.deleteMany({}),
      SiteSettings.deleteMany({}),
    ]);
    console.log("  cleared products + settings");
  }

  // ── Products ────────────────────────────────────────────────────────────
  const products: ProductCreateInput[] = [
    ...fragranceList.map((f, i) => fragranceToProduct(f, i)),
    discoverySetToProduct(fragranceList.length),
  ];

  let inserted = 0;
  let skipped = 0;
  for (const p of products) {
    const existing = await Product.exists({ slug: p.slug });
    if (existing) {
      skipped += 1;
      console.log(`  = ${p.slug} exists, left as-is`);
      continue;
    }
    await Product.create(p);
    inserted += 1;
    console.log(`  + ${p.slug} (${p.inventory.sku})`);
  }

  // ── Settings singleton ──────────────────────────────────────────────────
  const settingsExisted = await SiteSettings.exists({ key: "singleton" });
  if (!settingsExisted) {
    await SiteSettings.create({ key: "singleton", ...buildSettings() });
    console.log("  + site settings singleton");
  } else {
    console.log("  = site settings exist, left as-is");
  }

  // ── First superadmin ───────────────────────────────────────────────────
  let superadmin = false;
  if (env.SEED_SUPERADMIN_PHONE) {
    const phone = env.SEED_SUPERADMIN_PHONE;
    const already = await User.exists({ phone });
    await User.findOneAndUpdate(
      { phone },
      {
        $setOnInsert: {
          phone,
          name: env.SEED_SUPERADMIN_NAME ?? "Owner",
          phoneVerifiedAt: null,
        },
        $set: { role: "superadmin", status: "active" },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
    );
    superadmin = true;
    console.log(
      `  ${already ? "=" : "+"} superadmin ${phone}${
        already ? " (promoted / confirmed)" : ""
      }`,
    );
  } else {
    console.log(
      "  · SEED_SUPERADMIN_PHONE not set — no admin account created",
    );
  }

  await recordAudit({
    actorId: null,
    actorRole: "system",
    action: "seed.run",
    targetType: "System",
    targetId: null,
    after: {
      inserted,
      skipped,
      settingsCreated: !settingsExisted,
      superadmin,
      fresh: FRESH,
    },
    ip: null,
    userAgent: null,
    note: FRESH ? "fresh seed" : "seed",
  });

  console.log(
    `\ndone — ${inserted} inserted, ${skipped} skipped, ${products.length} total`,
  );
  await dbDisconnect();
}

main().catch(async (err) => {
  console.error("\nseed failed\n", err);
  await dbDisconnect().catch(() => {});
  process.exitCode = 1;
});
