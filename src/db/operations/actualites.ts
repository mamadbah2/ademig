import { and, eq, ne } from "drizzle-orm";
import { actualitePhotos, actualites } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import type { Source, Video } from "@/lib/content/types";
import { CONFLIT, type Intention, memeVersion } from "./commun";
import { ErreurMetier } from "./erreurs";

export type DonneesActualite = {
  titre: string;
  slug: string;
  date: string;
  resume: string;
  corps: string;
  sources: Source[];
  videos: Video[];
  // Identifiants des médias, dans l'ordre d'affichage (le premier sert de vignette).
  photos: string[];
};

const INTROUVABLE = "Actualité introuvable.";

async function verifierSlugLibre(tx: Tx, slug: string, saufId?: string) {
  const memeSlug = eq(actualites.slug, slug);
  const [autre] = await tx
    .select({ id: actualites.id })
    .from(actualites)
    .where(saufId ? and(memeSlug, ne(actualites.id, saufId)) : memeSlug)
    .limit(1);
  if (autre) throw new ErreurMetier("Ce lien est déjà utilisé par une autre actualité.", "slug");
}

async function remplacerPhotos(tx: Tx, actualiteId: string, photos: string[]) {
  await tx.delete(actualitePhotos).where(eq(actualitePhotos.actualiteId, actualiteId));
  if (photos.length > 0) {
    await tx.insert(actualitePhotos).values(photos.map((mediaId, ordre) => ({ actualiteId, mediaId, ordre })));
  }
}

export async function creerActualite(db: Db, d: DonneesActualite, intention: Intention): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierSlugLibre(tx, d.slug);
    const { photos, ...champs } = d;
    const publier = intention === "publier";
    const [ligne] = await tx
      .insert(actualites)
      .values({ ...champs, statut: publier ? "publie" : "brouillon", publieLe: publier ? new Date() : null })
      .returning({ id: actualites.id });
    await remplacerPhotos(tx, ligne.id, photos);
    return ligne;
  });
}

export async function modifierActualite(
  db: Db,
  id: string,
  d: DonneesActualite,
  o: { version: string; intention: Intention; modifierSlug: boolean },
): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuelle = await tx.query.actualites.findFirst({
      where: eq(actualites.id, id),
      columns: { slug: true, statut: true, publieLe: true },
    });
    if (!actuelle) throw new ErreurMetier(INTROUVABLE);
    if (d.slug !== actuelle.slug) {
      // Un lien déjà publié a pu être partagé : on ne le change que sur demande explicite.
      if (actuelle.publieLe && !o.modifierSlug) {
        throw new ErreurMetier("Cette actualité a déjà été publiée : cliquez sur « Modifier le lien » pour changer son adresse.", "slug");
      }
      await verifierSlugLibre(tx, d.slug, id);
    }
    const statut = o.intention === "publier" ? "publie" : o.intention === "depublier" ? "brouillon" : actuelle.statut;
    const publieLe = actuelle.publieLe ?? (statut === "publie" ? new Date() : null);
    const { photos, ...champs } = d;
    const [maj] = await tx
      .update(actualites)
      .set({ ...champs, statut, publieLe })
      .where(and(eq(actualites.id, id), memeVersion(actualites.majLe, o.version)))
      .returning({ majLe: actualites.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    await remplacerPhotos(tx, id, photos);
    return { version: maj.majLe.toISOString() };
  });
}

export async function supprimerActualite(db: Db, id: string): Promise<void> {
  // Les liaisons photos partent en cascade ; les images restent dans la médiathèque.
  const lignes = await db.delete(actualites).where(eq(actualites.id, id)).returning({ id: actualites.id });
  if (lignes.length === 0) throw new ErreurMetier(INTROUVABLE);
}
