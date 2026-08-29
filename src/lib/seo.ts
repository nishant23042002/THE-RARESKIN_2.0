import type { Metadata } from "next";
import { SITE, CONTACT, absoluteUrl } from "./site";

/**
 * One place to build page metadata so every route gets a canonical URL and
 * matching OpenGraph / Twitter tags. `path` is the route ("/shipping"); the
 * title runs through the layout's `%s — THE RARESKIN` template.
 */
export function pageMeta({
  title,
  description,
  path,
  noindex,
}: {
  title: string;
  description?: string;
  path: string;
  /** keep the page out of search — order pages, checkout, account */
  noindex?: boolean;
}): Metadata {
  const desc = description ?? SITE.description;
  const url = absoluteUrl(path);
  return {
    title,
    description: desc,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
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

/** BreadcrumbList for a leaf page — helps answer engines place the page. */
export function breadcrumbJsonLd(
  trail: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { name: "Home", path: "/" },
      ...trail,
    ].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

/** Site-wide Organization schema, emitted once in the root layout. */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  legalName: SITE.legalName,
  url: SITE.url,
  description: SITE.description,
  slogan: SITE.tagline,
  logo: absoluteUrl("/brand/rareskin-wordmark.png"),
  email: CONTACT.email,
  telephone: CONTACT.phone,
  address: {
    "@type": "PostalAddress",
    streetAddress: CONTACT.address,
    addressLocality: CONTACT.locality,
    addressRegion: CONTACT.region,
    postalCode: CONTACT.postalCode,
    addressCountry: CONTACT.country,
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: CONTACT.email,
    telephone: CONTACT.phone,
    areaServed: "IN",
    availableLanguage: ["en", "hi", "mr"],
  },
  areaServed: { "@type": "Country", name: SITE.region },
} as const;
