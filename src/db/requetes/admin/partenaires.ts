import { eq } from "drizzle-orm";
import { partenaires } from "@/db/schema";
import type { Db } from "@/db/types";
import { type MediaChoisi, versMediaChoisi } from "./commun";

type Categorie = (typeof partenaires.$inferSelect)["categorie"];

export type LignePartenaireAdmin = { id: string; nom: string; categorie: Categorie; visible: boolean; logo: MediaChoisi | null };

export type PartenaireAdmin = {
  id: string;
  nom: string;
  description: string;
  categorie: Categorie;
  url: string;
  logo: MediaChoisi | null;
  visible: boolean;
  version: string;
};

export async function listerPartenairesAdmin(db: Db): Promise<LignePartenaireAdmin[]> {
  const lignes = await db.query.partenaires.findMany({
    orderBy: (p, { asc }) => [asc(p.ordre), asc(p.nom)],
    with: { logo: true },
  });
  return lignes.map((p) => ({ id: p.id, nom: p.nom, categorie: p.categorie, visible: p.visible, logo: p.logo ? versMediaChoisi(p.logo) : null }));
}

export async function lirePartenaireAdmin(db: Db, id: string): Promise<PartenaireAdmin | undefined> {
  const p = await db.query.partenaires.findFirst({ where: eq(partenaires.id, id), with: { logo: true } });
  if (!p) return undefined;
  return {
    id: p.id,
    nom: p.nom,
    description: p.description,
    categorie: p.categorie,
    url: p.url ?? "",
    logo: p.logo ? versMediaChoisi(p.logo) : null,
    visible: p.visible,
    version: p.majLe.toISOString(),
  };
}
