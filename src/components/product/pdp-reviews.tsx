"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/ui/reveal";
import { Star, Stars } from "@/components/ui/stars";
import { cloudinaryVariant } from "@/lib/catalog";
import { distributionPercents, formatRating } from "@/lib/reviews";
import type { ProductReviews, ReviewPhoto } from "@/server/data/reviews";

import { ReviewLightbox, type LightboxPhoto } from "./review-lightbox";

function reviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Thumb({
  photo,
  onOpen,
  className = "size-16 sm:size-20",
}: {
  photo: ReviewPhoto;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`${className} shrink-0 overflow-hidden rounded-[3px] border border-line-2 transition-opacity hover:opacity-90`}
      aria-label="View photo"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cloudinaryVariant(photo.url, { w: 300, h: 300, fill: true }) ?? photo.url}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </button>
  );
}

export function PdpReviews({
  enabled,
  productName,
  reviews,
}: {
  enabled: boolean;
  productName: string;
  reviews: ProductReviews;
}) {
  const { summary, items } = reviews;

  // one flat photo list for the lightbox + a lookup from a review's photo to its
  // global index
  const { allPhotos, indexOf } = useMemo(() => {
    const flat: LightboxPhoto[] = [];
    const map = new Map<string, number>();
    for (const r of items) {
      r.photos.forEach((p, i) => {
        map.set(`${r.id}:${i}`, flat.length);
        flat.push({ url: p.url, alt: p.alt || `Photo from ${r.authorName}` });
      });
    }
    return { allPhotos: flat, indexOf: map };
  }, [items]);

  const [lightbox, setLightbox] = useState<number | null>(null);
  const percents = distributionPercents(summary.distribution);

  if (!enabled) return null;

  return (
    <section
      id="reviews"
      className="scroll-mt-[calc(var(--announce-h)+var(--header-h)+1rem)] border-t border-line py-[clamp(40px,7vw,84px)]"
    >
      <Reveal>
        <div className="mb-[clamp(22px,4vw,38px)]">
          <span className="eyebrow mb-2.5 block">Impressions</span>
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)]">
            What stays with people.
          </h2>
        </div>

        {summary.count === 0 ? (
          <div className="rounded-[4px] border border-dashed border-line-2 bg-surface p-[clamp(24px,4vw,44px)] text-center">
            <Stars value={0} className="justify-center" />
            <p className="serif-italic mx-auto mt-4 max-w-[36ch] text-[clamp(1.1rem,2.2vw,1.4rem)] leading-[1.45] text-ink-2">
              No reviews yet. If you&rsquo;ve worn {productName}, yours would be
              the first.
            </p>
            <Link
              href="/account/reviews"
              className="mt-5 inline-block rounded-[2px] border border-ink px-5 py-2.5 text-[11px] tracking-[0.14em] text-ink uppercase transition-colors hover:bg-ink hover:text-w0"
            >
              Write a review
            </Link>
          </div>
        ) : (
          <>
            {/* summary */}
            <div className="grid gap-8 rounded-[4px] border border-line bg-surface p-[clamp(22px,4vw,40px)] sm:grid-cols-[220px_1fr] sm:items-center">
              <div className="text-center sm:text-left">
                <p className="serif text-[clamp(2.6rem,5vw,3.4rem)] leading-none">
                  {formatRating(summary.average)}
                </p>
                <Stars
                  value={summary.average}
                  className="mt-2 justify-center sm:justify-start"
                />
                <p className="mt-2 text-[11px] text-ink-3">
                  {summary.count} review{summary.count === 1 ? "" : "s"} · verified
                  buyers
                </p>
              </div>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars, i) => (
                  <div
                    key={stars}
                    className="flex items-center gap-2.5 text-[10.5px] text-ink-3"
                  >
                    <span className="inline-flex w-8 shrink-0 items-center gap-1 tabular-nums">
                      {stars}
                      <Star filled className="size-2.5" />
                    </span>
                    <span className="relative h-[4px] flex-1 overflow-hidden rounded-full bg-line-2/50">
                      <span
                        className="absolute inset-y-0 left-0 rounded-full bg-gilt"
                        style={{ width: `${percents[i]}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right tabular-nums">
                      {summary.distribution[i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* customer photos strip */}
            {allPhotos.length > 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[10.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">
                  Photos from customers
                </p>
                <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0">
                  {allPhotos.slice(0, 10).map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(i)}
                      className="size-[72px] shrink-0 overflow-hidden rounded-[3px] border border-line-2 transition-opacity hover:opacity-90 sm:size-[84px]"
                      aria-label="View photo"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          cloudinaryVariant(p.url, { w: 260, h: 260, fill: true }) ??
                          p.url
                        }
                        alt={p.alt}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] tracking-[0.04em] text-ink-3">
                Every review is from a verified, delivered order.
              </p>
              <Link
                href="/account/reviews"
                className="text-[11px] tracking-[0.12em] text-ink uppercase underline-offset-4 hover:underline"
              >
                Write a review
              </Link>
            </div>

            {/* review cards */}
            <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
              {items.slice(0, 8).map((r) => (
                <article
                  key={r.id}
                  className="rounded-[4px] border border-line bg-surface p-[clamp(18px,3vw,26px)]"
                >
                  <div className="flex items-start gap-3">
                    <Avatar src={r.avatarUrl} initials={r.initials} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[12.5px] text-ink">
                          {r.authorName}
                        </span>
                        <span className="text-[9.5px] tracking-[0.12em] text-ink-3 uppercase">
                          Verified Buyer
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <Stars value={r.rating} starClassName="size-3" />
                        <span className="text-[10px] text-ink-3 tabular-nums">
                          {reviewDate(r.publishedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-3 text-[14px] font-medium tracking-[0.01em]">
                    {r.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                    {r.body}
                  </p>

                  {r.photos.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {r.photos.map((p, i) => (
                        <Thumb
                          key={i}
                          photo={p}
                          onOpen={() =>
                            setLightbox(indexOf.get(`${r.id}:${i}`) ?? 0)
                          }
                        />
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </Reveal>

      <ReviewLightbox
        photos={allPhotos}
        index={lightbox}
        onClose={() => setLightbox(null)}
        onIndex={setLightbox}
      />
    </section>
  );
}
