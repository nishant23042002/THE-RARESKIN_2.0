import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

/**
 * One place to build page metadata so every route gets a canonical URL and
 * matching OpenGraph / Twitter tags. `path` is the route ("/shipping"); the
 * title runs through the layout's `%s — THE RARESKIN` template.
 */
export function pageMeta({
  title,
  description,
  path,
}: {
  title: string;
  description?: string;
  path: string;
}): Metadata {
  const desc = description ?? SITE.description;
  const url = absoluteUrl(path);
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: desc,
      url,
      type: "website",
      siteName: SITE.name,
      locale: SITE.locale,
    },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

/** Site-wide Organization schema, emitted once in the root layout. */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  url: SITE.url,
  description: SITE.description,
  slogan: SITE.tagline,
  logo: absoluteUrl("/brand/rareskin-wordmark.png"),
  areaServed: { "@type": "Country", name: SITE.region },
} as const;
