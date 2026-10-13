import { and, asc, eq, ilike, isNotNull } from "drizzle-orm";
import { type SuiviInvitation, suiviInvitations } from "@/db/operations/invitations";
import { account, membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Filtre } from "@/lib/admin/filtre";
import type { Etape, Realisation } from "@/lib/content/types";
import { postesDuMandatActif } from "../membres";
import { type MediaChoisi, motifRecherche, PAR_PAGE, versMediaChoisi } from "./commun";

export type LigneMembreAdmin = {
  id: string;
  nom: string;
  slug: string;
  titre: string;
  visible: boolean;
  fonction: string | null;
  // Null tant que la fiche n'a pas de compte.
  suivi: SuiviInvitation | null;
};

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

const colonnesListe = { id: membres.id, nom: membres.nom, slug: membres.slug, titre: membres.titre, visible: membres.visible, userId: membres.userId };
type FicheListe = { id: string; nom: string; slug: string; titre: string; visible: boolean; userId: string | null };

export async function listerMembresAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneMembreAdmin[]; total: number }> {
  const ou = f.q ? ilike(membres.nom, motifRecherche(f.q)) : undefined;
  const postes = postesDuMandatActif(db);
  let page: FicheListe[];
  let total: number;
  let suivi: Map<string, SuiviInvitation>;
  if (f.compte) {
    // Le statut se déduit de l'email, de l'invitation et du compte : on le calcule pour toutes les
    // fiches liées à un compte, puis on filtre et on pagine ici (quelques centaines de membres).
    const liees = await db.select(colonnesListe).from(membres).where(and(ou, isNotNull(membres.userId))).orderBy(asc(membres.nom));
    suivi = await suiviInvitations(db, liees.map((m) => m.userId!));
    const retenues = liees.filter((m) => suivi.get(m.userId!)?.statut === f.compte);
    total = retenues.length;
    page = retenues.slice((f.page - 1) * PAR_PAGE, f.page * PAR_PAGE);
  } else {
    [page, total] = await Promise.all([
      db.select(colonnesListe).from(membres).where(ou).orderBy(asc(membres.nom)).limit(PAR_PAGE).offset((f.page - 1) * PAR_PAGE),
      db.$count(membres, ou),
    ]);
    suivi = await suiviInvitations(db, page.flatMap((m) => (m.userId ? [m.userId] : [])));
  }
  const fonctions = await postes;
  return {
    lignes: page.map(({ userId, ...m }) => ({ ...m, fonction: fonctions.get(m.id)?.fonction ?? null, suivi: userId ? (suivi.get(userId) ?? null) : null })),
    total,
  };
}

export type CompteDuMembre = { userId: string; email: string; actif: boolean; aMotDePasse: boolean; suivi: SuiviInvitation };

// Compte lié à une fiche, avec le statut de son invitation (null si la fiche n'a pas de compte).
export async function lireCompteDuMembre(db: Db, membreId: string): Promise<CompteDuMembre | null> {
  const [ligne] = await db
    .select({ userId: user.id, email: user.email, actif: user.actif })
    .from(membres)
    .innerJoin(user, eq(user.id, membres.userId))
    .where(eq(membres.id, membreId));
  if (!ligne) return null;
  const suivi = (await suiviInvitations(db, [ligne.userId])).get(ligne.userId)!;
  const mdp = await db.query.account.findFirst({
    where: and(eq(account.userId, ligne.userId), eq(account.providerId, "credential")),
    columns: { id: true },
  });
  return { ...ligne, aMotDePasse: Boolean(mdp), suivi };
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
