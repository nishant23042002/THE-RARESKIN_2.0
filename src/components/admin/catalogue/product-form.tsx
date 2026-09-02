"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  Checkbox,
  FormSection,
  Row,
} from "@/components/admin/field";
import { UploadField } from "@/components/admin/media/upload-field";
import { InfoTip } from "@/components/admin/info-tip";
import {
  ProductPreview,
  type ProductPreviewData,
} from "@/components/admin/catalogue/product-preview";
import { Icon } from "@/components/ui/icon";
import { toPaise, toRupees } from "@/lib/money";
import { CONCENTRATIONS, PRODUCT_STATUSES } from "@/lib/validation/product";
import type { MediaRefDTO, ProductEditDTO } from "@/server/admin";

/**
 * The catalogue editor. One form, one save. In edit mode `slug` / `kind` / SKU
 * are locked (carts and order history reference them); in create mode they're
 * chosen. The whole editable record is sent on save — the server accepts every
 * field as optional and flattens it to a `$set`.
 */

type MediaSlot = MediaRefDTO | null;

interface FormState {
  kind: "fragrance" | "set";
  slug: string;
  sku: string;
  status: (typeof PRODUCT_STATUSES)[number];
  order: string;
  name: string;
  pronunciation: string;
  title: string;
  poem: string;
  impression: string;
  concentration: (typeof CONCENTRATIONS)[number];
  mood: string;
  notes: string;
  arrive: string;
  linger: string;
  stay: string;
  longevity: string;
  sillage: string;
  wearOccasion: string;
  juiceHex: string;
  accent: string;
  ground: string;
  onGround: string;
  onGroundInverse: string;
  price: string;
  mrp: string;
  volumeMl: string;
  hsnCode: string;
  lowStockThreshold: string;
  trackInventory: boolean;
  allowBackorder: boolean;
  metaTitle: string;
  metaDescription: string;
  hero: MediaSlot;
  heroPortrait: MediaSlot;
  flat: MediaSlot;
  box: MediaSlot;
  og: MediaSlot;
  ogImageRef: MediaSlot;
  gallery: MediaRefDTO[];
  // set-only
  components: { productSlug: string; volumeMl: string }[];
  creditAmount: string;
  creditAppliesTo: "first_full_size" | "any_order";
  creditPerCustomer: string;
  creditStackable: boolean;
  creditExpiryDays: string;
}

function fromDto(p: ProductEditDTO): FormState {
  return {
    kind: p.kind,
    slug: p.slug,
    sku: p.inventory.sku,
    status: p.status,
    order: String(p.order),
    name: p.name,
    pronunciation: p.pronunciation,
    title: p.title,
    poem: p.poem,
    impression: p.impression,
    concentration: p.concentration,
    mood: p.mood.join(", "),
    notes: p.notes.join(", "),
    arrive: p.notesByPhase.arrive,
    linger: p.notesByPhase.linger,
    stay: p.notesByPhase.stay,
    longevity: String(p.longevity),
    sillage: p.sillage,
    wearOccasion: p.wearOccasion,
    juiceHex: p.colour.juiceHex,
    accent: p.colour.accent,
    ground: p.colour.ground,
    onGround: p.colour.onGround,
    onGroundInverse: p.colour.onGroundInverse,
    price: String(toRupees(p.pricePaise)),
    mrp: String(toRupees(p.mrpPaise)),
    volumeMl: String(p.volumeMl),
    hsnCode: p.hsnCode,
    lowStockThreshold: String(p.inventory.lowStockThreshold),
    trackInventory: p.inventory.trackInventory,
    allowBackorder: p.inventory.allowBackorder,
    metaTitle: p.seo.metaTitle,
    metaDescription: p.seo.metaDescription,
    hero: p.media.hero,
    heroPortrait: p.media.heroPortrait,
    flat: p.media.flat,
    box: p.media.box,
    og: p.media.og,
    ogImageRef: p.seo.ogImageRef,
    gallery: p.media.gallery,
    components: p.components.map((c) => ({
      productSlug: c.productSlug,
      volumeMl: String(c.volumeMl),
    })),
    creditAmount: p.credit ? String(toRupees(p.credit.amount)) : "",
    creditAppliesTo: p.credit?.appliesTo ?? "first_full_size",
    creditPerCustomer: String(p.credit?.perCustomer ?? 1),
    creditStackable: p.credit?.stackable ?? false,
    creditExpiryDays: p.credit?.expiryDays != null ? String(p.credit.expiryDays) : "",
  };
}

