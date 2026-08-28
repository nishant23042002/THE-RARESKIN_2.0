import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Mark } from "@/components/ui/mark";
import { Wordmark } from "@/components/ui/wordmark";
import { Flacon } from "@/components/ui/flacon";
import { Reveal } from "@/components/ui/reveal";
import { fragranceList, formatINR } from "@/lib/products";

const SWATCHES = [
  ["--color-w0", "#fafaf7"],
  ["--color-w1", "#efeeea"],
  ["--color-w2", "#cfcdc6"],
  ["--color-w3", "#7c7a74"],
  ["--color-w4", "#2c2a26"],
  ["--color-bg", "#f2f1ed"],
  ["--color-ink", "#232120"],
  ["--color-ink-2", "#6b6963"],
  ["--color-ink-3", "#9a988f"],
  ["--color-line", "#dedcd5"],
  ["--color-aurevan", "#a89a7c"],
  ["--color-orvelis", "#bc862f"],
  ["--color-vayren", "#6a4630"],
] as const;

/**
 * Phase 0 — foundations check. Not a real page; replaced as sections land.
 * Exercises: fonts, tokens, primitives, Lenis smooth scroll, a GSAP reveal.
 */
export default function FoundationsPage() {
  return (
    <main id="main">
      <section className="flex min-h-[100svh] flex-col justify-center">
        <Container>
          <Mark className="mb-8 w-10 text-ink" />
          <Wordmark className="text-[clamp(2rem,7vw,4.5rem)]" />
          <p className="serif-italic mt-8 text-[clamp(1.4rem,3.6vw,2.4rem)] leading-tight text-ink-2">
            Scents that stay with you.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button href="#type">View the specimen</Button>
            <Button href="#flacons" variant="ghost">
              The three
            </Button>
          </div>
          <p className="eyebrow mt-16">Phase 0 &middot; foundations check</p>
        </Container>
      </section>

      <section className="border-t border-line py-24">
        <Container>
          <h2 className="eyebrow mb-8">Palette</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {SWATCHES.map(([name, hex]) => (
              <div key={name} className="border border-line">
                <div className="h-20" style={{ background: hex }} />
                <div className="px-2 py-2 text-[10px] tracking-wide text-ink-2">
                  <div>{name}</div>
                  <div className="text-ink-3">{hex}</div>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section id="type" className="border-t border-line py-24">
        <Container>
          <h2 className="eyebrow mb-8">Type</h2>
          <p className="text-[13px] text-ink-3">Jost — 300 / 400 / 500 / 600</p>
          <p className="mt-2 text-4xl font-light">Different by design</p>
          <p className="text-4xl font-normal">Different by design</p>
          <p className="text-4xl font-medium">Different by design</p>
          <p className="text-4xl font-semibold">Different by design</p>
          <p className="mt-10 text-[13px] text-ink-3">Newsreader — italic 300</p>
          <p className="serif-italic mt-2 text-[clamp(1.6rem,4vw,2.8rem)] leading-snug">
            Luxury is not loud. It is felt. A presence, a feeling, a memory.
          </p>
        </Container>
      </section>

      <section id="flacons" className="border-t border-line bg-w4 py-24 text-w0">
        <Container>
          <h2 className="eyebrow mb-10 text-w2">The three</h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {fragranceList.map((f) => (
              <Reveal key={f.slug} className="flex flex-col items-center text-center">
                <Flacon fragrance={f.slug} label className="max-w-[150px]" />
                <p className="mt-5 tracking-[0.14em]">{f.name}</p>
                <p className="mt-1 text-[11px] text-w2">{f.title}</p>
                <p className="mt-2 text-[12px] text-w3">
                  {formatINR(f.price)}{" "}
                  <s className="text-w3/70">{formatINR(f.mrp)}</s>
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-line py-24">
        <Container>
          <h2 className="eyebrow mb-8">Scroll reveal &amp; smooth scroll</h2>
          <div className="space-y-24">
            {[1, 2, 3, 4].map((n) => (
              <Reveal key={n}>
                <p className="serif text-[clamp(1.8rem,5vw,3.4rem)] leading-tight">
                  {n}. All those unseen details combine to produce something
                  that&rsquo;s just stunning.
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
