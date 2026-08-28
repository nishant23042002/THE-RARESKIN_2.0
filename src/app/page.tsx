import { Hero } from "@/components/home/hero";
import { ImpressionMarquee } from "@/components/home/impression-marquee";
import { Collection } from "@/components/home/collection";
import { Quiz } from "@/components/home/quiz";
import { DiscoverySet } from "@/components/home/discovery-set";
import { WhyExtrait } from "@/components/home/why-extrait";
import { TheIdea } from "@/components/home/the-idea";
import { Reviews } from "@/components/home/reviews";
import { Newsletter } from "@/components/home/newsletter";

/**
 * Homepage — composed of the section components as they land.
 * Phases 4–8: hero, impression marquee, collection, quiz, discovery set,
 * why extrait, the idea, reviews, newsletter.
 */
export default function HomePage() {
  return (
    <main id="main">
      <Hero />
      <ImpressionMarquee />
      <Collection />
      <Quiz />
      <DiscoverySet />
      <WhyExtrait />
      <TheIdea />
      <Reviews />
      <Newsletter />
    </main>
  );
}
