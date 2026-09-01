import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Flacon } from "@/components/ui/flacon";
import { Icon } from "@/components/ui/icon";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { PdpGallery } from "@/components/product/pdp-gallery";
import { Accordion } from "@/components/ui/accordion";
import { PdpReviews } from "@/components/product/pdp-reviews";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/catalog";
import { SITE, absoluteUrl } from "@/lib/site";
import { breadcrumbJsonLd } from "@/lib/seo";
import {
  getFragranceBySlug,
  getFragranceSlugs,
  getRelatedFragrances,
} from "@/server/data/catalog";

// A newly-activated product renders on first request; unknown slugs 404.
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getFragranceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/fragrances/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFragranceBySlug(slug);
  if (!f) return {};
  const title = f.seo.metaTitle ?? `${f.name} — ${f.title}`;
  const description =
    f.seo.metaDescription ?? `${f.name} Extrait de Parfum. ${f.poem}`;
  return {
    title,
    description,
    alternates: { canonical: `/fragrances/${slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/fragrances/${slug}`),
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

const REASSURE = [
  { label: "Ships in 24–48 hrs", icon: "truck" },
  { label: "Cash on delivery", icon: "banknote" },
  { label: "Easy returns", icon: "returns" },
] as const;

const DETAILS = [
  {
    q: "How to wear",
    a: "Two or three sprays to pulse points, from about 15 cm. Don’t rub — extrait sits close, so let it settle rather than reapplying.",
  },
  {
    q: "What’s in the box",
    a: "One 50 ml Extrait de Parfum in the THE RARESKIN flacon, inside a recyclable outer carton with a short card on how to wear it.",
  },
  {
    q: "Shipping & returns",
    a: "Free shipping across India, dispatched within 24–48 hours, cash on delivery available. Unopened bottles can be returned within 7 days; opened bottles only if faulty or damaged. Full detail on the Shipping and Returns pages.",
  },
];

export default async function FragrancePage({
  params,
}: PageProps<"/fragrances/[slug]">) {
  const { slug } = await params;
  const f = await getFragranceBySlug(slug);
  if (!f) notFound();

  const related = await getRelatedFragrances(slug);

  const url = absoluteUrl(`/fragrances/${slug}`);
  const availability = f.available
    ? f.stock > 0
      ? "https://schema.org/InStock"
      : "https://schema.org/PreOrder"
    : "https://schema.org/OutOfStock";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${f.name} Extrait de Parfum`,
    description: `${f.name} — ${f.title}. ${f.poem}`,
    sku: slug,
    brand: { "@type": "Brand", name: SITE.name, logo: absoluteUrl("/icon") },
    category: "Fragrance > Extrait de Parfum",
    image: `${url}/opengraph-image`,
    url,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Concentration", value: "Extrait de Parfum" },
      { "@type": "PropertyValue", name: "Volume", value: `${f.volumeMl} ml` },
      { "@type": "PropertyValue", name: "Notes", value: f.notes.join(", ") },
    ],
    offers: {
      "@type": "Offer",
      price: String(f.price),
      priceCurrency: SITE.currency,
      availability,
      url,
      priceValidUntil: "2027-03-31",
      seller: { "@type": "Organization", name: SITE.legalName },
    },
  };

  const breadcrumbJson = breadcrumbJsonLd([
    { name: "Fragrances", path: "/#shop" },
    { name: f.name, path: `/fragrances/${slug}` },
  ]);

  const phases = [
    ["Arrive", f.notesByPhase.arrive],
    ["Linger", f.notesByPhase.linger],
    ["Stay", f.notesByPhase.stay],
  ] as const;

  return (
    <main
      id="main"
      className="pt-[calc(var(--announce-h)+var(--header-h)+2rem)] lg:pt-[calc(var(--announce-h)+var(--header-h)+3.5rem)]"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJson) }}
      />

      <Container className="max-w-[1280px]">
        <nav
          aria-label="Breadcrumb"
          className="text-[11px] tracking-[0.06em] text-ink-3 uppercase"
        >
          <Link href="/" className="transition-colors hover:text-ink">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/#shop" className="transition-colors hover:text-ink">
            Fragrances
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink-2">{f.name}</span>
        </nav>

        <div
          className="mt-[clamp(20px,3vw,34px)] grid gap-[clamp(28px,4vw,60px)] pb-[clamp(48px,8vw,90px)] lg:grid-cols-2 lg:items-start"
          style={{ "--frag": f.accent } as CSSProperties}
        >
          <PdpGallery slug={f.slug} name={f.name} />

          <div>
            <h1 className="text-[clamp(2rem,4.4vw,2.9rem)] font-light tracking-[0.1em]">
              {f.name}
            </h1>
            <p className="mt-2 text-[11.5px] tracking-[0.04em] text-ink-3">
              {f.pronunciation}
            </p>
            <p className="mt-1 text-[10px] tracking-[0.24em] text-ink-3 uppercase">
              Extrait de Parfum
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-[11px] tracking-[0.18em] text-ink-2 uppercase">
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: f.accent }}
              />
              {f.title}
            </p>
            <p className="serif-italic mt-3.5 max-w-[40ch] text-[1.15rem] leading-[1.5] text-ink-2">
              {f.poem}
            </p>

            {/* buy box — the page's conversion focus */}
            <div className="mt-6 rounded-[4px] border border-line-2 bg-surface p-[clamp(18px,3vw,26px)]">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
                <span className="text-[clamp(1.8rem,3.6vw,2.4rem)] leading-none font-light tracking-[0.01em]">
                  {formatINR(f.price)}
                </span>
                <s className="text-[15px] text-ink-3">{formatINR(f.mrp)}</s>
                <span className="rounded-full bg-cta px-2.5 py-1 text-[9px] tracking-[0.14em] text-w0 uppercase">
                  Launch offer
                </span>
              </div>
              <p className="mt-2 text-[11px] tracking-[0.03em] text-ink-3">
                Save {formatINR(f.mrp - f.price)} &middot; {f.volumeMl} ml
                Extrait &middot; price all-inclusive
              </p>

              <div className="mt-4">
                <span className="mb-2 block text-[10px] tracking-[0.14em] text-ink-3 uppercase">
                  Size
                </span>
                <div className="flex gap-2">
                  <span className="rounded-[2px] border border-ink-2 bg-bg px-4 py-2.5 text-[12px]">
                    50 ml
                  </span>
                  <span className="rounded-[2px] border border-line-2 px-4 py-2.5 text-[12px] text-ink-3">
                    100 ml · soon
                  </span>
                </div>
              </div>

              <AddToBagButton
                sku={f.sku}
                name={f.name}
                price={f.price}
                mrp={f.mrp}
                fragrance={f.slug}
                href={`/fragrances/${f.slug}`}
                meta={`Extrait · ${f.volumeMl} ml`}
                label={`Add to bag · ${formatINR(f.price)}`}
                variant="solid"
                size="lg"
                className="mt-4 w-full"
              />

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[10px] tracking-[0.04em] text-ink-3 uppercase">
                {REASSURE.map((r) => (
                  <span key={r.label} className="inline-flex items-center gap-1.5">
                    <Icon name={r.icon} className="size-[15px] text-ink-2" />
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            <section className="mt-8 border-t border-line pt-7">
              <h2 className="mb-4 text-[10.5px] font-normal tracking-[0.16em] text-ink-3 uppercase">
                How it unfolds
              </h2>
              <dl>
                {phases.map(([k, v], i) => (
                  <div
                    key={k}
                    className={cn(
                      "grid grid-cols-[84px_1fr] gap-3.5 py-3",
                      i < phases.length - 1 && "border-b border-line",
                    )}
                  >
                    <dt className="pt-[3px] text-[9.5px] tracking-[0.16em] text-ink-3 uppercase">
                      {k}
                    </dt>
                    <dd className="text-[14px]">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {f.notes.map((n) => (
                  <span
                    key={n}
                    className="rounded-full border border-line-2 px-3 py-1.5 text-[10.5px] tracking-[0.06em] text-ink-2 uppercase"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </section>

            <section className="mt-8 border-t border-line pt-7">
              <h2 className="mb-4 text-[10.5px] font-normal tracking-[0.16em] text-ink-3 uppercase">
                Specification
              </h2>
              <dl className="rounded-[3px] border border-line text-[12.5px]">
                <SpecRow label="Concentration">
                  Extrait · 25–30%{" "}
                  <span className="text-ink-3">(indicative)</span>
                </SpecRow>
                <SpecRow label="Longevity">
                  <span className="flex gap-[3px]">
                    {[0, 1, 2, 3].map((i) => (
                      <i
                        key={i}
                        className="h-[3px] w-[18px]"
                        style={{
                          background:
                            i < f.longevity
                              ? f.accent
                              : "var(--color-line-2)",
                        }}
                      />
                    ))}
                  </span>
                  <span className="text-ink-3">pending wear tests</span>
                </SpecRow>
                <SpecRow label="Sillage">{f.sillage}</SpecRow>
                <SpecRow label="Best worn">{f.wearOccasion}</SpecRow>
                <SpecRow label="Volume" last>
                  {f.volumeMl} ml &nbsp;|&nbsp; 1.7 FL.OZ
                </SpecRow>
              </dl>
            </section>

            <section className="mt-8 border-t border-line pt-7">
              <h2 className="mb-1 text-[10.5px] font-normal tracking-[0.16em] text-ink-3 uppercase">
                Details
              </h2>
              <Accordion items={DETAILS} />
            </section>
          </div>
        </div>

        <PdpReviews fragrance={f} />

        <section className="border-t border-line py-[clamp(36px,6vw,64px)]">
          <h2 className="mb-5 text-[10.5px] font-normal tracking-[0.16em] text-ink-3 uppercase">
            You might also like
          </h2>
          <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0">
            {related.map((r) => (
              <article
                key={r.slug}
                className="w-[76%] shrink-0 snap-start overflow-hidden rounded-[3px] border border-line bg-surface sm:w-auto sm:shrink"
              >
                <Link
                  href={`/fragrances/${r.slug}`}
                  aria-label={`Open ${r.name}`}
                  className="relative grid aspect-[4/3.4] place-items-center border-b border-line"
                  style={{
                    background:
                      "linear-gradient(165deg, var(--color-w0), var(--color-w1))",
                  }}
                >
                  <span
                    className="absolute top-3 right-3 size-2.5 rounded-full ring-[3px] ring-w1"
                    style={{ background: r.juice }}
                  />
                  <span className="block w-[34%]">
                    <Flacon fragrance={r.slug} />
                  </span>
                </Link>
                <div className="p-3.5">
                  <p className="text-[1.15rem] tracking-[0.1em]">{r.name}</p>
                  <p className="mt-1 text-[10px] tracking-[0.14em] text-ink-3 uppercase">
                    {r.title}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[13px]">
                      {formatINR(r.price)}
                      <s className="ml-1 text-[11px] text-ink-3">
                        {formatINR(r.mrp)}
                      </s>
                    </span>
                    <AddToBagButton
                      sku={r.sku}
                      name={r.name}
                      price={r.price}
                      mrp={r.mrp}
                      fragrance={r.slug}
                      href={`/fragrances/${r.slug}`}
                      meta={`Extrait · ${r.volumeMl} ml`}
                      label="Add"
                      variant="onDark"
                      size="sm"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </Container>
    </main>
  );
}

function SpecRow({
  label,
  children,
  last,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[120px_1fr]",
        !last && "border-b border-line",
      )}
    >
      <dt className="border-r border-line px-3.5 py-2.5 text-[9.5px] tracking-[0.12em] text-ink-3 uppercase">
        {label}
      </dt>
      <dd className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
        {children}
      </dd>
    </div>
  );
}
