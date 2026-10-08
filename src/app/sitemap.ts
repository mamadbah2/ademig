import type { MetadataRoute } from "next";
import { getActualites } from "@/lib/content/actualites";
import { getEvenements } from "@/lib/content/evenements";
import { getMembres } from "@/lib/content/membres";
import { absoluteUrl, navigation } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [actualites, evenements, membres] = await Promise.all([
    getActualites(),
    getEvenements(),
    getMembres(),
  ]);

  return [
    ...navigation.map((item) => ({
      url: absoluteUrl(item.href),
      changeFrequency: "weekly" as const,
      priority: item.href === "/" ? 1 : 0.8,
    })),
    ...actualites.map((a) => ({
      url: absoluteUrl(`/actualites/${a.slug}`),
      lastModified: a.date,
      priority: 0.7,
    })),
    ...evenements.map((e) => ({
      url: absoluteUrl(`/evenements/${e.slug}`),
      lastModified: e.debut,
      priority: 0.7,
    })),
    ...membres.map((m) => ({ url: absoluteUrl(`/membres/${m.slug}`), priority: 0.6 })),
  ];
}
