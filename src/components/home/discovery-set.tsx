import type { CSSProperties } from "react";
import { Container } from "@/components/ui/container";
import { Flacon } from "@/components/ui/flacon";
import { Reveal } from "@/components/ui/reveal";
import { AddToBagButton } from "@/components/cart/add-to-bag-button";
import { fragranceList, DISCOVERY_SET, formatINR } from "@/lib/products";

/**
 * The Discovery Set — a dark two-column band: the pitch + credit logic + a
 * single prominent "add the set" CTA on the left, three bordered 10 ml vial
 * cards on the right. The ₹799 is credited in full toward a first 50 ml bottle;
 * that's the whole argument, so it sits right next to the price and the button.
 */
export function DiscoverySet() {
  const vialShadow: CSSProperties = {
    filter: "drop-shadow(0 18px 22px rgba(0,0,0,0.4))",
  };

  return (
    <section
      id="discovery"
      className="scroll-mt-[calc(var(--announce-h)+var(--header-h)+16px)] border-y border-ink bg-w4 text-w0"
    >
      <Container className="grid gap-[clamp(40px,7vw,72px)] py-[clamp(64px,12vw,140px)] min-[940px]:grid-cols-[1.05fr_0.95fr] min-[940px]:items-center min-[940px]:gap-20">
        <Reveal>
          <span className="eyebrow mb-3.5 block text-w0/50">The Discovery Set</span>
          <h2 className="max-w-[20ch] text-[clamp(2rem,5vw,3.1rem)]">
            {DISCOVERY_SET.headline}
          </h2>
          <p className="mt-4 max-w-[46ch] text-[15px] text-w0/65">
            {DISCOVERY_SET.detail}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-5">
            <span className="text-[clamp(1.15rem,2.2vw,1.45rem)]">
              {formatINR(DISCOVERY_SET.price)}
              <s className="ml-2 text-[0.72em] opacity-40">
                {formatINR(DISCOVERY_SET.mrp)}
              </s>
              <span className="mt-2 block text-[10px] tracking-[0.13em] text-w0/50 uppercase">
                {DISCOVERY_SET.vialCount} &times; {DISCOVERY_SET.perVialMl} ml
                &middot; credited to your first bottle
              </span>
            </span>
            <AddToBagButton
              sku={DISCOVERY_SET.slug}
              name={DISCOVERY_SET.name}
              price={DISCOVERY_SET.price}
              mrp={DISCOVERY_SET.mrp}
              href="/discovery-set"
              meta={`${DISCOVERY_SET.vialCount} × ${DISCOVERY_SET.perVialMl} ml`}
              label="Add the Discovery Set"
              variant="solidLight"
              size="md"
            />
          </div>

          <p className="mt-6 text-[9.5px] tracking-[0.06em] text-w0/35 uppercase">
            One credit per customer &middot; COD available &middot; Free shipping
            across India &middot; [placeholder terms]
          </p>
        </Reveal>

        <Reveal delay={0.08} className="grid grid-cols-3 gap-2">
          {fragranceList.map((f) => (
            <figure
              key={f.slug}
              className="flex flex-col items-center gap-4 border border-white/[0.13] bg-white/[0.02] px-2.5 py-[clamp(18px,2.6vw,30px)] text-center"
            >
              <span
                className="block w-[58%] max-w-[76px]"
                style={vialShadow}
              >
                <Flacon fragrance={f.slug} />
              </span>
              <figcaption className="flex flex-col gap-1.5">
                <span className="text-[0.92rem] tracking-[0.12em]">{f.name}</span>
                <span className="text-[8px] tracking-[0.18em] text-w0/45 uppercase">
                  {f.mood[0]}
                </span>
                <span className="text-[8px] tracking-[0.1em] text-w0/35">
                  {DISCOVERY_SET.perVialMl} ml
                </span>
              </figcaption>
            </figure>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
