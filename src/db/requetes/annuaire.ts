import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { media, membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { motifRecherche } from "./admin/commun";

export const PAR_PAGE_ANNUAIRE = 24;

// Volontairement sans téléphone, email de contact ni statut de cotisation : jamais affichés aux autres membres.
export type FicheAnnuaire = {
  slug: string;
  nom: string;
  photo: string | null;
  promotion: number | null;
  specialite: string;
  organisation: string | null;
  ville: string | null;
  linkedin: string | null;
  resume: string;
};
export type FiltreAnnuaire = { q: string; promotion: number | null; specialite: string | null; page: number };

// Listée : fiche publique (le bureau figure ici même sans compte), ou fiche d'annuaire dont le compte est activé.
const listee = or(eq(membres.visible, true), and(eq(membres.annuaire, true), eq(user.actif, true)));

// Défense en profondeur : seule une adresse LinkedIn https est rendue, quoi que la base contienne.
const LINKEDIN_SUR = /^https:\/\/(www\.)?linkedin\.com\//;

// Identifiants des fiches listées (jointure sur le compte et condition d'éligibilité), partagés par toutes les requêtes.
function idsListees(db: Db) {
  return db.select({ id: membres.id }).from(membres).leftJoin(user, eq(user.id, membres.userId)).where(listee);
}

export async function listerAnnuaire(
  db: Db,
  f: FiltreAnnuaire,
): Promise<{ fiches: FicheAnnuaire[]; total: number; promotions: number[]; specialites: string[] }> {
  const motif = f.q ? motifRecherche(f.q) : null;
  const dansLAnnuaire = inArray(membres.id, idsListees(db));
  const cond = and(
    dansLAnnuaire,
    motif ? or(ilike(membres.nom, motif), ilike(membres.organisation, motif)) : undefined,
    f.promotion !== null ? eq(membres.promotion, f.promotion) : undefined,
    f.specialite ? eq(membres.specialite, f.specialite) : undefined,
  );

  const [lignes, total, promotions, specialites] = await Promise.all([
    db
      .select({
        slug: membres.slug,
        nom: membres.nom,
        photo: media.url,
        promotion: membres.promotion,
        specialite: membres.specialite,
        organisation: membres.organisation,
        ville: membres.ville,
        liens: membres.liens,
        resume: membres.resume,
      })
      .from(membres)
      .leftJoin(media, eq(media.id, membres.photoId))
      .where(cond)
      .orderBy(asc(membres.nom), asc(membres.slug))
      .limit(PAR_PAGE_ANNUAIRE)
      .offset((f.page - 1) * PAR_PAGE_ANNUAIRE),
    db.$count(membres, cond),
    db.selectDistinct({ promotion: membres.promotion }).from(membres).where(dansLAnnuaire).orderBy(desc(membres.promotion)),
    db.selectDistinct({ specialite: membres.specialite }).from(membres).where(dansLAnnuaire).orderBy(asc(membres.specialite)),
  ]);

  return {
    fiches: lignes.map(({ liens, ...l }) => ({ ...l, linkedin: liens?.linkedin && LINKEDIN_SUR.test(liens.linkedin) ? liens.linkedin : null })),
    total,
    promotions: promotions.flatMap((p) => (p.promotion === null ? [] : [p.promotion])),
    specialites: specialites.map((s) => s.specialite),
  };
}
