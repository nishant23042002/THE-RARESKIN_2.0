/**
 * Catalogue types and client-safe constants.
 *
 * This module is **isomorphic** — the storefront (client and server) imports
 * the shapes and pure helpers from here. The actual data comes from the
 * database via the server-only Data Access Layer in `@/server/data/catalog`;
 * server components call that and pass plain objects of these types down to
 * client components as props.
 *
 * Money in these DTOs is in **rupees** (a whole number for our current
 * catalogue). The database stores paise; the DAL converts on the way out so the
 * storefront and the `localStorage` cart keep working unchanged. See
 * `@/lib/money`.
 */

export type FragranceSlug = "aurevan" | "orvelis" | "vayren";

/** Canonical order + identity of the three. Stable — these are brand fixtures. */
export const FRAGRANCE_SLUGS = [
  "aurevan",
  "orvelis",
  "vayren",
] as const satisfies readonly FragranceSlug[];

/** Back-compat alias for the old `ORDER` export. */
export const ORDER: readonly FragranceSlug[] = FRAGRANCE_SLUGS;

export const DISCOVERY_SET_SLUG = "discovery-set";

export function isFragranceSlug(value: string): value is FragranceSlug {
  return (FRAGRANCE_SLUGS as readonly string[]).includes(value);
}

/** Paise-free INR the way the brand writes it: `₹799`, `₹1,199`. */
export function formatINR(rupees: number): string {
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export interface FragranceImages {
  /** full-bleed campaign / hero scene — null until real photography is attached */
  hero: string | null;
  /** packshot on a plain ground — null until real photography is attached */
  flat: string | null;
  /** carton or lifestyle — null until real photography is attached */
  box: string | null;
}

/** Any real Fragrance/Set image is present. */
export function hasPhotography(images: FragranceImages): boolean {
  return Boolean(images.hero || images.flat || images.box);
}

/**
 * Rewrite a Cloudinary delivery URL to request an on-the-fly variant
 * (`f_auto,q_auto` + an optional width/height cap). Non-Cloudinary URLs and
 * `null` pass straight through, so callers can hand it a raw `media.*.url`.
 * Isomorphic — mirrors `pdfSafeImage` in `src/server/invoice/data.ts`.
 */
export function cloudinaryVariant(
  url: string | null | undefined,
  opts: { w?: number; h?: number; fill?: boolean } = {},
): string | null {
  if (!url) return null;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  const parts = ["f_auto", "q_auto"];
  if (opts.fill) {
    // square/rect crop to the given box, subject-aware — used for avatars
    if (opts.w) parts.push(`w_${opts.w}`);
    if (opts.h) parts.push(`h_${opts.h}`);
    parts.push("c_fill", "g_auto");
  } else {
    if (opts.w) parts.push(`w_${opts.w}`, "c_limit");
    if (opts.h) parts.push(`h_${opts.h}`, "c_limit");
  }
  return url.replace("/upload/", `/upload/${parts.join(",")}/`);
}

export interface Fragrance {
  id: string;
  slug: FragranceSlug;
  /** inventory SKU — the identifier the cart and checkout carry */
  sku: string;
  name: string;
  pronunciation: string;
  title: string;
  poem: string;
  impression: string;
  mood: string[];
  notes: string[];
  notesByPhase: { arrive: string; linger: string; stay: string };
  /** 0–4, indicative only */
  longevity: number;
  sillage: string;
  wearOccasion: string;
  /** the liquid colour, hex */
  juice: string;
  /** css reference for the fragrance accent (a `var(--…)` token) */
  accent: string;
  /** card background gradient */
  ground: string;
  /** readable text colour on `ground` */
  onGround: string;
  /** button-fill text colour on `ground` */
  onGroundInverse: string;
  /** rupees */
  price: number;
  /** rupees */
  mrp: number;
  volumeMl: number;
  images: FragranceImages;
  /** units in stock (0 when not yet launched) */
  stock: number;
  /** `status === "active"` and buyable */
  available: boolean;
  /** denormalised from approved reviews; `count === 0` → nothing to show */
  rating: { average: number; count: number };
  seo: { metaTitle: string | null; metaDescription: string | null };
}

export interface DiscoverySetInfo {
  id: string;
  slug: typeof DISCOVERY_SET_SLUG;
  /** inventory SKU — the identifier the cart and checkout carry */
  sku: string;
  name: string;
  headline: string;
  detail: string;
  /** rupees */
  price: number;
  /** rupees */
  mrp: number;
  perVialMl: number;
  vialCount: number;
  /** store credit toward a first full-size bottle, rupees */
  creditRupees: number;
  components: { slug: FragranceSlug; volumeMl: number }[];
  /** real packshot when one is attached, else null → the vector treatment */
  image: string | null;
  available: boolean;
  seo: { metaTitle: string | null; metaDescription: string | null };
}

export interface StorefrontCatalog {
  fragrances: Fragrance[];
  discoverySet: DiscoverySetInfo | null;
}

/** Minimal shape the header / menu need for their fragrance links. */
export interface CatalogNavItem {
  slug: FragranceSlug;
  name: string;
  accent: string;
}

/**
 * One cross-sell card in the bag drawer — the rest of the range, offered as a
 * one-tap add. Money in rupees, matching the `localStorage` cart line.
 */
export interface BagSuggestion {
  sku: string;
  slug: string;
  name: string;
  /** a fragrance slug drives the vector `<Flacon>` fallback; absent for the set */
  fragrance?: FragranceSlug;
  /** real packshot URL when one exists, else null → draw the vector flacon */
  image: string | null;
  /** short line under the name — "Extrait · 50 ml" / "3 × 10 ml" */
  meta: string;
  price: number;
  mrp: number;
  href: string;
}

/**
 * Brand palette for the vector `<Flacon>` and hero art — the client leaves that
 * only carry a slug (the cart drawer, the sticky bar) and can't be handed a
 * full record. These values mirror the `colour` field on each product document
 * and the `@theme` tokens in `globals.css`. Making the palette itself
 * runtime-editable is a later (theming) phase; until then, if you change a
 * juice colour, change it in all three places.
 */
export const FRAGRANCE_PALETTE: Record<
  FragranceSlug,
  { name: string; juice: string; ink: string; accent: string; volumeMl: number }
> = {
  aurevan: {
    name: "AURÉVAN",
    juice: "#e0d7bf",
    ink: "#2b271f",
    accent: "var(--color-aurevan)",
    volumeMl: 50,
  },
  orvelis: {
    name: "ORVÉLIS",
    juice: "#c5872f",
    ink: "#2a2012",
    accent: "var(--color-orvelis)",
    volumeMl: 50,
  },
  vayren: {
    name: "VAYRÉN",
    juice: "#3d2712",
    ink: "#ecdcc3",
    accent: "var(--color-vayren)",
    volumeMl: 50,
  },
};

