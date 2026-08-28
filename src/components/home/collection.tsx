"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { Container } from "@/components/ui/container";
import { ProductCard } from "./product-card";
import { fragranceList } from "@/lib/products";

/**
 * The collection: a full-bleed 3-up grid of oversized fragrance cards with 6px
 * gutters and no page-edge padding (the head keeps the shell). Cards rise +
 * fade in on scroll via ScrollTrigger.batch (so the mobile stack staggers as
 * each card arrives, not all at once), and a single light sheen sweeps across
 * each card the first time it lands. Reduced motion: everything just present.
 */
export function Collection() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = sectionRef.current;
      if (!root) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-card]", root);
      if (!cards.length) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(cards, { autoAlpha: 0, y: 30 });
        gsap.set(root.querySelectorAll("[data-sheen]"), { xPercent: -60 });

        ScrollTrigger.batch(cards, {
          start: "top 85%",
          once: true,
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.8,
              stagger: 0.09,
              ease: "power3.out",
              overwrite: true,
            });
            batch.forEach((card) => {
              const sheen = card.querySelector("[data-sheen]");
              if (!sheen) return;
              gsap.fromTo(
                sheen,
                { xPercent: -60 },
                {
                  xPercent: 60,
                  duration: 1.3,
                  ease: "power2.inOut",
                  delay: 0.25,
                  overwrite: true,
                },
              );
            });
          },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(cards, { clearProps: "all" });
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="shop" className="pt-[clamp(40px,6vw,72px)]">
      <Container className="border-t border-line pt-[clamp(16px,2vw,24px)] pb-[clamp(20px,3vw,34px)]">
        <p className="eyebrow mb-[clamp(10px,1.4vw,16px)]">The Collection</p>
        <div className="flex flex-wrap items-baseline justify-between gap-x-10 gap-y-2">
          <h2 className="max-w-[44ch] text-[clamp(1.35rem,2.4vw,2.05rem)] leading-[1.12] tracking-[-0.01em] text-balance">
            Three extraits, three ways to be remembered.
          </h2>
          <Link
            href="#quiz"
            className="nav-underline shrink-0 text-[11px] tracking-[0.14em] text-ink-2 uppercase transition-colors hover:text-ink"
          >
            Not sure? Take the quiz →
          </Link>
        </div>
      </Container>

      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        {fragranceList.map((f, i) => (
          <ProductCard key={f.slug} fragrance={f} index={i} />
        ))}
      </div>
    </section>
  );
}
