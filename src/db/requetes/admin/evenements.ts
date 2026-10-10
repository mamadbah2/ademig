import { and, asc, desc, eq, ilike, type SQL } from "drizzle-orm";
import { evenements, partenaires } from "@/db/schema";
import type { Db } from "@/db/types";
import { versDateLocale } from "@/lib/admin/dates";
import type { Filtre } from "@/lib/admin/filtre";
import type { Video } from "@/lib/content/types";
import { type MediaChoisi, motifRecherche, PAR_PAGE, versMediaChoisi } from "./commun";

export type LigneEvenementAdmin = {
  id: string;
  titre: string;
  slug: string;
  debut: string;
  lieuVille: string;
  statut: "brouillon" | "publie";
};

export type EvenementAdmin = {
  id: string;
  titre: string;
  slug: string;
  // Valeurs prêtes pour `datetime-local` (heure de Dakar = UTC).
  debut: string;
  fin: string;
  lieuNom: string;
  lieuVille: string;
  theme: string;
  resume: string;
  corps: string;
  partenaires: string[];
  videos: Video[];
  affiche: MediaChoisi | null;
  photos: MediaChoisi[];
  statut: "brouillon" | "publie";
  dejaPublie: boolean;
  version: string;
};

export async function listerEvenementsAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneEvenementAdmin[]; total: number }> {
  const conditions: SQL[] = [];
  if (f.q) conditions.push(ilike(evenements.titre, motifRecherche(f.q)));
  if (f.statut) conditions.push(eq(evenements.statut, f.statut));
  const ou = conditions.length > 0 ? and(...conditions) : undefined;
  const [lignes, total] = await Promise.all([
    db
      .select({
        id: evenements.id,
        titre: evenements.titre,
        slug: evenements.slug,
        debut: evenements.debut,
        lieuVille: evenements.lieuVille,
        statut: evenements.statut,
      })
      .from(evenements)
      .where(ou)
      .orderBy(desc(evenements.debut), desc(evenements.creeLe))
      .limit(PAR_PAGE)
      .offset((f.page - 1) * PAR_PAGE),
    db.$count(evenements, ou),
  ]);
  return { lignes: lignes.map((l) => ({ ...l, debut: l.debut.toISOString() })), total };
}

export async function lireEvenementAdmin(db: Db, id: string): Promise<EvenementAdmin | undefined> {
  const e = await db.query.evenements.findFirst({
    where: eq(evenements.id, id),
    with: { affiche: true, photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  if (!e) return undefined;
  return {
    id: e.id,
    titre: e.titre,
    slug: e.slug,
    debut: versDateLocale(e.debut),
    fin: e.fin ? versDateLocale(e.fin) : "",
    lieuNom: e.lieuNom,
    lieuVille: e.lieuVille,
    theme: e.theme ?? "",
    resume: e.resume,
    corps: e.corps,
    partenaires: e.partenaires,
    videos: e.videos,
    affiche: e.affiche ? versMediaChoisi(e.affiche) : null,
    photos: e.photos.map((p) => versMediaChoisi(p.media)),
    statut: e.statut,
    dejaPublie: e.publieLe !== null,
    version: e.majLe.toISOString(),
  };
}

// Suggestions du champ « Partenaires » d'un événement (les noms restent libres).
export async function suggestionsPartenaires(db: Db): Promise<string[]> {
  const lignes = await db.select({ nom: partenaires.nom }).from(partenaires).orderBy(asc(partenaires.ordre), asc(partenaires.nom));
  return lignes.map((l) => l.nom);
}
