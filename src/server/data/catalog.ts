import "server-only";

import { unstable_cache } from "next/cache";

import { dbConnect } from "@/server/db";
import { Product, type ProductDoc } from "@/server/models";
import { toRupees } from "@/lib/money";
import {
  DISCOVERY_SET_SLUG,
  isFragranceSlug,
  type BagSuggestion,
  type CatalogNavItem,
  type DiscoverySetInfo,
  type Fragrance,
  type FragranceImages,
  type StorefrontCatalog,
} from "@/lib/catalog";

/**
 * Catalogue Data Access Layer.
 *
 * The only place the storefront reads products from. Every query is wrapped in
 * `unstable_cache` with tags so the pages render from a static cache and an
 * admin edit (or `pnpm revalidate`) refreshes them within seconds — no deploy.
 *
 * Tags:
 *   catalog            every catalogue read
 *   product:<slug>     one product
 */

const CATALOG_TAG = "catalog";
const productTag = (slug: string) => `product:${slug}`;
// Long TTL — content changes come through on-demand revalidation, not the clock.
const REVALIDATE_SECONDS = 60 * 60 * 24;

/** A stored media URL, but only if it's a real (Cloudinary) URL — a leftover
 *  local placeholder path resolves to null so the vector treatment shows. */
function realPackshot(url: string | undefined): string | null {
  return url && /^https?:\/\//.test(url) ? url : null;
}

function imagesFor(doc: ProductDoc): FragranceImages {
  return {
    hero: realPackshot(doc.media?.hero?.url),
    flat: realPackshot(doc.media?.flat?.url),
    box: realPackshot(doc.media?.box?.url),
  };
}

function isBuyable(doc: ProductDoc): boolean {
  if (doc.status !== "active") return false;
  const inv = doc.inventory;
  return !inv.trackInventory || inv.allowBackorder || inv.stock > 0;
}

function toFragrance(doc: ProductDoc): Fragrance {
  return {
    id: String(doc._id),
    slug: isFragranceSlug(doc.slug) ? doc.slug : "aurevan",
    sku: doc.inventory.sku,
    name: doc.name,
    pronunciation: doc.pronunciation ?? "",
    title: doc.title,
    poem: doc.poem,
    impression: doc.impression,
    mood: doc.mood,
    notes: doc.notes,
    notesByPhase: {
      arrive: doc.notesByPhase.arrive,
      linger: doc.notesByPhase.linger,
      stay: doc.notesByPhase.stay,
    },
    longevity: doc.longevity,
    sillage: doc.sillage,
    wearOccasion: doc.wearOccasion,
    juice: doc.colour.juiceHex,
    accent: doc.colour.accent,
    ground: doc.colour.ground,
    onGround: doc.colour.onGround,
    onGroundInverse: doc.colour.onGroundInverse,
    price: toRupees(doc.pricing.price),
    mrp: toRupees(doc.pricing.mrp),
    volumeMl: doc.volumeMl,
    images: imagesFor(doc),
    stock: doc.inventory.stock,
    available: isBuyable(doc),
    seo: {
      metaTitle: doc.seo?.metaTitle ?? null,
      metaDescription: doc.seo?.metaDescription ?? null,
    },
  };
}

function toDiscoverySet(doc: ProductDoc): DiscoverySetInfo {
  const components = (doc.components ?? [])
    .filter((c) => isFragranceSlug(c.productSlug))
    .map((c) => ({
      slug: c.productSlug as DiscoverySetInfo["components"][number]["slug"],
      volumeMl: c.volumeMl,
    }));
  return {
    id: String(doc._id),
    slug: DISCOVERY_SET_SLUG,
    sku: doc.inventory.sku,
    name: doc.name,
    headline: doc.title,
    detail: doc.poem,
    price: toRupees(doc.pricing.price),
    mrp: toRupees(doc.pricing.mrp),
    perVialMl: components[0]?.volumeMl ?? 10,
    vialCount: components.length || 3,
    creditRupees: doc.credit ? toRupees(doc.credit.amount) : toRupees(doc.pricing.price),
    components,
    image:
      realPackshot(doc.media?.flat?.url) ?? realPackshot(doc.media?.hero?.url),
    available: doc.status === "active",
    seo: {
      metaTitle: doc.seo?.metaTitle ?? null,
      metaDescription: doc.seo?.metaDescription ?? null,
    },
  };
}

