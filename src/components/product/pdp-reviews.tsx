import Link from "next/link";

import { Reveal } from "@/components/ui/reveal";
import { Star, Stars } from "@/components/ui/stars";
import { distributionPercents, formatRating } from "@/lib/reviews";
import type { ProductReviews } from "@/server/data/reviews";

function reviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ReviewCard({
  authorName,
  rating,
  title,
  body,
  publishedAt,
}: ProductReviews["items"][number]) {
  return (
    <article className="rounded-[4px] border border-line bg-surface p-[clamp(18px,3vw,28px)]">
      <div className="flex items-center justify-between gap-3">
        <Stars value={rating} starClassName="size-3.5" />
        <span className="text-[10px] tracking-[0.06em] text-ink-3 tabular-nums">
          {reviewDate(publishedAt)}
        </span>
      </div>
      <h3 className="mt-3 text-[14.5px] font-medium tracking-[0.01em]">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{body}</p>
      <p className="mt-3 flex items-center gap-2 text-[11px] tracking-[0.04em] text-ink-3">
        <span className="text-ink-2">{authorName}</span>
        <span
          aria-hidden
          className="inline-block h-2.5 w-px bg-line-2"
        />
        <span className="tracking-[0.1em] uppercase">Verified Buyer</span>
      </p>
    </article>
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
  if (!enabled) return null;

  const { summary, items } = reviews;
  const percents = distributionPercents(summary.distribution);

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

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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

            <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
              {items.slice(0, 8).map((r) => (
                <ReviewCard key={r.id} {...r} />
              ))}
            </div>
          </>
        )}
      </Reveal>
    </section>
  );
}