const EMPTY: FormState = {
  kind: "fragrance",
  slug: "",
  sku: "",
  status: "draft",
  order: "0",
  name: "",
  pronunciation: "",
  title: "",
  poem: "",
  impression: "",
  concentration: "extrait",
  mood: "",
  notes: "",
  arrive: "",
  linger: "",
  stay: "",
  longevity: "3",
  sillage: "",
  wearOccasion: "",
  juiceHex: "#c5872f",
  accent: "var(--color-orvelis)",
  ground: "linear-gradient(158deg, #f3e5c8, #e7cf9d 54%, #d6b673)",
  onGround: "#2a2012",
  onGroundInverse: "#f7edd7",
  price: "",
  mrp: "",
  volumeMl: "50",
  hsnCode: "33030090",
  lowStockThreshold: "6",
  trackInventory: true,
  allowBackorder: false,
  metaTitle: "",
  metaDescription: "",
  hero: null,
  heroPortrait: null,
  flat: null,
  box: null,
  og: null,
  ogImageRef: null,
  gallery: [],
  components: [
    { productSlug: "", volumeMl: "10" },
    { productSlug: "", volumeMl: "10" },
  ],
  creditAmount: "",
  creditAppliesTo: "first_full_size",
  creditPerCustomer: "1",
  creditStackable: false,
  creditExpiryDays: "",
};

const splitList = (s: string) =>
  s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean);

/** Hover-help for the fields whose meaning or destination isn't obvious. */
const INFO = {
  status:
    "draft = only visible here. active = live on the storefront. archived = hidden from shoppers but kept for order history.",
  order:
    "Where this product sits in the home collection grid — lower numbers come first. Tip: drag rows + 'Save order' on the list instead.",
  kind: "fragrance = one of 'The Three'. set = the Discovery Set. This can't change after creation.",
  slug: "The URL segment — the product page is /fragrances/<slug>. Lowercase, hyphens only. Permanent: carts and past orders reference it.",
  sku: "The stock-keeping code every cart line and order references. UPPERCASE, hyphens. Permanent once created.",
  name: "The product name in caps, e.g. AURÉVAN. Shows as the page heading and on the collection card.",
  title:
    "The short phrase under the name on the product page, e.g. 'The Quiet Confidence'.",
  poem: "The 2–3 sentence prose block on the product page, under the title. Max 600 characters.",
  impression: "A single closing line shown near the foot of the product page.",
  mood: "1–3 one-word descriptors (Fresh, Elegant …), comma-separated. Shown as small caps under the name.",
  wearOccasion:
    "Free text for the spec table, e.g. 'Day to evening, all year'.",
  notes:
    "The scent notes listed as chips on the product page. 1–12, comma-separated.",
  phase:
    "The 'How it unfolds' rows: what you smell first (Arrive), after a while (Linger), and hours later (Stay).",
  concentration:
    "Extrait de Parfum is the house standard — this only changes the label text, not the price.",
  longevity:
    "An indicative 0–4 scale shown as a bar on the product page. 0 = fleeting, 4 = lasts all day.",
  sillage:
    "How far the scent projects — free text in the spec table, e.g. 'Moderate [indicative]'.",
  price:
    "Enter rupees; stored as paise. This is what the customer pays.",
  mrp: "The 'was' price, struck through as the launch-offer saving. Must be ≥ the price.",
  volumeMl: "Bottle size in millilitres. Shown on the product page and the cart line.",
  hsnCode:
    "GST classification code printed on the invoice. Perfume is 33030090 — leave it unless advised.",
  threshold:
    "The dashboard flags this product as 'low on stock' at or below this number.",
  trackInventory:
    "On: stock can't go below zero and the product hides itself at 0. Turn off for made-to-order items.",
  allowBackorder:
    "Let customers buy at 0 stock (the level can go negative). Only with a fulfilment plan.",
  metaTitle:
    "The <title> for this product's page and its search-result / share heading. ≤ 70 chars. Falls back to '<Name> — <Title>'.",
  metaDescription:
    "The one-line summary under the title in search results and link previews. ≤ 180 chars.",
  colour:
    "The bottle-juice colour and the card background used by the vector flacon and the collection card — only matters until real photography is attached.",
  components:
    "Which fragrances the Discovery Set contains and how many ml of each. 2–6 vials.",
  creditAmount:
    "Store credit granted to the buyer of this set, toward a later full-size bottle. Enter rupees.",
  creditAppliesTo:
    "'first full-size' = the credit only applies to the customer's first 50 ml order. 'any order' = any future order.",
  creditPerCustomer: "How many times one customer can earn this credit.",
  creditExpiry: "Days until the granted credit expires. Blank = never.",
} as const;