// ── Queries (cached) ─────────────────────────────────────────────────────

export const getFragrances = unstable_cache(
  async (): Promise<Fragrance[]> => {
    await dbConnect();
    const docs = await Product.find({ kind: "fragrance", status: "active" })
      .sort({ order: 1 })
      .lean<ProductDoc[]>();
    return docs.map(toFragrance);
  },
  ["catalog:fragrances"],
  { tags: [CATALOG_TAG], revalidate: REVALIDATE_SECONDS },
);

export function getFragranceBySlug(slug: string): Promise<Fragrance | null> {
  return unstable_cache(
    async (): Promise<Fragrance | null> => {
      if (!isFragranceSlug(slug)) return null;
      await dbConnect();
      const doc = await Product.findOne({
        slug,
        kind: "fragrance",
        status: "active",
      }).lean<ProductDoc | null>();
      return doc ? toFragrance(doc) : null;
    },
    ["catalog:fragrance", slug],
    { tags: [CATALOG_TAG, productTag(slug)], revalidate: REVALIDATE_SECONDS },
  )();
}

export const getDiscoverySet = unstable_cache(
  async (): Promise<DiscoverySetInfo | null> => {
    await dbConnect();
    const doc = await Product.findOne({
      slug: DISCOVERY_SET_SLUG,
      kind: "set",
      status: "active",
    }).lean<ProductDoc | null>();
    return doc ? toDiscoverySet(doc) : null;
  },
  ["catalog:discovery-set"],
  {
    tags: [CATALOG_TAG, productTag(DISCOVERY_SET_SLUG)],
    revalidate: REVALIDATE_SECONDS,
  },
);

export async function getStorefrontCatalog(): Promise<StorefrontCatalog> {
  const [fragrances, discoverySet] = await Promise.all([
    getFragrances(),
    getDiscoverySet(),
  ]);
  return { fragrances, discoverySet };
}

export async function getCatalogNav(): Promise<CatalogNavItem[]> {
  const fragrances = await getFragrances();
  return fragrances.map((f) => ({
    slug: f.slug,
    name: f.name,
    accent: f.accent,
  }));
}

/**
 * The whole range as one-tap cross-sell cards for the bag drawer. The drawer
 * filters out whatever is already in the bag, so a shopper always sees a way to
 * complete the set. `f.images.*` is already real-or-null (see `imagesFor`).
 */
export async function getBagSuggestions(): Promise<BagSuggestion[]> {
  const { fragrances, discoverySet } = await getStorefrontCatalog();

  const out: BagSuggestion[] = fragrances
    .filter((f) => f.available)
    .map((f) => ({
      sku: f.sku,
      slug: f.slug,
      name: f.name,
      fragrance: f.slug,
      image: f.images.flat ?? f.images.hero,
      meta: `Extrait · ${f.volumeMl} ml`,
      price: f.price,
      mrp: f.mrp,
      href: `/fragrances/${f.slug}`,
    }));

  if (discoverySet?.available) {
    out.push({
      sku: discoverySet.sku,
      slug: discoverySet.slug,
      name: discoverySet.name,
      image: null,
      meta: `${discoverySet.vialCount} × ${discoverySet.perVialMl} ml`,
      price: discoverySet.price,
      mrp: discoverySet.mrp,
      href: "/discovery-set",
    });
  }

  return out;
}

/** Related products for a PDP — the other fragrances, in catalogue order. */
export async function getRelatedFragrances(
  slug: string,
): Promise<Fragrance[]> {
  const fragrances = await getFragrances();
  return fragrances.filter((f) => f.slug !== slug);
}

/** Active slugs for `generateStaticParams`. */
export async function getFragranceSlugs(): Promise<string[]> {
  const fragrances = await getFragrances();
  return fragrances.map((f) => f.slug);
}
