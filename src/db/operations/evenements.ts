import { and, eq } from "drizzle-orm";
import { evenementPhotos, evenements } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import type { Video } from "@/lib/content/types";
import { CONFLIT, exigerSlugModifiable, type Intention, memeVersion, publication, verifierSlugLibre } from "./commun";
import { ErreurMetier } from "./erreurs";

export type DonneesEvenement = {
  titre: string;
  slug: string;
  debut: Date;
  fin: Date | null;
  lieuNom: string;
  lieuVille: string;
  theme: string | null;
  resume: string;
  corps: string;
  // Noms libres : un partenaire d'un événement peut ne pas figurer dans la table `partenaires`.
  partenaires: string[];
  videos: Video[];
  afficheId: string | null;
  // Identifiants des médias, dans l'ordre d'affichage.
  photos: string[];
};

const INTROUVABLE = "Événement introuvable.";
const SLUG_PRIS = "Ce lien est déjà utilisé par un autre événement.";
const colonnesSlug = { table: evenements, id: evenements.id, slug: evenements.slug };

async function remplacerPhotos(tx: Tx, evenementId: string, photos: string[]) {
  await tx.delete(evenementPhotos).where(eq(evenementPhotos.evenementId, evenementId));
  if (photos.length > 0) {
    await tx.insert(evenementPhotos).values(photos.map((mediaId, ordre) => ({ evenementId, mediaId, ordre })));
  }
}

export async function creerEvenement(db: Db, d: DonneesEvenement, intention: Intention): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS);
    const { photos, ...champs } = d;
    const [ligne] = await tx
      .insert(evenements)
      .values({ ...champs, ...publication(intention, null) })
      .returning({ id: evenements.id });
    await remplacerPhotos(tx, ligne.id, photos);
    return ligne;
  });
}

export async function modifierEvenement(
  db: Db,
  id: string,
  d: DonneesEvenement,
  o: { version: string; intention: Intention; modifierSlug: boolean },
): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuel = await tx.query.evenements.findFirst({
      where: eq(evenements.id, id),
      columns: { slug: true, statut: true, publieLe: true },
    });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    const message = "Cet événement a déjà été publié : cliquez sur « Modifier le lien » pour changer son adresse.";
    if (exigerSlugModifiable(actuel, d.slug, o.modifierSlug, message)) {
      await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS, id);
    }
    const { photos, ...champs } = d;
    const [maj] = await tx
      .update(evenements)
      .set({ ...champs, ...publication(o.intention, actuel) })
      .where(and(eq(evenements.id, id), memeVersion(evenements.majLe, o.version)))
      .returning({ majLe: evenements.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    await remplacerPhotos(tx, id, photos);
    return { version: maj.majLe.toISOString() };
  });
}

export async function supprimerEvenement(db: Db, id: string): Promise<void> {
  // Les liaisons photos partent en cascade ; l'affiche et les photos restent dans la médiathèque.
  const lignes = await db.delete(evenements).where(eq(evenements.id, id)).returning({ id: evenements.id });
  if (lignes.length === 0) throw new ErreurMetier(INTROUVABLE);
}
