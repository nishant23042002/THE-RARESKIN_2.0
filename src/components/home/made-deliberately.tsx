import { Container } from "@/components/ui/container";
import { Icon, type IconName } from "@/components/ui/icon";
import { Reveal } from "@/components/ui/reveal";

/**
 * The "what's actually in the bottle" band — RARESKIN's answer to the
 * certification row every Indian fragrance brand runs, written as plain claims
 * rather than badges. Sits after "Why extrait" so it reads as the substance
 * behind the argument.
 *
 * NOTE (pre-launch): confirm every line here with the perfumer / QA before the
 * store goes live — "no added phthalates" and IFRA compliance in particular.
 * The animal-testing position is deliberately left off until it's decided
 * (see the pre-launch checklist in README.md).
 */

const CLAIMS: { icon: IconName; label: string; sub: string }[] = [
  {
    icon: "star",
    label: "Extrait concentration",
    sub: "More perfume oil, less alcohol — two sprays hold the day.",
  },
  {
    icon: "shield",
    label: "IFRA-compliant",
    sub: "Every composition made to the fragrance industry's safety standard.",
  },
  {
    icon: "check",
    label: "No added phthalates",
    sub: "Or synthetic colourants — the juice is the colour you see.",
  },
  {
    icon: "pin",
    label: "Bottled in India",
    sub: "Composed, filled and finished in Roha, Maharashtra.",
  },
];

export function MadeDeliberately() {
  return (
    <section className="scroll-mt-[calc(var(--announce-h)+var(--header-h)+16px)] border-t border-line bg-surface py-[clamp(60px,10vw,120px)]">
      <Container>
        <Reveal className="max-w-[46ch]">
          <span className="eyebrow mb-3 block">Made deliberately</span>
          <h2 className="text-[clamp(1.6rem,3vw,2.3rem)]">
            Nothing in the bottle that doesn&rsquo;t need to be there.
          </h2>
        </Reveal>

        <Reveal
          delay={0.06}
          className="mt-[clamp(28px,4vw,48px)] grid grid-cols-2 gap-x-6 gap-y-9 border-t border-line pt-[clamp(24px,3.4vw,40px)] lg:grid-cols-4"
        >
          {CLAIMS.map((c) => (
            <div key={c.label} className="flex flex-col gap-2.5">
              <Icon name={c.icon} className="size-[19px] text-ink-2" />
              <h3 className="text-[12.5px] font-medium tracking-[0.06em] text-ink uppercase">
                {c.label}
              </h3>
              <p className="max-w-[28ch] text-[12.5px] leading-[1.65] text-ink-2">
                {c.sub}
              </p>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
