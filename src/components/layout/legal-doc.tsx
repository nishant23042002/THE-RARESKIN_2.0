import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { PageIntro } from "./page-intro";

/**
 * The four policy pages share this shell. Every one carries an explicit
 * placeholder notice — the copy is a scaffold, not a reviewed legal document.
 */
export function LegalDoc({
  title,
  sections,
}: {
  title: string;
  sections: { h: string; body: ReactNode }[];
}) {
  return (
    <main id="main">
      <PageIntro eyebrow="Policy" title={title} />
      <Container className="max-w-[760px] pb-[clamp(56px,10vw,110px)]">
        <p className="mb-9 rounded-[3px] border border-line-2 bg-surface px-4 py-3 text-[11px] tracking-[0.03em] text-ink-3">
          Placeholder — this policy is a scaffold and must be finalised and
          legally reviewed before launch.
        </p>
        <div className="space-y-9">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="mb-2.5 text-[12px] font-normal tracking-[0.12em] text-ink uppercase">
                {s.h}
              </h2>
              <div className="space-y-3 text-[14px] leading-[1.75] text-ink-2 [&_a:hover]:text-ink [&_a]:underline [&_a]:decoration-line-2 [&_a]:underline-offset-2">
                {s.body}
              </div>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
