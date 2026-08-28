import { Hero } from "@/components/home/hero";
import { ImpressionMarquee } from "@/components/home/impression-marquee";
import { Collection } from "@/components/home/collection";

/**
 * Homepage — composed of the section components as they land.
 * Phase 4: hero. Phase 5: impression marquee + collection.
 */
export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <ImpressionMarquee />
      <Collection />
    </main>
  );
}
