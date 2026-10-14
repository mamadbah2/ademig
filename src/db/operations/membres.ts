import { and, eq } from "drizzle-orm";
import { commissionMembres, membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Etape, Liens, Realisation } from "@/lib/content/types";
import { CONFLIT, memeVersion, verifierSlugLibre } from "./commun";
import { ErreurMetier } from "./erreurs";

// Sortie exacte du schéma de validation : les champs que l'admin saisit encore.
export type DonneesMembre = {
  nom: string;
  slug: string;
  titre: string;
  specialite: string;
  promotion: number | null;
  organisation: string | null;
  // Seul le lien LinkedIn est saisi ; l'email et le site déjà en base sont conservés.
  liens: Liens | null;
  photoId: string | null;
  visible: boolean;
};

// Colonnes que le formulaire ne montre plus, gardées en base (import, données d'origine, tests).
export type ChampsConserves = {
  numero: number | null;
  ville: string | null;
  resume: string;
  // HTML nettoyé, ou null.
  bio: string | null;
  parcours: Etape[];
  competences: string[];
  realisations: Realisation[];
};

export type DonneesCreationMembre = DonneesMembre & Partial<ChampsConserves>;

const INTROUVABLE = "Membre introuvable.";
const SLUG_PRIS = "Ce lien est déjà utilisé par un autre membre.";
export const DANS_UN_BUREAU =
  "Ce membre fait partie d'un bureau, actuel ou passé : il ne peut pas être supprimé. Décochez « Visible sur le site » pour masquer sa fiche.";
const colonnesSlug = { table: membres, id: membres.id, slug: membres.slug };

export async function creerMembre(db: Db, d: DonneesCreationMembre): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS);
    // Le résumé est NOT NULL : une fiche créée depuis l'admin n'en a plus.
    const [ligne] = await tx.insert(membres).values({ ...d, resume: d.resume ?? "" }).returning({ id: membres.id });
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
    const actuel = await tx.query.membres.findFirst({ where: eq(membres.id, id), columns: { slug: true, visible: true, liens: true } });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    if (d.slug !== actuel.slug) {
      // Fiche visible : son lien a pu être partagé, il ne change que sur demande explicite.
      if (actuel.visible && !o.modifierSlug) {
        throw new ErreurMetier("Cette fiche est visible sur le site : cliquez sur « Modifier le lien » pour changer son adresse.", "slug");
      }
      await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS, id);
    }
    // Seuls les champs du formulaire sont écrits : les colonnes conservées restent intactes.
    // L'email et le site déjà en base survivent ; le lien LinkedIn suit la saisie.
    const liens: Liens = { ...actuel.liens };
    delete liens.linkedin;
    if (d.liens?.linkedin) liens.linkedin = d.liens.linkedin;
    const [maj] = await tx
      .update(membres)
      .set({
        nom: d.nom,
        slug: d.slug,
        titre: d.titre,
        specialite: d.specialite,
        promotion: d.promotion,
        organisation: d.organisation,
        liens: Object.keys(liens).length > 0 ? liens : null,
        photoId: d.photoId,
        visible: d.visible,
      })
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