const IMG_INFO = {
  flat: "The bottle on a plain background. This is the main storefront image — it replaces the vector flacon on the product-page gallery and the home collection card. Portrait, about 4:5 (e.g. 1200×1500+). JPG / PNG / WebP, ≤ 10 MB.",
  hero: "The homepage hero-carousel banner for this fragrance — the full-screen image behind the headline on the first slide. Landscape 16:9 (generate at least 2560×1440, ideal 3840×2160). Keep the bottle centred with wide margins and the lower-left corner calm for the headline. Also used as a product-page gallery slide.",
  heroPortrait: "The mobile crop of the hero banner — shown on phones (under ~768px) where the 16:9 image would be cut too tight. Portrait 9:16 (1440×2560+). Same scene, more head- and foot-room. Falls back to the landscape banner if left empty.",
  box: "The carton or a close-up detail. Adds another slide to the product-page gallery.",
  og: "The image used in link previews when this product's page is shared on social / messaging. Landscape, 1200×630. Falls back to the site default if empty.",
  gallery:
    "Extra images shown as additional slides in the product-page gallery, in this order.",
  ogOverride:
    "Overrides the share-preview image for this page only. Landscape, 1200×630.",
} as const;

export function ProductForm({
  mode,
  product,
  fragranceOptions,
}: {
  mode: "create" | "edit";
  product?: ProductEditDTO;
  fragranceOptions: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(
    product ? fromDto(product) : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Re-sync the form when the server hands back a newer record (after a save +
  // `router.refresh()`), so what's on screen is always the persisted truth.
  // "Adjust state during render" — same pattern as `orders-filters.tsx`.
  const [syncedAt, setSyncedAt] = useState(product?.updatedAt);
  if (product && product.updatedAt !== syncedAt) {
    setSyncedAt(product.updatedAt);
    setF(fromDto(product));
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setF((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  function buildPreview(): ProductPreviewData {
    return {
      slug: f.slug.trim(),
      status: f.status,
      kind: f.kind,
      name: f.name.trim(),
      pronunciation: f.pronunciation.trim(),
      title: f.title.trim(),
      poem: f.poem.trim(),
      impression: f.impression.trim(),
      priceRupees: Number(f.price) || 0,
      mrpRupees: Number(f.mrp) || 0,
      volumeMl: Number(f.volumeMl) || 0,
      mood: splitList(f.mood),
      notes: splitList(f.notes),
      notesByPhase: {
        arrive: f.arrive.trim(),
        linger: f.linger.trim(),
        stay: f.stay.trim(),
      },
      longevity: Number(f.longevity) || 0,
      images: {
        hero: f.hero?.url ?? null,
        flat: f.flat?.url ?? null,
        box: f.box?.url ?? null,
      },
      colour: {
        juiceHex: f.juiceHex.trim(),
        ground: f.ground.trim(),
        onGround: f.onGround.trim(),
      },
    };
  }

  function buildCommon() {
    const common: Record<string, unknown> = {
      status: f.status,
      order: Number(f.order) || 0,
      name: f.name.trim(),
      title: f.title.trim(),
      poem: f.poem.trim(),
      impression: f.impression.trim(),
      concentration: f.concentration,
      mood: splitList(f.mood),
      notes: splitList(f.notes),
      notesByPhase: {
        arrive: f.arrive.trim(),
        linger: f.linger.trim(),
        stay: f.stay.trim(),
      },
      longevity: Number(f.longevity),
      sillage: f.sillage.trim(),
      wearOccasion: f.wearOccasion.trim(),
      colour: {
        juiceHex: f.juiceHex.trim(),
        accent: f.accent.trim(),
        ground: f.ground.trim(),
        onGround: f.onGround.trim(),
        onGroundInverse: f.onGroundInverse.trim(),
      },
      pricing: {
        price: toPaise(Number(f.price)),
        mrp: toPaise(Number(f.mrp)),
        currency: "INR",
      },
      volumeMl: Number(f.volumeMl),
      hsnCode: f.hsnCode.trim(),
      media: {
        hero: f.hero,
        heroPortrait: f.heroPortrait,
        flat: f.flat,
        box: f.box,
        og: f.og,
        gallery: f.gallery,
      },
      seo: {
        metaTitle: f.metaTitle.trim() || null,
        metaDescription: f.metaDescription.trim() || null,
        ogImageRef: f.ogImageRef,
      },
    };
    if (f.pronunciation.trim()) common.pronunciation = f.pronunciation.trim();

    if (f.kind === "set") {
      common.components = f.components
        .filter((c) => c.productSlug)
        .map((c) => ({ productSlug: c.productSlug, volumeMl: Number(c.volumeMl) }));
      common.credit = {
        amount: toPaise(Number(f.creditAmount || 0)),
        appliesTo: f.creditAppliesTo,
        perCustomer: Number(f.creditPerCustomer) || 1,
        stackable: f.creditStackable,
        expiryDays: f.creditExpiryDays.trim()
          ? Number(f.creditExpiryDays)
          : null,
      };
    }
    return common;
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body =
        mode === "create"
          ? {
              ...buildCommon(),
              kind: f.kind,
              slug: f.slug.trim(),
              inventory: {
                sku: f.sku.trim().toUpperCase(),
                stock: 0,
                lowStockThreshold: Number(f.lowStockThreshold) || 6,
                trackInventory: f.trackInventory,
                allowBackorder: f.allowBackorder,
              },
            }
          : {
              ...buildCommon(),
              inventory: {
                lowStockThreshold: Number(f.lowStockThreshold) || 6,
                trackInventory: f.trackInventory,
                allowBackorder: f.allowBackorder,
              },
            };

      const res = await fetch(
        mode === "create"
          ? "/api/admin/catalogue"
          : `/api/admin/catalogue/${encodeURIComponent(product!.slug)}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!json.ok) {
        setError(
          json.error === "slug-or-sku-taken"
            ? "That slug or SKU is already in use."
            : json.error === "bad-request"
              ? `Some fields are invalid: ${(json.issues ?? [])
                  .map((i: { path: (string | number)[]; message: string }) => i.path.join("."))
                  .join(", ")}`
              : "Couldn't save. Check the fields and retry.",
        );
        return;
      }
      setSaved(true);
      if (mode === "create") {
        if (json.warning) {
          setError(json.warning);
          await new Promise((r) => setTimeout(r, 2500));
        }
        router.push(`/admin/catalogue/${json.slug}/edit`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Save failed. Check your connection and retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-0">
        <FormSection title="Status & order">
          <Row>
            <Field label="Status" info={INFO.status}>
              <Select value={f.status} onChange={(e) => set("status", e.target.value as FormState["status"])}>
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Grid position" hint="lower sorts first" info={INFO.order}>
              <TextInput
                type="number"
                value={f.order}
                onChange={(e) => set("order", e.target.value)}
              />
            </Field>
          </Row>
        </FormSection>

        <FormSection title="Identity">
          {mode === "create" && (
            <p className="border-l-2 border-gilt/50 bg-gilt/5 px-3 py-2 text-[11.5px] text-ink-2">
              The storefront renders three fragrance slugs and one set slug. A new
              slug is a valid record and fully editable here, but a developer must
              register it in <code>src/lib/catalog.ts</code> for it to show on the
              shopper-facing site.
            </p>
          )}
          {mode === "create" && (
            <Row>
              <Field label="Kind" info={INFO.kind}>
                <Select
                  value={f.kind}
                  onChange={(e) => set("kind", e.target.value as FormState["kind"])}
                >
                  <option value="fragrance">fragrance</option>
                  <option value="set">set</option>
                </Select>
              </Field>
              <Field
                label="Slug"
                hint="lowercase-with-hyphens · permanent"
                info={INFO.slug}
              >
                <TextInput
                  value={f.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  placeholder="aurevan"
                />
              </Field>
            </Row>
          )}
          <Row>
            {mode === "edit" ? (
              <Field label="Slug" hint="permanent" info={INFO.slug}>
                <TextInput value={f.slug} disabled />
              </Field>
            ) : null}
            <Field
              label="SKU"
              hint={mode === "edit" ? "permanent" : "UPPER-CASE-HYPHENS"}
              info={INFO.sku}
            >
              <TextInput
                value={f.sku}
                onChange={(e) => set("sku", e.target.value)}
                disabled={mode === "edit"}
                placeholder="RRS-EXT-AUREVAN-50"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Name" info={INFO.name}>
              <TextInput value={f.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="Pronunciation" hint="optional">
              <TextInput
                value={f.pronunciation}
                onChange={(e) => set("pronunciation", e.target.value)}
              />
            </Field>
          </Row>
          <Field label="Title" hint="the short line under the name" info={INFO.title}>
            <TextInput value={f.title} onChange={(e) => set("title", e.target.value)} />
          </Field>
        </FormSection>

        <FormSection title="Story">
          <Field label="Poem" hint="≤ 600 chars" info={INFO.poem}>
            <TextArea
              rows={3}
              value={f.poem}
              onChange={(e) => set("poem", e.target.value)}
            />
          </Field>
          <Field label="Impression" hint="one line" info={INFO.impression}>
            <TextInput
              value={f.impression}
              onChange={(e) => set("impression", e.target.value)}
            />
          </Field>
          <Row>
            <Field label="Mood" hint="1–3, comma-separated" info={INFO.mood}>
              <TextInput value={f.mood} onChange={(e) => set("mood", e.target.value)} />
            </Field>
            <Field label="Wear occasion" info={INFO.wearOccasion}>
              <TextInput
                value={f.wearOccasion}
                onChange={(e) => set("wearOccasion", e.target.value)}
              />
            </Field>
          </Row>
        </FormSection>

        <FormSection title="Notes">
          <Field label="Notes" hint="1–12, comma-separated" info={INFO.notes}>
            <TextInput value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <Row>
            <Field label="Arrive" info={INFO.phase}>
              <TextInput value={f.arrive} onChange={(e) => set("arrive", e.target.value)} />
            </Field>
            <Field label="Linger" info={INFO.phase}>
              <TextInput value={f.linger} onChange={(e) => set("linger", e.target.value)} />
            </Field>
          </Row>
          <Row>
            <Field label="Stay" info={INFO.phase}>
              <TextInput value={f.stay} onChange={(e) => set("stay", e.target.value)} />
            </Field>
            <Field label="Concentration" info={INFO.concentration}>
              <Select
                value={f.concentration}
                onChange={(e) =>
                  set("concentration", e.target.value as FormState["concentration"])
                }
              >
                {CONCENTRATIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
          </Row>
          <Row>
            <Field label="Longevity" hint="0–4" info={INFO.longevity}>
              <Select
                value={f.longevity}
                onChange={(e) => set("longevity", e.target.value)}
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sillage" info={INFO.sillage}>
              <TextInput value={f.sillage} onChange={(e) => set("sillage", e.target.value)} />
            </Field>
          </Row>
        </FormSection>

        <FormSection title="Pricing">
          <Row>
            <Field label="Price (₹)" info={INFO.price}>
              <TextInput
                inputMode="decimal"
                value={f.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </Field>
            <Field label="MRP (₹)" hint="≥ price" info={INFO.mrp}>
              <TextInput
                inputMode="decimal"
                value={f.mrp}
                onChange={(e) => set("mrp", e.target.value)}
              />
            </Field>
          </Row>
          <Row>
            <Field label="Volume (ml)" info={INFO.volumeMl}>
              <TextInput
                type="number"
                value={f.volumeMl}
                onChange={(e) => set("volumeMl", e.target.value)}
              />
            </Field>
            <Field label="HSN code" info={INFO.hsnCode}>
              <TextInput value={f.hsnCode} onChange={(e) => set("hsnCode", e.target.value)} />
            </Field>
          </Row>
        </FormSection>

        <FormSection title="Inventory">
          <Field
            label="Low-stock threshold"
            hint="the dashboard flags at or below this"
            info={INFO.threshold}
          >
            <TextInput
              type="number"
              value={f.lowStockThreshold}
              onChange={(e) => set("lowStockThreshold", e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center">
              <Checkbox
                label="Track inventory"
                checked={f.trackInventory}
                onChange={(e) => set("trackInventory", e.target.checked)}
              />
              <InfoTip>{INFO.trackInventory}</InfoTip>
            </span>
            <span className="inline-flex items-center">
              <Checkbox
                label="Allow backorder"
                checked={f.allowBackorder}
                onChange={(e) => set("allowBackorder", e.target.checked)}
              />
              <InfoTip>{INFO.allowBackorder}</InfoTip>
            </span>
          </div>
          {mode === "edit" && (
            <p className="text-[11px] text-ink-3">
              Change the stock level from the panel on the right — every movement
              is ledgered.
            </p>
          )}
        </FormSection>

        <FormSection
          title="Homepage hero banner"
          description="The full-screen image behind the headline on this fragrance's slide of the homepage carousel. Upload a landscape crop for desktop and a portrait crop for phones."
        >
          <div className="grid grid-cols-2 gap-3 sm:max-w-[360px]">
            <UploadField
              label="Desktop · 16:9"
              info={IMG_INFO.hero}
              value={f.hero}
              onChange={(v) => set("hero", v)}
            />
            <UploadField
              label="Mobile · 9:16"
              info={IMG_INFO.heroPortrait}
              value={f.heroPortrait}
              onChange={(v) => set("heroPortrait", v)}
            />
          </div>
        </FormSection>

        <FormSection title="Product images" description="A photo replaces the vector flacon on the product-page gallery and the collection card.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <UploadField label="Flat (packshot)" info={IMG_INFO.flat} value={f.flat} onChange={(v) => set("flat", v)} />
            <UploadField label="Box" info={IMG_INFO.box} value={f.box} onChange={(v) => set("box", v)} />
            <UploadField label="OG image" info={IMG_INFO.og} value={f.og} onChange={(v) => set("og", v)} />
          </div>
          <div>
            <span className="inline-flex items-center text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
              Gallery
              <InfoTip>{IMG_INFO.gallery}</InfoTip>
            </span>
            <div className="mt-1 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {f.gallery.map((g, i) => (
                <UploadField
                  key={g.assetId + i}
                  label={`#${i + 1}`}
                  value={g}
                  onChange={(v) =>
                    set(
                      "gallery",
                      v
                        ? f.gallery.map((x, j) => (j === i ? v : x))
                        : f.gallery.filter((_, j) => j !== i),
                    )
                  }
                />
              ))}
              {f.gallery.length < 12 && (
                <UploadField
                  label="Add"
                  value={null}
                  onChange={(v) => v && set("gallery", [...f.gallery, v])}
                />
              )}
            </div>
          </div>
        </FormSection>

        <FormSection title="SEO">
          <Field label="Meta title" hint="≤ 70 chars" info={INFO.metaTitle}>
            <TextInput
              value={f.metaTitle}
              onChange={(e) => set("metaTitle", e.target.value)}
            />
          </Field>
          <Field label="Meta description" hint="≤ 180 chars" info={INFO.metaDescription}>
            <TextArea
              rows={2}
              value={f.metaDescription}
              onChange={(e) => set("metaDescription", e.target.value)}
            />
          </Field>
          <UploadField
            label="OG image override"
            info={IMG_INFO.ogOverride}
            value={f.ogImageRef}
            onChange={(v) => set("ogImageRef", v)}
            className="max-w-[180px]"
          />
        </FormSection>

        <details className="border-t border-line py-5">
          <summary className="cursor-pointer text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase">
            Appearance (brand palette)
          </summary>
          <div className="mt-3 grid gap-3">
            <p className="text-[11px] leading-snug text-ink-3">{INFO.colour}</p>
            {(
              [
                ["juiceHex", "Juice hex"],
                ["accent", "Accent (css / var)"],
                ["ground", "Card ground (gradient)"],
                ["onGround", "Text on ground (hex)"],
                ["onGroundInverse", "Inverse text (hex)"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <div className="flex items-center gap-2">
                  <span
                    className="size-6 shrink-0 rounded-[2px] border border-line"
                    style={{ background: f[key] }}
                  />
                  <TextInput
                    value={f[key]}
                    onChange={(e) => set(key, e.target.value)}
                  />
                </div>
              </Field>
            ))}
          </div>
        </details>

        {f.kind === "set" && (
          <FormSection title="Set — components & credit">
            <span className="inline-flex items-center text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
              Vials (2–6)
              <InfoTip>{INFO.components}</InfoTip>
            </span>
            {f.components.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={c.productSlug}
                  onChange={(e) =>
                    set(
                      "components",
                      f.components.map((x, j) =>
                        j === i ? { ...x, productSlug: e.target.value } : x,
                      ),
                    )
                  }
                  className="flex-1"
                >
                  <option value="">Choose a fragrance…</option>
                  {fragranceOptions.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.name}
                    </option>
                  ))}
                </Select>
                <TextInput
                  type="number"
                  value={c.volumeMl}
                  onChange={(e) =>
                    set(
                      "components",
                      f.components.map((x, j) =>
                        j === i ? { ...x, volumeMl: e.target.value } : x,
                      ),
                    )
                  }
                  className="w-20"
                />
                <span className="text-[11px] text-ink-3">ml</span>
                {f.components.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        "components",
                        f.components.filter((_, j) => j !== i),
                      )
                    }
                    className="text-ink-3 hover:text-error"
                  >
                    <Icon name="close" className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {f.components.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  set("components", [
                    ...f.components,
                    { productSlug: "", volumeMl: "10" },
                  ])
                }
                className="text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
              >
                + Add vial
              </button>
            )}
            <Row>
              <Field label="Credit amount (₹)" info={INFO.creditAmount}>
                <TextInput
                  inputMode="decimal"
                  value={f.creditAmount}
                  onChange={(e) => set("creditAmount", e.target.value)}
                />
              </Field>
              <Field label="Applies to" info={INFO.creditAppliesTo}>
                <Select
                  value={f.creditAppliesTo}
                  onChange={(e) =>
                    set(
                      "creditAppliesTo",
                      e.target.value as FormState["creditAppliesTo"],
                    )
                  }
                >
                  <option value="first_full_size">first full-size</option>
                  <option value="any_order">any order</option>
                </Select>
              </Field>
            </Row>
            <Row>
              <Field label="Per customer" info={INFO.creditPerCustomer}>
                <TextInput
                  type="number"
                  value={f.creditPerCustomer}
                  onChange={(e) => set("creditPerCustomer", e.target.value)}
                />
              </Field>
              <Field label="Expiry (days)" hint="blank = never" info={INFO.creditExpiry}>
                <TextInput
                  type="number"
                  value={f.creditExpiryDays}
                  onChange={(e) => set("creditExpiryDays", e.target.value)}
                />
              </Field>
            </Row>
            <Checkbox
              label="Credit is stackable"
              checked={f.creditStackable}
              onChange={(e) => set("creditStackable", e.target.checked)}
            />
          </FormSection>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-[3px] bg-cta px-4 py-2 text-[11px] tracking-[0.12em] text-w0 uppercase hover:bg-cta-hover disabled:opacity-40"
        >
          {busy ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-3 py-2 text-[11px] tracking-[0.1em] text-ink-2 uppercase hover:border-ink hover:text-ink"
        >
          <Icon name="external" className="size-3.5" />
          Preview
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-[11.5px] text-ok">
            <Icon name="check" className="size-3.5" /> Saved
          </span>
        )}
        {error && (
          <span className="flex items-center gap-1.5 text-[11.5px] text-error">
            <Icon name="alert" className="size-3.5" /> {error}
          </span>
        )}
      </div>

      <ProductPreview
        open={previewOpen}
        data={buildPreview()}
        onClose={() => setPreviewOpen(false)}
      />
    </Card>
  );
}
