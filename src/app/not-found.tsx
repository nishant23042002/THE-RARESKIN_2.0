import { Container } from "@/components/ui/container";
import { Mark } from "@/components/ui/mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-svh flex-col items-center justify-center text-center"
    >
      <Container className="max-w-[560px]">
        <Mark className="mx-auto w-12 text-ink" />
        <p className="eyebrow mt-6">404</p>
        <h1 className="mt-3 text-[clamp(1.8rem,5vw,2.8rem)]">
          This page drifted off.
        </h1>
        <p className="serif-italic mx-auto mt-3.5 max-w-[34ch] text-[1.1rem] leading-[1.5] text-ink-2">
          The link may be old, or the page never existed. Everything worth
          finding is one step back.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <Button href="/" variant="solid" size="sm">
            Home
          </Button>
          <Button href="/#shop" variant="onDark" size="sm">
            The fragrances
          </Button>
        </div>
      </Container>
    </main>
  );
}
