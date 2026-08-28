import { Container } from "@/components/ui/container";
import { Mark } from "@/components/ui/mark";
import { Reveal } from "@/components/ui/reveal";

const TRIAD = [
  { word: "Bold", when: "when you want to be noticed" },
  { word: "Refined", when: "when you want to leave an impression" },
  { word: "Unforgettable", when: "when you walk away" },
];

export function TheIdea() {
  return (
    <section
      id="idea"
      className="flex min-h-svh flex-col justify-center scroll-mt-[calc(var(--announce-h)+var(--header-h)+16px)] bg-bg py-[clamp(56px,10vw,112px)]"
    >
      <Container>
        <div className="grid gap-x-16 gap-y-8 md:grid-cols-[1.2fr_1fr] md:items-start">
          <Reveal>
            <Mark className="h-9 w-[52px] text-ink sm:h-12 sm:w-16" />
            <h2 className="serif-italic mt-5 max-w-[13ch] text-[clamp(2.4rem,7vw,4.6rem)] leading-[1.02]">
              Different by design.
            </h2>
          </Reveal>
          <Reveal
            delay={0.06}
            className="max-w-[52ch] text-[15px] leading-[1.75] text-ink-2 md:pt-3"
          >
            The mark in our name has no crossbar — a letter that refused to sit
            still. It stands for individuality, confidence, and the nerve to
            stand apart from the ordinary.
          </Reveal>
        </div>

        <Reveal
          delay={0.1}
          className="mt-[clamp(44px,7vw,88px)] border-t border-ink"
        >
          {TRIAD.map((t) => (
            <div
              key={t.word}
              className="grid gap-1 border-b border-line py-[clamp(20px,3vw,34px)] sm:grid-cols-[1fr_1.1fr] sm:items-baseline sm:gap-8"
            >
              <span className="text-[clamp(1.5rem,3.4vw,2.4rem)] tracking-[0.02em]">
                {t.word}
              </span>
              <span className="serif-italic text-[clamp(1rem,1.7vw,1.3rem)] text-ink-2">
                {t.when}
              </span>
            </div>
          ))}
        </Reveal>

        <Reveal delay={0.14} className="mt-[clamp(32px,4vw,52px)]">
          <p className="serif-italic max-w-[36ch] text-[clamp(1.05rem,1.9vw,1.4rem)] leading-[1.5] text-ink-2">
            Luxury isn&rsquo;t loud. It&rsquo;s felt — a presence, a feeling, a
            memory.
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
