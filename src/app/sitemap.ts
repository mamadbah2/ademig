import type { MetadataRoute } from "next";
import { getActualites } from "@/lib/content/actualites";
import { getEvenements } from "@/lib/content/evenements";
import { absoluteUrl, navigation } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Les membres n'ont plus de page à eux : seul l'annuaire /membres figure ici (via la navigation).
  const [actualites, evenements] = await Promise.all([getActualites(), getEvenements()]);

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
      images: a.photos?.map((p) => absoluteUrl(p.src)),
    })),
    // Pas de lastModified : la date d'un événement est souvent à venir, ce n'est pas une date de modification.
    ...evenements.map((e) => ({
      url: absoluteUrl(`/evenements/${e.slug}`),
      priority: 0.7,
      images: [e.affiche, ...(e.photos ?? [])].flatMap((p) => (p ? [absoluteUrl(p.src)] : [])),
    })),
  ];
}
