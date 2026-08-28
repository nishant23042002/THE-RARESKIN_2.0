/**
 * Product validation — the catalogue's contract.
 *
 * Covers both a single fragrance (`kind: "fragrance"`) and the Discovery Set
 * (`kind: "set"`), which shares most fields but adds its components and the
 * store-credit rule. Everything an admin can edit lives here; system-managed
 * fields (`ratings`, timestamps, audit stamps) are set by the server only.
 */
import { z } from "zod";
import {
  cssColorValue,
  hexColor,
  hsnCode,
  longText,
  objectIdString,
  paise,
  shortText,
  slug,
} from "./primitives";
import { mediaRef } from "./media";

export const PRODUCT_KINDS = ["fragrance", "set"] as const;
export const PRODUCT_STATUSES = ["draft", "active", "archived"] as const;
export const CONCENTRATIONS = [
  "extrait",
  "eau_de_parfum",
  "eau_de_toilette",
] as const;

export type ProductKind = (typeof PRODUCT_KINDS)[number];
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

const notesByPhase = z.object({
  arrive: shortText(120),
  linger: shortText(120),
  stay: shortText(120),
});

const colour = z.object({
  juiceHex: hexColor,
  accent: cssColorValue,
  ground: cssColorValue,
  onGround: hexColor,
  onGroundInverse: hexColor,
});

const pricing = z
  .object({
    price: paise,
    mrp: paise,
    currency: z.literal("INR").default("INR"),
  })
  .refine((p) => p.mrp >= p.price, {
    message: "MRP cannot be lower than the selling price",
    path: ["mrp"],
  });

const inventory = z.object({
  sku: z
    .string()
    .trim()
    .min(3)
    .max(48)
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, "Use uppercase letters, digits and hyphens"),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(100_000).default(6),
  trackInventory: z.boolean().default(true),
  allowBackorder: z.boolean().default(false),
});

const media = z.object({
  hero: mediaRef.optional(),
  flat: mediaRef.optional(),
  box: mediaRef.optional(),
  gallery: z.array(mediaRef).max(12).default([]),
  og: mediaRef.optional(),
});

const seo = z.object({
  metaTitle: shortText(70).optional(),
  metaDescription: shortText(180).optional(),
  ogImageRef: mediaRef.optional(),
});

/** Fields shared by every product kind. */
const productBase = z.object({
  slug,
  status: z.enum(PRODUCT_STATUSES).default("draft"),
  name: shortText(80),
  pronunciation: shortText(120).optional(),
  title: shortText(120),
  poem: longText(600),
  impression: shortText(120),
  concentration: z.enum(CONCENTRATIONS).default("extrait"),
  mood: z.array(shortText(24)).min(1).max(3),
  notes: z.array(shortText(32)).min(1).max(12),
  notesByPhase,
  longevity: z.number().int().min(0).max(4),
  sillage: shortText(60),
  wearOccasion: shortText(80),
  colour,
  pricing,
  volumeMl: z.number().int().positive().max(1000),
  hsnCode: hsnCode.default("33030090"),
  inventory,
  media: media.default({ gallery: [] }),
  seo: seo.default({}),
  /** manual position in the collection grid; lower sorts first */
  order: z.number().int().min(0).max(9999).default(0),
});

const fragranceInput = productBase.extend({
  kind: z.literal("fragrance"),
});

const setComponent = z.object({
  /** the fragrance this vial contains */
  productSlug: slug,
  volumeMl: z.number().int().positive().max(100),
});

const storeCreditRule = z.object({
  amount: paise,
  appliesTo: z.enum(["first_full_size", "any_order"]).default("first_full_size"),
  perCustomer: z.number().int().min(1).max(10).default(1),
  stackable: z.boolean().default(false),
  /** null = never expires */
  expiryDays: z.number().int().min(1).max(3650).nullable().default(null),
});

const setInput = productBase.extend({
  kind: z.literal("set"),
  components: z.array(setComponent).min(2).max(6),
  credit: storeCreditRule,
});

/** Full create payload — discriminated on `kind`. */
export const productCreateInput = z.discriminatedUnion("kind", [
  fragranceInput,
  setInput,
]);
export type ProductCreateInput = z.infer<typeof productCreateInput>;

/**
 * Update payload — every field optional, but `kind` and `slug` are immutable
 * after creation so they are not accepted here.
 */
export const productUpdateInput = z.object({
  status: z.enum(PRODUCT_STATUSES).optional(),
  name: shortText(80).optional(),
  pronunciation: shortText(120).nullable().optional(),
  title: shortText(120).optional(),
  poem: longText(600).optional(),
  impression: shortText(120).optional(),
  concentration: z.enum(CONCENTRATIONS).optional(),
  mood: z.array(shortText(24)).min(1).max(3).optional(),
  notes: z.array(shortText(32)).min(1).max(12).optional(),
  notesByPhase: notesByPhase.optional(),
  longevity: z.number().int().min(0).max(4).optional(),
  sillage: shortText(60).optional(),
  wearOccasion: shortText(80).optional(),
  colour: colour.optional(),
  pricing: pricing.optional(),
  volumeMl: z.number().int().positive().max(1000).optional(),
  hsnCode: hsnCode.optional(),
  inventory: inventory.partial().optional(),
  media: media.optional(),
  seo: seo.optional(),
  order: z.number().int().min(0).max(9999).optional(),
  components: z.array(setComponent).min(2).max(6).optional(),
  credit: storeCreditRule.optional(),
});
export type ProductUpdateInput = z.infer<typeof productUpdateInput>;

/** Stock adjustment — always paired with a reason for the ledger. */
export const stockAdjustmentInput = z.object({
  productId: objectIdString,
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "Adjustment cannot be zero"),
  reason: z.enum(["restock", "correction", "damage", "return", "write_off"]),
  note: shortText(240).optional(),
});
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentInput>;
