"use client";

import Link from "next/link";
import { useRef } from "react";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Avatar } from "@/components/ui/avatar";
import { Stars } from "@/components/ui/stars";
import { gsap, useGSAP } from "@/lib/gsap";
import { cloudinaryVariant } from "@/lib/catalog";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { FeaturedReview } from "@/server/data/reviews";

/**
 * Homepage social proof as two slow, opposing marquee rows — same seamless-loop
 * mechanic as `cart-marquee.tsx` (a `w-max` track holding the card group twice,
 * GSAP slides it exactly one group width forever, `ease: "none"`, `repeat: -1`),
 * one drifting left and one right. The band is sized by its content — two
 * compact card rows — not the viewport. Pauses on hover / focus so the cards
 * stay clickable. Under reduced motion each row becomes a plain swipeable strip.
 */

function ReviewCard({ r }: { r: FeaturedReview }) {
  const photo = r.photos[0];
  const inner = (
    <div className="flex h-full w-[clamp(272px,78vw,352px)] shrink-0 flex-col rounded-[5px] border border-line bg-surface p-[clamp(16px,2vw,22px)]">
      <div className="flex items-center gap-2.5">
        <Avatar src={r.avatarUrl} initials={r.initials} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] text-ink">{r.authorName}</p>
          <p className="text-[9px] tracking-[0.12em] text-ink-3 uppercase">
            Verified Buyer
          </p>
        </div>
        <Stars value={r.rating} starClassName="size-3" />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cloudinaryVariant(photo.url, { w: 128, h: 128, fill: true }) ?? photo.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-9 shrink-0 rounded-[3px] border border-line-2 object-cover"
          />
        )}
      </div>
      <p className="serif-italic mt-2.5 line-clamp-3 flex-1 text-[clamp(0.92rem,1.4vw,1.02rem)] leading-[1.5] text-ink-2">
        &ldquo;{r.body}&rdquo;
      </p>
      <p className="mt-2.5 text-[9.5px] tracking-[0.08em] text-ink-3 uppercase">
        {r.productName}
      </p>
    </div>
  );

  return r.href ? (
    <Link
      href={`${r.href}#reviews`}
      className="block h-full focus-visible:outline-none"
    >
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Track({
  cards,
  dir,
  duration,
  trackRef,
}: {
  cards: FeaturedReview[];
  dir: "left" | "right";
  duration: number;
  trackRef: React.RefObject<HTMLDivElement | null>;
}) {
  const grp = (key: string, hidden: boolean) => (
    <div key={key} className="flex shrink-0" aria-hidden={hidden || undefined}>
      {cards.map((r, i) => (
        <div key={`${key}-${r.id}-${i}`} className="mr-3 shrink-0">
          <ReviewCard r={r} />
        </div>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden">
      <div
        ref={trackRef}
        data-dir={dir}
        data-duration={duration}
        className="flex w-max will-change-transform"
      >
        {grp("a", false)}
        {grp("b", true)}
      </div>
    </div>
  );
}

export function Reviews({ reviews }: { reviews: FeaturedReview[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const rowA = useRef<HTMLDivElement>(null);
  const rowB = useRef<HTMLDivElement>(null);
  const tweensRef = useRef<gsap.core.Tween[]>([]);
  const reduced = useReducedMotion();

  // pad a thin set so each loop stays full
  const padded: FeaturedReview[] = [];
  if (reviews.length > 0) {
    while (padded.length < 6) padded.push(reviews[padded.length % reviews.length]);
  }
  // offset the second row so the two never scroll in lockstep
  const cardsA = padded;
  const cardsB = [...padded.slice(Math.ceil(padded.length / 2)), ...padded.slice(0, Math.ceil(padded.length / 2))];

  useGSAP(
    () => {
      if (reduced || padded.length === 0) return;
      const tweens: gsap.core.Tween[] = [];
      for (const el of [rowA.current, rowB.current]) {
        if (!el) continue;
        const dir = el.dataset.dir === "right" ? 1 : -1;
        const dur = Number(el.dataset.duration) || 40;
        gsap.set(el, { xPercent: dir === 1 ? -50 : 0 });
        tweens.push(
          gsap.to(el, {
            xPercent: dir === 1 ? 0 : -50,
            duration: dur,
            ease: "none",
            repeat: -1,
          }),
        );
      }
      tweensRef.current = tweens;
      return () => {
        tweens.forEach((t) => t.kill());
        tweensRef.current = [];
      };
    },
    { dependencies: [reduced, padded.length], scope: rootRef },
  );

  if (reviews.length === 0) return null;

  const setPaused = (paused: boolean) => {
    tweensRef.current.forEach((t) => t.timeScale(paused ? 0 : 1));
  };

  return (
    <section className="scroll-mt-[calc(var(--announce-h)+var(--header-h)+16px)] border-t border-line py-[clamp(40px,7vh,76px)]">
      <Container>
        <Reveal className="mb-[clamp(22px,4vh,40px)]">
          <span className="eyebrow mb-3 block">In their words</span>
          <h2 className="text-[clamp(1.8rem,3.4vw,2.6rem)]">
            Worn, not just bought.
          </h2>
        </Reveal>
      </Container>

      <div
        ref={rootRef}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {reduced ? (
          <div className="space-y-3">
            {[cardsA, cardsB].map((set, r) => (
              <div
                key={r}
                className="no-scrollbar flex gap-3 overflow-x-auto px-[clamp(16px,4vw,64px)] [scroll-snap-type:x_proximity]"
              >
                {set.map((rv, i) => (
                  <div key={`${rv.id}-${i}`} className="[scroll-snap-align:start]">
                    <ReviewCard r={rv} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Track cards={cardsA} dir="left" duration={44} trackRef={rowA} />
            <Track cards={cardsB} dir="right" duration={52} trackRef={rowB} />
          </div>
        )}
      </div>
    </section>
  );
}
