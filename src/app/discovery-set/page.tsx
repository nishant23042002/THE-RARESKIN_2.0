import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/layout/page-intro";
import { DiscoverySet } from "@/components/home/discovery-set";
import { formatINR } from "@/lib/catalog";
import { pageMeta } from "@/lib/seo";
import { getFragrances, getDiscoverySet } from "@/server/data/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const set = await getDiscoverySet();
  return pageMeta({
    title: "The Discovery Set",
    description:
      set?.seo.metaDescription ??
      set?.detail ??
      "Three 10 ml extraits, credited back in full toward your first bottle.",
    path: "/discovery-set",
  });
}

export default async function DiscoverySetPage() {
  const [set, fragrances] = await Promise.all([
    getDiscoverySet(),
    getFragrances(),
  ]);
  if (!set) notFound();

  const steps = [
    {
      n: "01",
      h: "Order the set",
      p: `Three ${set.perVialMl} ml extraits — ${formatINR(
        set.price,
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
        set.creditRupees,
      )} comes off in full — your first full bottle is effectively the set for free.`,
    },
  ];

  return (
    <main id="main">
      <PageIntro
        eyebrow="The set"
        crumb={{ name: "Discovery Set", path: "/discovery-set" }}
        title="The Discovery Set"
        lede={`Three ${set.perVialMl} ml extraits, credited back in full toward your first bottle.`}
      />

      <DiscoverySet set={set} fragrances={fragrances} />

      <Container className="max-w-[980px] py-[clamp(48px,9vw,110px)]">
        <h2 className="eyebrow mb-[clamp(24px,4vw,40px)]">
          How the credit works
        </h2>
        <ol className="grid gap-9 sm:grid-cols-3">
          {steps.map((s) => (
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
        <p className="mt-9 text-[11px] leading-[1.7] tracking-[0.03em] text-ink-3">
          One credit per customer, applied automatically to your first 50 ml
          purchase and not combinable with other offers. The Discovery Set is
          non-refundable once any vial is opened. See{" "}
          <a
            href="/returns"
            className="underline decoration-line-2 underline-offset-2 hover:text-ink"
          >
            Returns
          </a>{" "}
          for full details.
        </p>
      </Container>
    </main>
  );
}
