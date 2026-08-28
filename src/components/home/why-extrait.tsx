import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";

const POINTS = [
  {
    n: "01",
    h: "Higher concentration",
    p: "Extrait carries more perfume oil than eau de parfum. A little does the work of a lot.",
  },
  {
    n: "02",
    h: "Closer, for longer",
    p: "It sits near the skin and releases slowly through the day, into a long dry-down.",
  },
  {
    n: "03",
    h: "50 ml is plenty",
    p: "Two or three sprays. One bottle lasts — part of why the price works.",
  },
];

/** Relative concentration, no invented numbers — extrait simply carries more. */
function ConcentrationBar() {
  return (
    <div className="mt-9 space-y-3.5" aria-hidden>
      <div>
        <p className="mb-1.5 text-[10px] tracking-[0.16em] text-ink-3 uppercase">
          Eau de Parfum
        </p>
        <div className="h-[3px] w-full bg-line-2">
          <div className="h-full w-[44%] bg-ink-3" />
        </div>
      </div>
      <div>
        <p className="mb-1.5 text-[10px] tracking-[0.16em] text-ink uppercase">
          Extrait de Parfum
        </p>
        <div className="h-[3px] w-full bg-line-2">
          <div className="h-full w-[88%] bg-ink" />
        </div>
      </div>
      <p className="max-w-[34ch] pt-1 text-[12px] leading-[1.7] text-ink-2">
        More perfume oil, less alcohol — the reason two sprays hold all day.
      </p>
    </div>
  );
}

export function WhyExtrait() {
  return (
    <section
      id="why"
      className="scroll-mt-[calc(var(--announce-h)+var(--header-h)+16px)] py-[clamp(64px,11vw,132px)]"
    >
      <Container className="grid gap-x-16 gap-y-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-[calc(var(--announce-h)+var(--header-h)+44px)] lg:self-start">
          <Reveal>
            <span className="eyebrow mb-3 block">Concentration, not volume</span>
            <h2 className="text-[clamp(1.8rem,3.6vw,2.7rem)]">
              Why we only make extrait.
            </h2>
            <ConcentrationBar />
          </Reveal>
        </div>

        <Reveal className="divide-y divide-line border-t border-ink">
          {POINTS.map((pt) => (
            <div
              key={pt.n}
              className="grid grid-cols-[auto_1fr] gap-x-5 py-[clamp(24px,3.4vw,40px)] sm:gap-x-8"
            >
              <span className="serif text-[clamp(1.6rem,2.4vw,2.1rem)] leading-none text-ink-3/70">
                {pt.n}
              </span>
              <div>
                <h3 className="text-[clamp(1.15rem,1.9vw,1.5rem)]">{pt.h}</h3>
                <p className="mt-2 max-w-[40ch] text-[13.5px] leading-[1.7] text-ink-2">
                  {pt.p}
                </p>
              </div>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
