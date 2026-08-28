/**
 * Static source data for the initial seed — the "Campaign" prototype catalogue.
 *
 * This is the ONLY place the hardcoded catalogue still lives, and only
 * `scripts/seed.ts` reads it. The application reads everything from MongoDB via
 * `@/server/data/catalog`. Editing copy or price here does nothing to a running
 * store — use `pnpm catalog set …` or the admin.
 */

export interface SeedFragrance {
  slug: "aurevan" | "orvelis" | "vayren";
  name: string;
  pronunciation: string;
  title: string;
  poem: string;
  impression: string;
  mood: [string, string, string];
  notes: string[];
  notesByPhase: { arrive: string; linger: string; stay: string };
  longevity: 0 | 1 | 2 | 3 | 4;
  sillage: string;
  wearOccasion: string;
  juice: string;
  accent: string;
  ground: string;
  onGround: string;
  onGroundInverse: string;
  /** rupees */
  price: number;
  /** rupees */
  mrp: number;
  volumeMl: number;
}

export const SEED_PRICE = 799;
export const SEED_MRP = 1199;

export const SEED_FRAGRANCES: SeedFragrance[] = [
  {
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
    price: SEED_PRICE,
    mrp: SEED_MRP,
    volumeMl: 50,
  },
  {
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
    price: SEED_PRICE,
    mrp: SEED_MRP,
    volumeMl: 50,
  },
  {
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
    price: SEED_PRICE,
    mrp: SEED_MRP,
    volumeMl: 50,
  },
];

export const SEED_DISCOVERY_SET = {
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
