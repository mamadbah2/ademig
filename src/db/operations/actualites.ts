import { and, eq } from "drizzle-orm";
import { actualitePhotos, actualites } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import type { Source, Video } from "@/lib/content/types";
import { CONFLIT, exigerSlugModifiable, type Intention, memeVersion, publication, verifierSlugLibre } from "./commun";
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

const COLONNES_SLUG = { table: actualites, id: actualites.id, slug: actualites.slug };
const SLUG_PRIS = "Ce lien est déjà utilisé par une autre actualité.";

async function remplacerPhotos(tx: Tx, actualiteId: string, photos: string[]) {
  await tx.delete(actualitePhotos).where(eq(actualitePhotos.actualiteId, actualiteId));
  if (photos.length > 0) {
    await tx.insert(actualitePhotos).values(photos.map((mediaId, ordre) => ({ actualiteId, mediaId, ordre })));
  }
}

export async function creerActualite(db: Db, d: DonneesActualite, intention: Intention): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierSlugLibre(tx, COLONNES_SLUG, d.slug, SLUG_PRIS);
    const { photos, ...champs } = d;
    const [ligne] = await tx
      .insert(actualites)
      .values({ ...champs, ...publication(intention, null) })
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
    const message = "Cette actualité a déjà été publiée : cliquez sur « Modifier le lien » pour changer son adresse.";
    if (exigerSlugModifiable(actuelle, d.slug, o.modifierSlug, message)) {
      await verifierSlugLibre(tx, COLONNES_SLUG, d.slug, SLUG_PRIS, id);
    }
    const { photos, ...champs } = d;
    const [maj] = await tx
      .update(actualites)
      .set({ ...champs, ...publication(o.intention, actuelle) })
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
