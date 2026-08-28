import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/layout/page-intro";
import { DiscoverySet } from "@/components/home/discovery-set";
import { DISCOVERY_SET, formatINR } from "@/lib/products";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "The Discovery Set",
  description: DISCOVERY_SET.detail,
  path: "/discovery-set",
});

const STEPS = [
  {
    n: "01",
    h: "Order the set",
    p: `Three ${DISCOVERY_SET.perVialMl} ml extraits — ${formatINR(
      DISCOVERY_SET.price,
    )}, the full-size formula, not a diluted sample.`,
  },
  {
    n: "02",
    h: "Live with all three",
    p: "A week or two each. Notice which one you reach for without thinking about it.",
  },
  {
    n: "03",
    h: "Buy your 50 ml",
    p: `The ${formatINR(
      DISCOVERY_SET.price,
    )} comes off in full — your first full bottle is effectively the set for free.`,
  },
];

export default function DiscoverySetPage() {
  return (
    <main id="main">
      <PageIntro
        eyebrow="The set"
        crumb={{ name: "Discovery Set", path: "/discovery-set" }}
        title="The Discovery Set"
        lede={`Three ${DISCOVERY_SET.perVialMl} ml extraits, credited back in full toward your first bottle.`}
      />

      <DiscoverySet />

      <Container className="max-w-[980px] py-[clamp(48px,9vw,110px)]">
        <h2 className="eyebrow mb-[clamp(24px,4vw,40px)]">
          How the credit works
        </h2>
        <ol className="grid gap-9 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <p className="serif text-[1.5rem] leading-none text-ink-3">
                {s.n}
              </p>
              <h3 className="mt-2.5 text-[1.05rem]">{s.h}</h3>
              <p className="mt-1.5 text-[13px] leading-[1.65] text-ink-2">
                {s.p}
              </p>
            </li>
          ))}
        </ol>
        <p className="mt-9 text-[11px] tracking-[0.03em] text-ink-3">
          One credit per customer, applied to a first 50 ml purchase. Discovery
          Set is non-refundable once opened. [Placeholder terms.]
        </p>
      </Container>
    </main>
  );
}
