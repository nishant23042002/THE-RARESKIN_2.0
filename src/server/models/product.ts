import { Schema, model, models, type Model, type Types } from "mongoose";

import {
  CONCENTRATIONS,
  PRODUCT_KINDS,
  PRODUCT_STATUSES,
} from "@/lib/validation/product";

/**
 * The catalogue. One document per sellable thing — the three fragrances and
 * the Discovery Set — discriminated by `kind`. Prices are integer paise.
 *
 * `ratings` is denormalised and only ever written by the review-aggregation
 * job; admins do not edit it.
 */

interface MediaRefSub {
  assetId: Types.ObjectId;
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

const mediaRefSchema = new Schema<MediaRefSub>(
  {
    assetId: { type: Schema.Types.ObjectId, ref: "MediaAsset", required: true },
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    width: Number,
    height: Number,
  },
  { _id: false },
);

export interface ProductDoc {
  _id: Types.ObjectId;
  slug: string;
  kind: (typeof PRODUCT_KINDS)[number];
  status: (typeof PRODUCT_STATUSES)[number];

  name: string;
  pronunciation?: string;
  title: string;
  poem: string;
  impression: string;

  concentration: (typeof CONCENTRATIONS)[number];
  mood: string[];
  notes: string[];
  notesByPhase: { arrive: string; linger: string; stay: string };
  longevity: number;
  sillage: string;
  wearOccasion: string;

  colour: {
    juiceHex: string;
    accent: string;
    ground: string;
    onGround: string;
    onGroundInverse: string;
  };

  pricing: { price: number; mrp: number; currency: "INR" };
  volumeMl: number;
  hsnCode: string;

  inventory: {
    sku: string;
    stock: number;
    lowStockThreshold: number;
    trackInventory: boolean;
    allowBackorder: boolean;
  };

  media: {
    hero?: MediaRefSub;
    heroPortrait?: MediaRefSub;
    flat?: MediaRefSub;
    box?: MediaRefSub;
    gallery: MediaRefSub[];
    og?: MediaRefSub;
  };

  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImageRef?: MediaRefSub;
  };

  ratings: { average: number; count: number };
  order: number;

  // set-only
  components?: { productSlug: string; volumeMl: number }[];
  credit?: {
    amount: number;
    appliesTo: "first_full_size" | "any_order";
    perCustomer: number;
    stackable: boolean;
    expiryDays: number | null;
  };

  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<ProductDoc>(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: { unique: true, name: "slug_unique" },
    },
    kind: { type: String, enum: PRODUCT_KINDS, required: true },
    status: { type: String, enum: PRODUCT_STATUSES, default: "draft" },

    name: { type: String, required: true, trim: true },
    pronunciation: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    poem: { type: String, required: true },
    impression: { type: String, required: true },

    concentration: {
      type: String,
      enum: CONCENTRATIONS,
      default: "extrait",
    },
    mood: { type: [String], default: [] },
    notes: { type: [String], default: [] },
    notesByPhase: {
      arrive: { type: String, required: true },
      linger: { type: String, required: true },
      stay: { type: String, required: true },
    },
    longevity: { type: Number, min: 0, max: 4, required: true },
    sillage: { type: String, required: true },
    wearOccasion: { type: String, required: true },

    colour: {
      juiceHex: { type: String, required: true },
      accent: { type: String, required: true },
      ground: { type: String, required: true },
      onGround: { type: String, required: true },
      onGroundInverse: { type: String, required: true },
    },

    pricing: {
      price: { type: Number, required: true, min: 0 },
      mrp: { type: Number, required: true, min: 0 },
      currency: { type: String, enum: ["INR"], default: "INR" },
    },
    volumeMl: { type: Number, required: true, min: 1 },
    hsnCode: { type: String, default: "33030090" },

    inventory: {
      sku: {
        type: String,
        required: true,
        uppercase: true,
        trim: true,
        index: { unique: true, name: "sku_unique" },
      },
      stock: { type: Number, default: 0, min: 0 },
      lowStockThreshold: { type: Number, default: 6, min: 0 },
      trackInventory: { type: Boolean, default: true },
      allowBackorder: { type: Boolean, default: false },
    },

    media: {
      hero: mediaRefSchema,
      heroPortrait: mediaRefSchema,
      flat: mediaRefSchema,
      box: mediaRefSchema,
      gallery: { type: [mediaRefSchema], default: [] },
      og: mediaRefSchema,
    },

    seo: {
      metaTitle: String,
      metaDescription: String,
      ogImageRef: mediaRefSchema,
    },

    ratings: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 },
    },
    order: { type: Number, default: 0 },

    components: [
      {
        _id: false,
        productSlug: { type: String, required: true },
        volumeMl: { type: Number, required: true, min: 1 },
      },
    ],
    credit: {
      type: {
        amount: { type: Number, min: 0 },
        appliesTo: {
          type: String,
          enum: ["first_full_size", "any_order"],
          default: "first_full_size",
        },
        perCustomer: { type: Number, default: 1, min: 1 },
        stackable: { type: Boolean, default: false },
        expiryDays: { type: Number, default: null },
      },
      default: undefined,
      _id: false,
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Storefront reads: active products in grid order (also serves `{ status }` and
// `{ order }` prefix queries, so no separate single-field indexes).
productSchema.index({ status: 1, order: 1 }, { name: "status_order" });
productSchema.index({ order: 1 }, { name: "order" });
// Admin / storefront search.
productSchema.index(
  { name: "text", notes: "text", mood: "text" },
  { name: "catalogue_text" },
);

export const Product: Model<ProductDoc> =
  (models.Product as Model<ProductDoc>) ??
  model<ProductDoc>("Product", productSchema);
