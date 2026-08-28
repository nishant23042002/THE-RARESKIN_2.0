import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

function Star() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-[15px] w-[15px]" aria-hidden>
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85z" />
    </svg>
  );
}

export function Reviews() {
  return (
    <section className="border-t border-line py-[clamp(72px,13vw,160px)]">
      <Container>
        <Reveal className="mb-[clamp(36px,6vw,60px)]">
          <span className="eyebrow mb-3 block">In their words</span>
          <h2 className="text-[clamp(1.8rem,3.8vw,2.7rem)]">
            Worn, not just bought.
          </h2>
        </Reveal>

        <Reveal className="rounded-[3px] border border-dashed border-line-2 px-6 py-10 text-center">
          <p className="serif-italic text-[clamp(1.4rem,3vw,1.8rem)] text-ink-2">
            &ldquo;Be among the first to wear it.&rdquo;
          </p>
          <div className="mt-[18px] flex justify-center gap-1 text-line-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} />
            ))}
          </div>
          <p className="mt-2.5 text-[12px] tracking-[0.03em] text-ink-3">
            Customer reviews appear here after launch. This block is a
            placeholder.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
