/**
 * Site-wide constants. Canonical URL lives here so metadata, sitemap and
 * JSON-LD all read from one place — change the domain once.
 */
export const SITE = {
  name: "THE RARESKIN",
  shortName: "RARESKIN",
  tagline: "Scents that stay with you.",
  description:
    "THE RARESKIN. Three Extrait de Parfum, made to become part of how people remember you. Different by design.",
  // TODO: confirm production domain with the client.
  url: "https://therareskin.com",
  locale: "en_IN",
  currency: "INR",
  region: "India",
} as const;

/** Absolute URL helper for canonical / OG tags. */
export function absoluteUrl(path = "/"): string {
  const base = SITE.url.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
