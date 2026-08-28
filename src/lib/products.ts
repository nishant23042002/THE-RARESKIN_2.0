/**
 * Product catalogue — the single source of truth for the storefront.
 *
 * Ported from the "Campaign" prototype's `FRAG` object. When a real backend
 * (Shopify / Razorpay) is wired in, this module becomes the adapter's output
 * shape; nothing else in the UI should hold product copy.
 *
 * No fabricated claims: longevity / sillage figures are marked indicative and
 * stay that way until real wear tests exist.
 */

export type FragranceSlug = "aurevan" | "orvelis" | "vayren";

export interface FragranceImages {
  /** full-bleed campaign / hero scene */
  hero: string;
  /** packshot on a plain ground */
  flat: string;
  /** carton or lifestyle */
  box: string;
}

export interface Fragrance {
  slug: FragranceSlug;
  /** display name, e.g. "AURÉVAN" */
  name: string;
  /** "ऑ-रे-व्हान · aw-ray-vahn" */
  pronunciation: string;
  /** "The Quiet Confidence" */
  title: string;
  poem: string;
  /** short line for the impression marquee */
  impression: string;
  mood: [string, string, string];
  notes: string[];
  notesByPhase: { arrive: string; linger: string; stay: string };
  /** 0–4, indicative only */
  longevity: 0 | 1 | 2 | 3 | 4;
  sillage: string;
  wearOccasion: string;
  /** the liquid colour, hex */
  juice: string;
  /** css reference for the fragrance accent */
  accent: string;
  /** card background gradient */
  ground: string;
  /** readable text colour on `ground` */
  onGround: string;
  /** button-fill text colour on `ground` */
  onGroundInverse: string;
  price: number;
  mrp: number;
  volumeMl: number;
  images: FragranceImages;
}

export const PRICE = 799;
export const MRP = 1199;

/** canonical display order */
export const ORDER: FragranceSlug[] = ["aurevan", "orvelis", "vayren"];

const FRAGRANCES: Record<FragranceSlug, Fragrance> = {
  aurevan: {
    slug: "aurevan",
    name: "AURÉVAN",
    pronunciation: "ऑ-रे-व्हान · aw-ray-vahn",
    title: "The Quiet Confidence",
    poem: "Not everything powerful needs to be loud. For the moments when you don't need to say much. You simply arrive.",
    impression: "Quietly unforgettable.",
    mood: ["Fresh", "Elegant", "Refined"],
    notes: ["Citrus", "Bergamot", "White Florals", "Musk", "Cedar"],
    notesByPhase: {
      arrive: "Citrus, Bergamot",
      linger: "White Florals",
      stay: "Musk, Cedar",
    },
    longevity: 3,
    sillage: "Moderate [indicative]",
    wearOccasion: "Day to evening, all year",
    juice: "#e0d7bf",
    accent: "var(--color-aurevan)",
    ground: "linear-gradient(158deg, #f4efe2, #e7ddc5 56%, #d9cfb8)",
    onGround: "#2b271f",
    onGroundInverse: "#f6f1e6",
    price: PRICE,
    mrp: MRP,
    volumeMl: 50,
    images: {
      hero: "/images/aurevan/hero.jpg",
      flat: "/images/aurevan/flat.jpg",
      box: "/images/aurevan/box.jpg",
    },
  },
  orvelis: {
    slug: "orvelis",
    name: "ORVÉLIS",
    pronunciation: "ऑर-वे-लिस · or-vay-lis",
    title: "The Lasting Impression",
    poem: "The first impression gets noticed. The lasting one gets remembered. Rich, smooth, and effortlessly captivating.",
    impression: "A presence that stays.",
    mood: ["Warm", "Sophisticated", "Timeless"],
    notes: ["Spices", "Amber", "Woods", "Vanilla", "Patchouli"],
    notesByPhase: {
      arrive: "Spices",
      linger: "Amber, Woods",
      stay: "Vanilla, Patchouli",
    },
    longevity: 4,
    sillage: "Moderate to strong [indicative]",
    wearOccasion: "Evening, cooler months",
    juice: "#c5872f",
    accent: "var(--color-orvelis)",
    ground: "linear-gradient(158deg, #f3e5c8, #e7cf9d 54%, #d6b673)",
    onGround: "#2a2012",
    onGroundInverse: "#f7edd7",
    price: PRICE,
    mrp: MRP,
    volumeMl: 50,
    images: {
      hero: "/images/orvelis/hero.jpg",
      flat: "/images/orvelis/flat.jpg",
      box: "/images/orvelis/box.jpg",
    },
  },
  vayren: {
    slug: "vayren",
    name: "VAYRÉN",
    pronunciation: "वे-रेन · vay-ren",
    title: "The Unexplained Attraction",
    poem: "Some people are easy to understand. Some are not. It reveals itself slowly, and leaves them wanting to know more.",
    impression: "Leave them wondering.",
    mood: ["Bold", "Intense", "Memorable"],
    notes: ["Spices", "Leather", "Oud", "Smoke", "Amber"],
    notesByPhase: {
      arrive: "Spices",
      linger: "Leather, Oud",
      stay: "Smoke, Amber",
    },
    longevity: 4,
    sillage: "Strong [indicative]",
    wearOccasion: "Night, statement wear",
    juice: "#3d2712",
    accent: "var(--color-vayren)",
    ground: "linear-gradient(158deg, #3d2f24, #281f16 56%, #150d07)",
    onGround: "#ecdcc3",
    onGroundInverse: "#241c16",
    price: PRICE,
    mrp: MRP,
    volumeMl: 50,
    images: {
      hero: "/images/vayren/hero.jpg",
      flat: "/images/vayren/flat.jpg",
      box: "/images/vayren/box.jpg",
    },
  },
};

export const DISCOVERY_SET = {
  slug: "discovery-set",
  name: "Discovery Set",
  headline: "Meet all three. Keep the one that becomes yours.",
  detail:
    "Three 10 ml extraits in the full-size formula. ₹799, about the price of one launch bottle, credited back in full toward your first 50 ml.",
  price: 799,
  mrp: 1199,
  perVialMl: 10,
  vialCount: 3,
} as const;

export const fragranceList: Fragrance[] = ORDER.map((slug) => FRAGRANCES[slug]);

export function isFragranceSlug(value: string): value is FragranceSlug {
  return value in FRAGRANCES;
}

export function getFragrance(slug: FragranceSlug): Fragrance {
  return FRAGRANCES[slug];
}

/** the other two, in canonical order — used for "you might also like" */
export function relatedFragrances(slug: FragranceSlug): Fragrance[] {
  return fragranceList.filter((f) => f.slug !== slug);
}

/** format paise-free INR the way the brand writes it: ₹799 */
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
