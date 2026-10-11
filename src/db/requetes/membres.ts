import { eq } from "drizzle-orm";
import { mandats, type media, type membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Member } from "@/lib/content/types";
import { siNonVide } from "./commun";

type Ligne = typeof membres.$inferSelect & { photo: typeof media.$inferSelect | null };

function versMembre(r: Ligne, fonction: string | undefined): Member {
  return {
    slug: r.slug,
    nom: r.nom,
    fonction,
    titre: r.titre,
    organisation: r.organisation ?? undefined,
    specialite: r.specialite,
    promotion: r.promotion ?? undefined,
    numero: r.numero ?? undefined,
    ville: r.ville ?? undefined,
    photo: r.photo?.url,
    resume: r.resume,
    bio: r.bio ?? undefined,
    parcours: r.parcours,
    competences: r.competences,
    realisations: siNonVide(r.realisations),
    liens: r.liens ?? undefined,
  };
}

export async function postesDuMandatActif(db: Db) {
  const postes = await db
    .select({ membreId: postesBureau.membreId, fonction: postesBureau.fonction, ordre: postesBureau.ordre })
    .from(postesBureau)
    .innerJoin(mandats, eq(mandats.id, postesBureau.mandatId))
    .where(eq(mandats.actif, true));
  return new Map(postes.map((p) => [p.membreId, p]));
}

// Membres visibles avec leur identifiant, dans l'ordre des postes puis par nom.
export async function membresVisibles(db: Db): Promise<{ id: string; membre: Member }[]> {
  const postes = await postesDuMandatActif(db);
  const lignes = await db.query.membres.findMany({ where: (m, { eq }) => eq(m.visible, true), with: { photo: true } });
  const rang = (id: string) => postes.get(id)?.ordre ?? Number.MAX_SAFE_INTEGER;
  return lignes
    .sort((a, b) => rang(a.id) - rang(b.id) || a.nom.localeCompare(b.nom, "fr"))
    .map((r) => ({ id: r.id, membre: versMembre(r, postes.get(r.id)?.fonction) }));
}

export async function listerMembres(db: Db): Promise<Member[]> {
  return (await membresVisibles(db)).map((m) => m.membre);
}

// `masques` n'est utilisé que pour l'aperçu, après contrôle de la session (src/lib/apercu.ts).
export async function trouverMembre(db: Db, slug: string, o: { masques?: boolean } = {}): Promise<Member | undefined> {
  const r = await db.query.membres.findFirst({
    where: (m, { and, eq }) => (o.masques ? eq(m.slug, slug) : and(eq(m.slug, slug), eq(m.visible, true))),
    with: { photo: true },
  });
  if (!r) return undefined;
  const postes = await postesDuMandatActif(db);
  return versMembre(r, postes.get(r.id)?.fonction);
}
