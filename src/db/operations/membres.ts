import { and, eq } from "drizzle-orm";
import { commissionMembres, membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Liens } from "@/lib/content/types";
import { CONFLIT, memeVersion, verifierSlugLibre } from "./commun";
import { ErreurMetier } from "./erreurs";

// Sortie exacte du schéma de validation : les champs facultatifs d'une étape ou d'une réalisation
// sont toujours présents, éventuellement `undefined`.
type EtapeSaisie = { periode: string; poste: string; organisation: string; description: string | undefined };
type RealisationSaisie = { titre: string; annee: string | undefined; description: string };

export type DonneesMembre = {
  nom: string;
  slug: string;
  titre: string;
  specialite: string;
  promotion: number | null;
  numero: number | null;
  organisation: string | null;
  ville: string | null;
  resume: string;
  // HTML nettoyé, ou null : la fiche affiche alors le résumé.
  bio: string | null;
  parcours: EtapeSaisie[];
  competences: string[];
  realisations: RealisationSaisie[];
  liens: Liens | null;
  photoId: string | null;
  visible: boolean;
};

const INTROUVABLE = "Membre introuvable.";
const SLUG_PRIS = "Ce lien est déjà utilisé par un autre membre.";
export const DANS_UN_BUREAU =
  "Ce membre fait partie d'un bureau, actuel ou passé : il ne peut pas être supprimé. Décochez « Visible sur le site » pour masquer sa fiche.";
const colonnesSlug = { table: membres, id: membres.id, slug: membres.slug };

export async function creerMembre(db: Db, d: DonneesMembre): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS);
    const [ligne] = await tx.insert(membres).values(d).returning({ id: membres.id });
    return ligne;
  });
}

export async function modifierMembre(
  db: Db,
  id: string,
  d: DonneesMembre,
  o: { version: string; modifierSlug: boolean },
): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuel = await tx.query.membres.findFirst({ where: eq(membres.id, id), columns: { slug: true, visible: true } });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    if (d.slug !== actuel.slug) {
      // Fiche visible : son lien a pu être partagé, il ne change que sur demande explicite.
      if (actuel.visible && !o.modifierSlug) {
        throw new ErreurMetier("Cette fiche est visible sur le site : cliquez sur « Modifier le lien » pour changer son adresse.", "slug");
      }
      await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS, id);
    }
    const [maj] = await tx
      .update(membres)
      .set(d)
      .where(and(eq(membres.id, id), memeVersion(membres.majLe, o.version)))
      .returning({ majLe: membres.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    return { version: maj.majLe.toISOString() };
  });
}

// Les postes et commissions partiraient en cascade : on refuse pour garder l'historique des bureaux.
export async function supprimerMembre(db: Db, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Verrou : un enregistrement de mandat concurrent attend ici au lieu de voir ses postes effacés en cascade.
    const [actuel] = await tx.select({ id: membres.id }).from(membres).where(eq(membres.id, id)).for("update");
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    const postes = await tx.$count(postesBureau, eq(postesBureau.membreId, id));
    const places = await tx.$count(commissionMembres, eq(commissionMembres.membreId, id));
    if (postes + places > 0) throw new ErreurMetier(DANS_UN_BUREAU);
    await tx.delete(membres).where(eq(membres.id, id));
  });
}
