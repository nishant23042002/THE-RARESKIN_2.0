import { notFound } from "next/navigation";
import { Hero } from "@/components/home/hero";
import { ImpressionMarquee } from "@/components/home/impression-marquee";
import { Collection } from "@/components/home/collection";
import { Quiz } from "@/components/home/quiz";
import { DiscoverySet } from "@/components/home/discovery-set";
import { WhyExtrait } from "@/components/home/why-extrait";
import { TheIdea } from "@/components/home/the-idea";
import { Reviews } from "@/components/home/reviews";
import { Newsletter } from "@/components/home/newsletter";
import { getStorefrontCatalog } from "@/server/data/catalog";

/**
 * Homepage. Catalogue data is read once from the database here (cached, tagged
 * `catalog`) and passed down to the section components as props — the client
 * sections never import the catalogue directly.
 */
export default async function HomePage() {
  const { fragrances, discoverySet } = await getStorefrontCatalog();

  // The store can't render its homepage without a catalogue — treat an empty
  // result as a misconfiguration rather than shipping a blank page.
  if (fragrances.length === 0 || !discoverySet) notFound();

  return (
    <main id="main">
      <Hero fragrances={fragrances} />
      <ImpressionMarquee fragrances={fragrances} />
      <Collection fragrances={fragrances} />
      <Quiz fragrances={fragrances} />
      <DiscoverySet set={discoverySet} fragrances={fragrances} />
      <WhyExtrait />
      <TheIdea />
      <Reviews />
      <Newsletter />
    </main>
  );
}
