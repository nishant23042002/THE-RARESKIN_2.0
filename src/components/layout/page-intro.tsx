import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

/**
 * Shared top for the standalone content pages — clears the fixed header and
 * sets a consistent eyebrow / headline / lede rhythm.
 */
export function PageIntro({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Container className="max-w-[900px] pt-[calc(var(--announce-h)+var(--header-h)+clamp(2rem,6vw,4.5rem))] pb-[clamp(28px,5vw,44px)]">
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <h1 className="text-[clamp(1.9rem,4.6vw,3rem)] leading-[1.08] text-balance">
        {title}
      </h1>
      {lede ? (
        <p className="serif-italic mt-4 max-w-[54ch] text-[clamp(1.05rem,2vw,1.35rem)] leading-[1.5] text-ink-2">
          {lede}
        </p>
      ) : null}
      {children}
    </Container>
  );
}
