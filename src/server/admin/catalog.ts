import "server-only";

import { dbConnect } from "@/server/db";
import {
  Product,
  StockLedger,
  type ProductDoc,
  type StockLedgerDoc,
} from "@/server/models";
import { PRODUCT_STATUSES, type ProductStatus } from "@/lib/validation/product";

/**
 * Catalogue reads for the admin — every product regardless of status (the
 * storefront DAL only ever sees `active`). Not cached; a `catalog_manager` needs
 * the current record.
 */

// ── list ───────────────────────────────────────────────────────────────

export interface AdminProductRow {
  id: string;
  slug: string;
  kind: ProductDoc["kind"];
  status: ProductStatus;
  name: string;
  pricePaise: number;
  mrpPaise: number;
  stock: number;
  lowStockThreshold: number;
  trackInventory: boolean;
  order: number;
  heroThumb: string | null;
  updatedAt: string;
}

function firstImage(media: ProductDoc["media"] | undefined): string | null {
  if (!media) return null;
  return (
    media.flat?.url ??
    media.hero?.url ??
    media.gallery?.[0]?.url ??
    media.box?.url ??
    null
  );
}

export async function listProducts(): Promise<AdminProductRow[]> {
  await dbConnect();
  const docs = await Product.find()
    .sort({ order: 1, createdAt: 1 })
    .lean<ProductDoc[]>();
  return docs.map((d) => ({
    id: String(d._id),
    slug: d.slug,
    kind: d.kind,
    status: d.status as ProductStatus,
    name: d.name,
    pricePaise: d.pricing.price,
    mrpPaise: d.pricing.mrp,
    stock: d.inventory.stock,
    lowStockThreshold: d.inventory.lowStockThreshold,
    trackInventory: d.inventory.trackInventory,
    order: d.order,
    heroThumb: firstImage(d.media),
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function getCatalogueOverview(): Promise<{
  byStatus: Record<ProductStatus, number>;
  lowStock: { slug: string; name: string; stock: number; threshold: number }[];
}> {
  await dbConnect();
  const docs = await Product.find()
    .select("slug name status inventory.stock inventory.lowStockThreshold inventory.trackInventory")
    .lean<
      Pick<ProductDoc, "slug" | "name" | "status" | "inventory">[]
    >();

  const byStatus = Object.fromEntries(
    PRODUCT_STATUSES.map((s) => [s, 0]),
  ) as Record<ProductStatus, number>;
  const lowStock: {
    slug: string;
    name: string;
    stock: number;
    threshold: number;
  }[] = [];

  for (const d of docs) {
    byStatus[d.status as ProductStatus] += 1;
    if (
      d.inventory.trackInventory &&
      d.inventory.stock <= d.inventory.lowStockThreshold
    ) {
      lowStock.push({
        slug: d.slug,
        name: d.name,
        stock: d.inventory.stock,
        threshold: d.inventory.lowStockThreshold,
      });
    }
  }
  return { byStatus, lowStock };
}

// ── edit DTO ───────────────────────────────────────────────────────────

export interface MediaRefDTO {
  assetId: string;
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

function mediaRefDto(
  ref:
    | { assetId: unknown; url: string; alt?: string; width?: number; height?: number }
    | undefined,
): MediaRefDTO | null {
  if (!ref?.url) return null;
  return {
    assetId: String(ref.assetId),
    url: ref.url,
    alt: ref.alt ?? "",
    width: ref.width,
    height: ref.height,
  };
}

export interface ProductEditDTO {
  id: string;
  slug: string;
  kind: ProductDoc["kind"];
  status: ProductStatus;
  name: string;
  pronunciation: string;
  title: string;
  poem: string;
  impression: string;
  concentration: ProductDoc["concentration"];
  mood: string[];
  notes: string[];
  notesByPhase: { arrive: string; linger: string; stay: string };
  longevity: number;
  sillage: string;
  wearOccasion: string;
  colour: ProductDoc["colour"];
  pricePaise: number;
  mrpPaise: number;
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
    hero: MediaRefDTO | null;
    flat: MediaRefDTO | null;
    box: MediaRefDTO | null;
    og: MediaRefDTO | null;
    gallery: MediaRefDTO[];
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    ogImageRef: MediaRefDTO | null;
  };
  order: number;
  ratings: { average: number; count: number };
  components: { productSlug: string; volumeMl: number }[];
  credit: ProductDoc["credit"] | null;
  updatedAt: string;
  ledger: {
    at: string;
    delta: number;
    reason: string;
    balanceAfter: number;
    note: string | null;
  }[];
}

export async function getProductForEdit(
  slug: string,
): Promise<ProductEditDTO | null> {
  await dbConnect();
  const d = await Product.findOne({ slug }).lean<ProductDoc | null>();
  if (!d) return null;

  const ledgerRows = await StockLedger.find({ productId: d._id })
    .sort({ at: -1 })
    .limit(12)
    .lean<StockLedgerDoc[]>();

  return {
    id: String(d._id),
    slug: d.slug,
    kind: d.kind,
    status: d.status as ProductStatus,
    name: d.name,
    pronunciation: d.pronunciation ?? "",
    title: d.title,
    poem: d.poem,
    impression: d.impression,
    concentration: d.concentration,
    mood: d.mood ?? [],
    notes: d.notes ?? [],
    notesByPhase: {
      arrive: d.notesByPhase.arrive,
      linger: d.notesByPhase.linger,
      stay: d.notesByPhase.stay,
    },
    longevity: d.longevity,
    sillage: d.sillage,
    wearOccasion: d.wearOccasion,
    colour: d.colour,
    pricePaise: d.pricing.price,
    mrpPaise: d.pricing.mrp,
    volumeMl: d.volumeMl,
    hsnCode: d.hsnCode,
    inventory: {
      sku: d.inventory.sku,
      stock: d.inventory.stock,
      lowStockThreshold: d.inventory.lowStockThreshold,
      trackInventory: d.inventory.trackInventory,
      allowBackorder: d.inventory.allowBackorder,
    },
    media: {
      hero: mediaRefDto(d.media?.hero),
      flat: mediaRefDto(d.media?.flat),
      box: mediaRefDto(d.media?.box),
      og: mediaRefDto(d.media?.og),
      gallery: (d.media?.gallery ?? [])
        .map(mediaRefDto)
        .filter((r): r is MediaRefDTO => r != null),
    },
    seo: {
      metaTitle: d.seo?.metaTitle ?? "",
      metaDescription: d.seo?.metaDescription ?? "",
      ogImageRef: mediaRefDto(d.seo?.ogImageRef),
    },
    order: d.order,
    ratings: d.ratings,
    components: (d.components ?? []).map((c) => ({
      productSlug: c.productSlug,
      volumeMl: c.volumeMl,
    })),
    credit: d.credit ?? null,
    updatedAt: d.updatedAt.toISOString(),
    ledger: ledgerRows.map((l) => ({
      at: l.at.toISOString(),
      delta: l.delta,
      reason: l.reason,
      balanceAfter: l.balanceAfter,
      note: l.note ?? null,
    })),
  };
}

/** Active fragrance slugs — for the Discovery Set components picker. */
export async function fragranceSlugOptions(): Promise<
  { slug: string; name: string }[]
> {
  await dbConnect();
  const docs = await Product.find({ kind: "fragrance" })
    .select("slug name")
    .sort({ order: 1 })
    .lean<{ slug: string; name: string }[]>();
  return docs.map((d) => ({ slug: d.slug, name: d.name }));
}
