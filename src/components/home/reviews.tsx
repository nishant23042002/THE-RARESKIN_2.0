import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Stars } from "@/components/ui/stars";
import type { FeaturedReview } from "@/server/data/reviews";

export function Reviews({ reviews }: { reviews: FeaturedReview[] }) {
  if (reviews.length === 0) return null;

  return (
    <section className="flex flex-col justify-center border-t border-line py-[clamp(56px,10vw,112px)]">
      <Container>
        <Reveal className="mb-[clamp(36px,6vw,60px)]">
          <span className="eyebrow mb-3 block">In their words</span>
          <h2 className="text-[clamp(1.8rem,3.8vw,2.7rem)]">
            Worn, not just bought.
          </h2>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <Reveal
              key={r.id}
              className="flex flex-col rounded-[3px] border border-line bg-surface p-[clamp(20px,3vw,30px)]"
            >
              <Stars value={r.rating} starClassName="size-3.5" />
              <p className="serif-italic mt-4 flex-1 text-[clamp(1.05rem,1.8vw,1.2rem)] leading-[1.5] text-ink-2">
                &ldquo;{r.body}&rdquo;
              </p>
              <p className="mt-5 text-[11px] tracking-[0.04em] text-ink-3">
                <span className="text-ink-2">{r.authorName}</span> · Verified
                Buyer ·{" "}
                {r.href ? (
                  <Link href={r.href} className="hover:text-ink">
                    {r.productName}
                  </Link>
                ) : (
                  r.productName
                )}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
