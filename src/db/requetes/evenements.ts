import type { evenementPhotos, evenements, media } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Evenement } from "@/lib/content/types";
import { siNonVide, versPhoto } from "./commun";

type LigneMedia = typeof media.$inferSelect;
type Ligne = typeof evenements.$inferSelect & {
  affiche: LigneMedia | null;
  photos: (typeof evenementPhotos.$inferSelect & { media: LigneMedia })[];
};

function versEvenement(r: Ligne): Evenement {
  return {
    slug: r.slug,
    titre: r.titre,
    debut: r.debut.toISOString(),
    fin: r.fin?.toISOString(),
    lieu: { nom: r.lieuNom, ville: r.lieuVille },
    theme: r.theme ?? undefined,
    resume: r.resume,
    corps: r.corps,
    partenaires: siNonVide(r.partenaires),
    videos: siNonVide(r.videos),
    affiche: r.affiche
      ? { src: r.affiche.url, alt: r.affiche.alt, width: r.affiche.width, height: r.affiche.height }
      : undefined,
    photos: siNonVide(r.photos.map((p) => versPhoto(p.media))),
  };
}

export async function listerEvenements(db: Db): Promise<Evenement[]> {
  const lignes = await db.query.evenements.findMany({
    where: (e, { eq }) => eq(e.statut, "publie"),
    orderBy: (e, { desc }) => [desc(e.debut)],
    with: { affiche: true, photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return lignes.map(versEvenement);
}

export async function trouverEvenement(db: Db, slug: string): Promise<Evenement | undefined> {
  const ligne = await db.query.evenements.findFirst({
    where: (e, { and, eq }) => and(eq(e.slug, slug), eq(e.statut, "publie")),
    with: { affiche: true, photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return ligne && versEvenement(ligne);
}
