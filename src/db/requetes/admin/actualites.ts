import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { actualites } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Source, Video } from "@/lib/content/types";
import type { Filtre } from "@/lib/admin/filtre";
import { type MediaChoisi, motifRecherche, PAR_PAGE, versMediaChoisi } from "./commun";

export type LigneActualiteAdmin = { id: string; titre: string; slug: string; date: string; statut: "brouillon" | "publie" };

export type ActualiteAdmin = {
  id: string;
  titre: string;
  slug: string;
  date: string;
  resume: string;
  corps: string;
  sources: Source[];
  videos: Video[];
  statut: "brouillon" | "publie";
  // Publiée au moins une fois : son lien a pu être partagé.
  dejaPubliee: boolean;
  // `maj_le` à la milliseconde, renvoyé par le formulaire pour détecter les modifications concurrentes.
  version: string;
  photos: MediaChoisi[];
};

export async function listerActualitesAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneActualiteAdmin[]; total: number }> {
  const conditions: SQL[] = [];
  if (f.q) conditions.push(ilike(actualites.titre, motifRecherche(f.q)));
  if (f.statut) conditions.push(eq(actualites.statut, f.statut));
  const ou = conditions.length > 0 ? and(...conditions) : undefined;
  const [lignes, total] = await Promise.all([
    db
      .select({ id: actualites.id, titre: actualites.titre, slug: actualites.slug, date: actualites.date, statut: actualites.statut })
      .from(actualites)
      .where(ou)
      .orderBy(desc(actualites.date), desc(actualites.creeLe))
      .limit(PAR_PAGE)
      .offset((f.page - 1) * PAR_PAGE),
    db.$count(actualites, ou),
  ]);
  return { lignes, total };
}

export async function lireActualiteAdmin(db: Db, id: string): Promise<ActualiteAdmin | undefined> {
  const a = await db.query.actualites.findFirst({
    where: eq(actualites.id, id),
    with: { photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  if (!a) return undefined;
  return {
    id: a.id,
    titre: a.titre,
    slug: a.slug,
    date: a.date,
    resume: a.resume,
    corps: a.corps,
    sources: a.sources,
    videos: a.videos,
    statut: a.statut,
    dejaPubliee: a.publieLe !== null,
    version: a.majLe.toISOString(),
    photos: a.photos.map((p) => versMediaChoisi(p.media)),
  };
}
