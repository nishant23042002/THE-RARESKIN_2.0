import { Container } from "@/components/ui/container";
import { Logo } from "@/components/ui/logo";

/**
 * Placeholder home page. Replaced by the composed homepage sections from
 * Phase 4 (hero) onward; kept minimal so `/` is presentable in the meantime.
 */
export default function HomePage() {
  return (
    <main id="main" className="flex min-h-[100svh] items-center">
      <Container className="text-center">
        <Logo className="mx-auto w-[min(420px,72vw)] text-ink" />
        <p className="serif-italic mt-10 text-[clamp(1.4rem,3.6vw,2.2rem)] leading-tight text-ink-2">
          Scents that stay with you.
        </p>
        <p className="eyebrow mt-14">The site is coming together</p>
      </Container>
    </main>
  );
}
