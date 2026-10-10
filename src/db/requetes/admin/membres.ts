import { asc, eq, ilike } from "drizzle-orm";
import { membres } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Filtre } from "@/lib/admin/filtre";
import type { Etape, Realisation } from "@/lib/content/types";
import { postesDuMandatActif } from "../membres";
import { type MediaChoisi, motifRecherche, PAR_PAGE, versMediaChoisi } from "./commun";

export type LigneMembreAdmin = { id: string; nom: string; slug: string; titre: string; visible: boolean; fonction: string | null };

export type MembreAdmin = {
  id: string;
  nom: string;
  slug: string;
  titre: string;
  specialite: string;
  // Champs facultatifs : "" quand ils sont vides, prêts pour les `defaultValue`.
  promotion: string;
  numero: string;
  organisation: string;
  ville: string;
  resume: string;
  bio: string;
  parcours: Etape[];
  competences: string[];
  realisations: Realisation[];
  liens: { linkedin: string; email: string; site: string };
  photo: MediaChoisi | null;
  visible: boolean;
  // Fonction au bureau en place, en lecture seule (elle se modifie dans la rubrique Bureau).
  fonction: string | null;
  version: string;
};

export type OptionMembre = { id: string; nom: string; visible: boolean };

export async function listerMembresAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneMembreAdmin[]; total: number }> {
  const ou = f.q ? ilike(membres.nom, motifRecherche(f.q)) : undefined;
  const [lignes, total, postes] = await Promise.all([
    db
      .select({ id: membres.id, nom: membres.nom, slug: membres.slug, titre: membres.titre, visible: membres.visible })
      .from(membres)
      .where(ou)
      .orderBy(asc(membres.nom))
      .limit(PAR_PAGE)
      .offset((f.page - 1) * PAR_PAGE),
    db.$count(membres, ou),
    postesDuMandatActif(db),
  ]);
  return { lignes: lignes.map((l) => ({ ...l, fonction: postes.get(l.id)?.fonction ?? null })), total };
}

export async function lireMembreAdmin(db: Db, id: string): Promise<MembreAdmin | undefined> {
  const m = await db.query.membres.findFirst({ where: eq(membres.id, id), with: { photo: true } });
  if (!m) return undefined;
  const postes = await postesDuMandatActif(db);
  return {
    id: m.id,
    nom: m.nom,
    slug: m.slug,
    titre: m.titre,
    specialite: m.specialite,
    promotion: m.promotion?.toString() ?? "",
    numero: m.numero?.toString() ?? "",
    organisation: m.organisation ?? "",
    ville: m.ville ?? "",
    resume: m.resume,
    bio: m.bio ?? "",
    parcours: m.parcours,
    competences: m.competences,
    realisations: m.realisations,
    liens: { linkedin: m.liens?.linkedin ?? "", email: m.liens?.email ?? "", site: m.liens?.site ?? "" },
    photo: m.photo ? versMediaChoisi(m.photo) : null,
    visible: m.visible,
    fonction: postes.get(m.id)?.fonction ?? null,
    version: m.majLe.toISOString(),
  };
}

// Choix d'un membre dans les postes et les commissions d'un mandat.
export async function optionsMembres(db: Db): Promise<OptionMembre[]> {
  return db.select({ id: membres.id, nom: membres.nom, visible: membres.visible }).from(membres).orderBy(asc(membres.nom));
}
