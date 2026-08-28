"use client";

import { useState } from "react";
import { Carousel } from "@/components/ui/carousel";
import { Reveal } from "@/components/ui/reveal";
import { cn } from "@/lib/cn";
import type { Fragrance } from "@/lib/catalog";

function Star({ filled, className }: { filled?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn("h-4 w-4", className)}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.2}
      aria-hidden
    >
      <path d="M10 1.6l2.55 5.17 5.7.83-4.12 4.02.97 5.68L10 14.6l-5.1 2.5.97-5.68L1.75 7.6l5.7-.83z" />
    </svg>
  );
}

function StarRow({
  value = 0,
  className,
}: {
  value?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex gap-1 text-ink-3", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={n <= value} />
      ))}
    </span>
  );
}

/** Hover / tap to fill — no score is stored, it just signals the mechanic. */
function RateMock({ name }: { name: string }) {
  const [hover, setHover] = useState(0);
  const [picked, setPicked] = useState(0);
  const shown = hover || picked;

  return (
    <div>
      <div
        className="flex justify-center gap-2 text-gilt"
        onMouseLeave={() => setHover(0)}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`Rate ${n} out of 5`}
            aria-pressed={picked === n}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => setPicked(n)}
            className="p-1 transition-transform duration-200 hover:scale-110 motion-reduce:transition-none"
          >
            <Star filled={n <= shown} className="h-5 w-5" />
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10.5px] tracking-[0.1em] text-ink-3 uppercase">
        {picked
          ? `Come back at launch to leave this for ${name}`
          : "Tap to rate"}
      </p>
    </div>
  );
}

export function PdpReviews({ fragrance: f }: { fragrance: Fragrance }) {
  const dist = [5, 4, 3, 2, 1];

  return (
    <section className="border-t border-line py-[clamp(40px,7vw,84px)]">
      <Reveal>
        <div className="mb-[clamp(22px,4vw,38px)]">
          <span className="eyebrow mb-2.5 block">Impressions</span>
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)]">
            What stays with people.
          </h2>
        </div>

        <Carousel ariaLabel={`${f.name} impressions`}>
          <div className="pr-0 sm:pr-2.5">
            <div className="grid h-full gap-8 rounded-[4px] border border-line bg-surface p-[clamp(24px,4vw,44px)] sm:grid-cols-[200px_1fr] sm:items-center">
              <div className="text-center sm:text-left">
                <p className="serif text-[clamp(2.6rem,5vw,3.6rem)] leading-none text-ink-3">
                  &mdash;
                </p>
                <p className="mt-2 text-[10px] tracking-[0.16em] text-ink-3 uppercase">
                  Not yet rated
                </p>
                <StarRow className="mt-3 justify-center sm:justify-start" />
                <p className="mt-2 text-[11px] text-ink-3">0 reviews</p>
              </div>
              <div className="space-y-2">
                {dist.map((s) => (
                  <div
                    key={s}
                    className="flex items-center gap-2.5 text-[10px] text-ink-3"
                  >
                    <span className="w-2 tabular-nums">{s}</span>
                    <Star filled className="h-2.5 w-2.5" />
                    <span className="h-[3px] flex-1 rounded-full bg-line-2/60" />
                    <span className="w-4 text-right tabular-nums">0</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pr-0 sm:pr-2.5">
            <div className="flex h-full flex-col items-center justify-center gap-4 rounded-[4px] border border-dashed border-line-2 bg-surface p-[clamp(24px,4vw,44px)] text-center">
              <p className="serif-italic mx-auto max-w-[38ch] text-[clamp(1.15rem,2.4vw,1.5rem)] leading-[1.4] text-ink-2">
                &ldquo;Reviews from verified buyers open once the first bottles
                have been lived in for two weeks.&rdquo;
              </p>
              <RateMock name={f.name} />
              <p className="text-[10px] tracking-[0.1em] text-ink-3 uppercase">
                Placeholder &middot; reviews unlock at launch
              </p>
            </div>
          </div>
        </Carousel>
      </Reveal>
    </section>
  );
}
