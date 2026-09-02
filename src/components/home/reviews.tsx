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
 * Homepage social proof as a slow, seamless horizontal marquee — same mechanic
 * as `cart-marquee.tsx`: one `w-max` track holding the card group twice, GSAP
 * slides it exactly one group width forever (`ease: "none"`, `repeat: -1`), so
 * there's no jump at the seam. Pauses on hover / focus so the cards stay
 * clickable. Under reduced motion it's a plain swipeable strip.
 */

function ReviewCard({ r }: { r: FeaturedReview }) {
  const photo = r.photos[0];
  const inner = (
    <div className="flex h-full w-[clamp(260px,78vw,320px)] shrink-0 flex-col rounded-[4px] border border-line bg-surface p-[clamp(16px,3vw,22px)]">
      <div className="flex items-center gap-2.5">
        <Avatar src={r.avatarUrl} initials={r.initials} size={34} />
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cloudinaryVariant(photo.url, { w: 140, h: 140, fill: true }) ?? photo.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-9 shrink-0 rounded-[3px] border border-line-2 object-cover"
          />
        )}
        <span className="ml-auto">
          <Stars value={r.rating} starClassName="size-3" />
        </span>
      </div>
      <p className="serif-italic mt-3 line-clamp-3 flex-1 text-[clamp(0.95rem,1.6vw,1.05rem)] leading-[1.5] text-ink-2">
        &ldquo;{r.body}&rdquo;
      </p>
      <p className="mt-3 text-[10.5px] tracking-[0.04em] text-ink-3">
        <span className="text-ink-2">{r.authorName}</span> · Verified Buyer ·{" "}
        {r.productName}
      </p>
    </div>
  );

  return r.href ? (
    <Link href={`${r.href}#reviews`} className="block h-full focus-visible:outline-none">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function Reviews({ reviews }: { reviews: FeaturedReview[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const reduced = useReducedMotion();

  // pad out a thin set so the loop never looks sparse
  const cards: FeaturedReview[] = [];
  if (reviews.length > 0) {
    while (cards.length < 6) cards.push(reviews[cards.length % reviews.length]);
  }

  useGSAP(
    () => {
      const track = trackRef.current;
      if (!track || reduced || cards.length === 0) return;
      gsap.set(track, { xPercent: 0 });
      const tween = gsap.to(track, {
        xPercent: -50,
        duration: cards.length * 6,
        ease: "none",
        repeat: -1,
      });
      tweenRef.current = tween;
      return () => {
        tween.kill();
        tweenRef.current = null;
      };
    },
    { dependencies: [reduced, cards.length], scope: rootRef },
  );

  if (reviews.length === 0) return null;

  const setPaused = (paused: boolean) => {
    tweenRef.current?.timeScale(paused ? 0 : 1);
  };

  // each card carries `mr-4`, so a group's width includes the trailing gap — the
  // two groups are equal and `xPercent: -50` lands exactly one group over.
  const group = (keyPrefix: string, ariaHidden: boolean) => (
    <div
      key={keyPrefix}
      className="flex shrink-0"
      aria-hidden={ariaHidden || undefined}
    >
      {cards.map((r, i) => (
        <div key={`${keyPrefix}-${r.id}-${i}`} className="mr-4 shrink-0">
          <ReviewCard r={r} />
        </div>
      ))}
    </div>
  );

  return (
    <section className="border-t border-line py-[clamp(48px,8vw,96px)]">
      <Container>
        <Reveal className="mb-[clamp(28px,5vw,48px)]">
          <span className="eyebrow mb-3 block">In their words</span>
          <h2 className="text-[clamp(1.8rem,3.8vw,2.7rem)]">
            Worn, not just bought.
          </h2>
        </Reveal>
      </Container>

      <div
        ref={rootRef}
        className="overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {reduced ? (
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-[clamp(16px,4vw,64px)] [scroll-snap-type:x_proximity]">
            {reviews.map((r) => (
              <div key={r.id} className="[scroll-snap-align:start]">
                <ReviewCard r={r} />
              </div>
            ))}
          </div>
        ) : (
          <div ref={trackRef} className="flex w-max will-change-transform">
            {group("a", false)}
            {group("b", true)}
          </div>
        )}
      </div>
    </section>
  );
}
