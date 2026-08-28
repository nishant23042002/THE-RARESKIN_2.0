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
  legalName: "Velocity Ventures Group",
} as const;

/** Real support + registered contact details. */
export const CONTACT = {
  email: "therareskinsupport@velocityventuresgroup.in",
  phone: "+91 77439 31331",
  phoneHref: "+917743931331",
  address:
    "Shop No. 04, Jija Mata Bachat Bhavan, Near S.T. Stand, Roha, Dist. Raigad – 402109",
  locality: "Roha",
  region: "Maharashtra",
  postalCode: "402109",
  country: "IN",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Jija%20Mata%20Bachat%20Bhavan%20Near%20S.T.%20Stand%20Roha%20Raigad%20402109",
} as const;

/** Absolute URL helper for canonical / OG tags. */
export function absoluteUrl(path = "/"): string {
  const base = SITE.url.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
