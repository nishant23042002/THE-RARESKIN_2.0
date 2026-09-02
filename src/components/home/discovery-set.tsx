import type { CSSProperties } from "react";
import { Container } from "@/components/ui/container";
import { Flacon } from "@/components/ui/flacon";
import { Reveal } from "@/components/ui/reveal";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import {
  cloudinaryVariant,
  formatINR,
  type DiscoverySetInfo,
  type Fragrance,
} from "@/lib/catalog";

/**
 * The Discovery Set — a dark two-column band: the pitch + credit logic + a
 * single prominent "add the set" CTA on the left, three bordered 10 ml vial
 * cards on the right. The set price is credited in full toward a first 50 ml
 * bottle; that's the whole argument, so it sits right next to the price and the
 * button. Data comes from the catalogue (`@/server/data/catalog`).
 */
export function DiscoverySet({
  set,
  fragrances,
}: {
  set: DiscoverySetInfo;
  fragrances: Fragrance[];
}) {
  const vialShadow: CSSProperties = {
    filter: "drop-shadow(0 18px 22px rgba(0,0,0,0.4))",
  };

  return (
    <section
      id="discovery"
      className="flex min-h-svh flex-col justify-center scroll-mt-[calc(var(--announce-h)+var(--header-h)+16px)] border-y border-line bg-w4 text-w0"
    >
      <Container className="grid gap-[clamp(40px,7vw,72px)] py-[clamp(48px,9vw,104px)] min-[940px]:grid-cols-[1.05fr_0.95fr] min-[940px]:items-center min-[940px]:gap-20">
        <Reveal>
          <span className="eyebrow mb-3.5 block text-w0/68">The Discovery Set</span>
          <h2 className="max-w-[20ch] text-[clamp(2rem,5vw,3.1rem)]">
            {set.headline}
          </h2>
          <p className="mt-4 max-w-[46ch] text-[15px] text-w0/65">{set.detail}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-5">
            <span className="text-[clamp(1.15rem,2.2vw,1.45rem)]">
              {formatINR(set.price)}
              <s className="ml-2 text-[0.72em] opacity-60">
                {formatINR(set.mrp)}
              </s>
              <span className="mt-2 block text-[10px] tracking-[0.13em] text-w0/68 uppercase">
                {set.vialCount} &times; {set.perVialMl} ml &middot; credited to
                your first bottle
              </span>
            </span>
            <AddToBagButton
              sku={set.sku}
              name={set.name}
              price={set.price}
              mrp={set.mrp}
              href="/discovery-set"
              meta={`${set.vialCount} × ${set.perVialMl} ml`}
              label="Add the Discovery Set"
              variant="solidLight"
              size="md"
            />
          </div>

          <p className="mt-6 text-[9.5px] tracking-[0.06em] text-w0/60 uppercase">
            One credit per customer &middot; COD available &middot; Free shipping
            across India
          </p>
        </Reveal>

        <Reveal delay={0.08} className="grid grid-cols-3 gap-2">
          {fragrances.map((f) => (
            <figure
              key={f.slug}
              className="flex flex-col items-center gap-4 border border-white/[0.13] bg-white/[0.02] px-2.5 py-[clamp(18px,2.6vw,30px)] text-center"
            >
              {(() => {
                const photo = cloudinaryVariant(f.images.flat ?? f.images.hero, {
                  w: 220,
                });
                return photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photo}
                    alt={f.name}
                    className="block w-[72%] max-w-[104px]"
                    style={vialShadow}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="block w-[58%] max-w-[76px]" style={vialShadow}>
                    <Flacon fragrance={f.slug} />
                  </span>
                );
              })()}
              <figcaption className="flex flex-col gap-1.5">
                <span className="text-[0.92rem] tracking-[0.12em]">{f.name}</span>
                <span className="text-[8px] tracking-[0.18em] text-w0/65 uppercase">
                  {f.mood[0]}
                </span>
                <span className="text-[8px] tracking-[0.1em] text-w0/60">
                  {set.perVialMl} ml
                </span>
              </figcaption>
            </figure>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
