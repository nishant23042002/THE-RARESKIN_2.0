import Link from "next/link";
import { Container } from "@/components/ui/container";
import { PageIntro } from "@/components/layout/page-intro";
import { Accordion } from "@/components/ui/accordion";
import { pageMeta } from "@/lib/seo";
import { FAQ_GROUPS, ALL_FAQS } from "@/lib/faq";

export const metadata = pageMeta({
  title: "FAQ",
  description:
    "Answers on Extrait de Parfum, longevity, the Discovery Set credit, payment, cash on delivery, shipping across India, returns and authenticity.",
  path: "/faq",
});

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: ALL_FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function FaqPage() {
  return (
    <main id="main">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <PageIntro
        eyebrow="Help"
        crumb={{ name: "FAQ", path: "/faq" }}
        title="Questions, answered."
        lede="Extrait concentration, the Discovery Set credit, payment, delivery across India, returns and authenticity — the things people ask most."
      />

      <Container className="max-w-[840px] pb-[clamp(56px,10vw,120px)]">
        {FAQ_GROUPS.map((group, gi) => (
          <section
            key={group.title}
            className={gi > 0 ? "mt-[clamp(36px,6vw,64px)]" : ""}
          >
            <h2 className="mb-2 text-[10.5px] font-normal tracking-[0.16em] text-ink-3 uppercase">
              {group.title}
            </h2>
            <Accordion items={group.items} />
          </section>
        ))}

        <p className="mt-[clamp(40px,7vw,72px)] border-t border-line pt-8 text-[13px] leading-[1.7] text-ink-2">
          Didn&rsquo;t find it?{" "}
          <Link
            href="/contact"
            className="underline decoration-line-2 underline-offset-2 hover:text-ink"
          >
            Get in touch
          </Link>{" "}
          — we usually reply within a working day. For policy detail, see{" "}
          <Link
            href="/shipping"
            className="underline decoration-line-2 underline-offset-2 hover:text-ink"
          >
            Shipping
          </Link>{" "}
          and{" "}
          <Link
            href="/returns"
            className="underline decoration-line-2 underline-offset-2 hover:text-ink"
          >
            Returns
          </Link>
          .
        </p>
      </Container>
    </main>
  );
}
