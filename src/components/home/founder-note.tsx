"use client";

import Link from "next/link";
import { useRef } from "react";

import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";
import { Mark } from "@/components/ui/mark";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

/**
 * "The first letter" — the founder's note, on the homepage, staged as the
 * keepsake card that comes tucked in the box rather than a web section. A
 * lighter paper laid on the ground, the founder's portrait on the left (on top,
 * on a phone), the RARESKIN wordmark as a letterhead, a condensed excerpt in his
 * own words, and the visitor cast — truthfully, the store hasn't launched — as
 * one of the first to wear it.
 *
 * The portrait is a placeholder panel until the real photo lands — drop a file
 * at `/public/brand/founder.jpg` and swap the `<FounderPortrait>` body for an
 * `<img>` (see the pre-launch checklist in README.md).
 *
 * Motion: the portrait + wordmark settle in, then the lines rise one after
 * another, like a letter being read. Static under reduced motion.
 */

const LINES = [
  "I didn’t set out to make another perfume. I wanted to make an experience — a scent that keeps telling your story long after you’ve left the room.",
  "This is only the beginning, and I’m grateful you’re here for it.",
];

function FounderPortrait() {
  return (
    <div
      data-rise
      className="relative flex aspect-[4/3] items-center justify-center border-b border-line bg-[linear-gradient(155deg,var(--color-w0),var(--color-w1)_55%,var(--color-w2))] md:aspect-auto md:h-full md:border-b-0 md:border-r"
    >
      {/* swap for <img src="/brand/founder.jpg" className="absolute inset-0 size-full object-cover" alt="Vijay More" /> */}
      <Mark className="w-14 text-ink/12" strokeWidth={1.4} />
      <span className="absolute bottom-3 left-3 text-[8.5px] tracking-[0.16em] text-ink-3/80 uppercase">
        Founder portrait
      </span>
      {/* a faint highlight on the inner edge — the crease of the fold */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/50 md:inset-y-0 md:right-0 md:left-auto md:h-auto md:w-px"
      />
    </div>
  );
}

export function FounderNote() {
  const rootRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const rise = gsap.utils.toArray<HTMLElement>("[data-rise]", root);

      if (reduced) {
        gsap.set(rise, { clearProps: "all" });
        return;
      }

      gsap.set(rise, { autoAlpha: 0, y: 16 });
      gsap.to(rise, {
        autoAlpha: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: root, start: "top 74%", once: true },
      });
    },
    { scope: rootRef, dependencies: [reduced] },
  );

  return (
    <section
      ref={rootRef}
      id="founder"
      className="scroll-mt-[calc(var(--announce-h)+var(--header-h)+16px)] border-t border-line bg-bg py-[clamp(60px,10vw,120px)]"
    >
      <Container className="flex justify-center">
        <figure className="w-full max-w-[900px] overflow-hidden rounded-[4px] border border-line bg-surface shadow-[0_1px_0_rgba(255,255,255,0.7),0_28px_60px_-38px_rgba(35,33,32,0.3)] lg:-rotate-[0.5deg]">
          <div className="grid md:grid-cols-[minmax(0,clamp(220px,32%,318px))_1fr]">
            <FounderPortrait />

            <div className="relative px-[clamp(24px,5vw,60px)] py-[clamp(32px,5vw,64px)]">
              <div className="flex items-start justify-between gap-4">
                <p className="eyebrow" data-rise>
                  The first letter
                </p>
                <p
                  className="text-[9.5px] tracking-[0.14em] text-ink-3 uppercase"
                  data-rise
                >
                  Roha, Maharashtra
                </p>
              </div>

              {/* the wordmark, like a letterhead */}
              <span data-rise className="mt-[clamp(20px,3vw,32px)] block">
                <Logo
                  className="text-ink"
                  style={{ width: "clamp(146px, 22vw, 196px)" }}
                />
              </span>

              <blockquote className="mt-[clamp(20px,3vw,30px)] space-y-[clamp(13px,1.8vw,18px)]">
                {LINES.map((line) => (
                  <p
                    key={line.slice(0, 18)}
                    data-rise
                    className="serif text-[clamp(1.1rem,1.9vw,1.5rem)] leading-[1.5] text-ink"
                  >
                    {line}
                  </p>
                ))}
              </blockquote>

              <figcaption
                className="mt-[clamp(22px,3.4vw,36px)] flex flex-col gap-y-5 border-t border-line pt-[clamp(18px,2.6vw,24px)] sm:flex-row sm:items-end sm:justify-between sm:gap-x-8"
                data-rise
              >
                <span>
                  <span className="serif-italic block text-[clamp(1.4rem,2.6vw,1.9rem)] leading-none text-ink">
                    Vijay More
                  </span>
                  <span className="mt-2 block text-[9.5px] tracking-[0.16em] text-ink-3 uppercase">
                    Founder &middot; THE RARESKIN
                  </span>
                </span>

                <span className="sm:text-right">
                  <span className="block text-[10px] tracking-[0.14em] text-ink-3 uppercase">
                    You&rsquo;re among the first to wear it
                  </span>
                  <Link
                    href="/the-idea"
                    className="nav-underline mt-2 inline-flex items-center gap-2 text-[11px] tracking-[0.14em] text-ink uppercase"
                  >
                    Read the whole letter <span aria-hidden>&rarr;</span>
                  </Link>
                </span>
              </figcaption>
            </div>
          </div>
        </figure>
      </Container>
    </section>
  );
}
