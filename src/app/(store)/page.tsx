import { notFound } from "next/navigation";
import { Hero } from "@/components/home/hero";
import { AssuranceStrip } from "@/components/home/assurance-strip";
import { ImpressionMarquee } from "@/components/home/impression-marquee";
import { Collection } from "@/components/home/collection";
import { Quiz } from "@/components/home/quiz";
import { DiscoverySet } from "@/components/home/discovery-set";
import { WhyExtrait } from "@/components/home/why-extrait";
import { MadeDeliberately } from "@/components/home/made-deliberately";
import { FounderNote } from "@/components/home/founder-note";
import { Reviews } from "@/components/home/reviews";
import { InstagramStrip } from "@/components/home/instagram-strip";
import { Newsletter } from "@/components/home/newsletter";
import { cloudinaryVariant } from "@/lib/catalog";
import { getStorefrontCatalog } from "@/server/data/catalog";
import {
  getFeaturedReviews,
  getReviewShowcasePhotos,
  type ShowcasePhoto,
} from "@/server/data/reviews";
import { getSiteSettings } from "@/server/data/settings";

/**
 * Homepage. Catalogue data is read once from the database here (cached, tagged
 * `catalog`) and passed down to the section components as props — the client
 * sections never import the catalogue directly.
 */
export default async function HomePage() {
  const [{ fragrances, discoverySet }, settings] = await Promise.all([
    getStorefrontCatalog(),
    getSiteSettings(),
  ]);

  // The store can't render its homepage without a catalogue — treat an empty
  // result as a misconfiguration rather than shipping a blank page.
  if (fragrances.length === 0 || !discoverySet) notFound();

  const reviewsOn = settings.flags.reviewsEnabled;
  const [featuredReviews, showcasePhotos] = await Promise.all([
    reviewsOn ? getFeaturedReviews(6) : Promise.resolve([]),
    getReviewShowcasePhotos(12),
  ]);

  // Site-wide review average, denormalised onto each product.
  const ratingCount = fragrances.reduce((s, f) => s + f.rating.count, 0);
  const ratingAverage =
    ratingCount > 0
      ? fragrances.reduce((s, f) => s + f.rating.average * f.rating.count, 0) /
        ratingCount
      : 0;
  const rating =
    reviewsOn && ratingCount > 0
      ? { average: ratingAverage, count: ratingCount }
      : null;

  const savePercent = (() => {
    const f = fragrances[0];
    if (!f || f.mrp <= 0 || f.price >= f.mrp) return 0;
    return Math.round((1 - f.price / f.mrp) * 100);
  })();

  // "@THERARESKIN" strip: real customer photos first, then a set of placeholder
  // lifestyle shots, then packshots — so the band is always full while the real
  // feed fills in. DUMMY_INSTAGRAM is demo content; swap for a real feed / curated
  // set before launch (see README).
  const DUMMY_INSTAGRAM: ShowcasePhoto[] = [
    "rareskin-ig-a",
    "rareskin-ig-b",
    "rareskin-ig-c",
    "rareskin-ig-d",
    "rareskin-ig-e",
    "rareskin-ig-f",
  ].map((seed) => ({
    url: `https://picsum.photos/seed/${seed}/640/800`,
    alt: "THE RARESKIN, worn",
    href: null,
  }));
  const packshots: ShowcasePhoto[] = fragrances
    .map((f): ShowcasePhoto | null => {
      const url = cloudinaryVariant(f.images.flat ?? f.images.hero, { w: 560 });
      return url ? { url, alt: f.name, href: `/fragrances/${f.slug}` } : null;
    })
    .filter((p): p is ShowcasePhoto => p !== null);
  const strip: ShowcasePhoto[] = [];
  const seen = new Set<string>();
  for (const p of [...showcasePhotos, ...DUMMY_INSTAGRAM, ...packshots]) {
    if (seen.has(p.url)) continue;
    seen.add(p.url);
    strip.push(p);
  }

  return (
    <main id="main">
      <Hero fragrances={fragrances} />
      <AssuranceStrip rating={rating} savePercent={savePercent} />
      <ImpressionMarquee fragrances={fragrances} />
      <Collection fragrances={fragrances} showRating={reviewsOn} />
      <Quiz fragrances={fragrances} />
      <DiscoverySet set={discoverySet} fragrances={fragrances} />
      <WhyExtrait />
      <MadeDeliberately />
      <FounderNote />
      <Reviews reviews={featuredReviews} />
      <InstagramStrip
        photos={strip}
        profileHref={settings.social.instagram}
      />
      <Newsletter />
    </main>
  );
}
