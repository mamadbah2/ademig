import type { actualitePhotos, actualites, media } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Actualite } from "@/lib/content/types";
import { siNonVide, versPhoto } from "./commun";

type Ligne = typeof actualites.$inferSelect & {
  photos: (typeof actualitePhotos.$inferSelect & { media: typeof media.$inferSelect })[];
};

function versActualite(r: Ligne): Actualite {
  return {
    slug: r.slug,
    titre: r.titre,
    date: r.date,
    resume: r.resume,
    corps: r.corps,
    sources: siNonVide(r.sources),
    videos: siNonVide(r.videos),
    photos: siNonVide(r.photos.map((p) => versPhoto(p.media))),
  };
}

export async function listerActualites(db: Db): Promise<Actualite[]> {
  const lignes = await db.query.actualites.findMany({
    where: (a, { eq }) => eq(a.statut, "publie"),
    orderBy: (a, { desc }) => [desc(a.date)],
    with: { photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return lignes.map(versActualite);
}

// `brouillons` n'est utilisé que pour l'aperçu, après contrôle de la session (src/lib/apercu.ts).
export async function trouverActualite(db: Db, slug: string, o: { brouillons?: boolean } = {}): Promise<Actualite | undefined> {
  const ligne = await db.query.actualites.findFirst({
    where: (a, { and, eq }) => (o.brouillons ? eq(a.slug, slug) : and(eq(a.slug, slug), eq(a.statut, "publie"))),
    with: { photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return ligne && versActualite(ligne);
}
