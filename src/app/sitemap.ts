import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";
import { ORDER } from "@/lib/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const primary = ["/", "/discovery-set"];
  const secondary = ["/the-idea", "/contact"];
  const legal = ["/shipping", "/returns", "/privacy", "/terms"];
  const pdp = ORDER.map((slug) => `/fragrances/${slug}`);

  const entry = (
    path: string,
    priority: number,
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  ): MetadataRoute.Sitemap[number] => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency,
    priority,
  });

  return [
    entry("/", 1, "weekly"),
    ...pdp.map((p) => entry(p, 0.9, "weekly")),
    ...primary.filter((p) => p !== "/").map((p) => entry(p, 0.8, "monthly")),
    ...secondary.map((p) => entry(p, 0.5, "monthly")),
    ...legal.map((p) => entry(p, 0.3, "yearly")),
  ];
}
