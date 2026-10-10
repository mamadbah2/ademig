import { and, asc, eq, ne, sql } from "drizzle-orm";
import { partenaires } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import { CONFLIT, memeVersion } from "./commun";
import { ErreurMetier } from "./erreurs";

export type DonneesPartenaire = {
  nom: string;
  description: string;
  categorie: (typeof partenaires.$inferInsert)["categorie"];
  url: string | null;
  logoId: string | null;
  visible: boolean;
};

const INTROUVABLE = "Partenaire introuvable.";

async function verifierNomLibre(tx: Tx, nom: string, saufId?: string) {
  const memeNom = sql`lower(${partenaires.nom}) = lower(${nom})`;
  const [autre] = await tx
    .select({ id: partenaires.id })
    .from(partenaires)
    .where(saufId ? and(memeNom, ne(partenaires.id, saufId)) : memeNom)
    .limit(1);
  if (autre) throw new ErreurMetier("Ce partenaire existe déjà.", "nom");
}

export async function creerPartenaire(db: Db, d: DonneesPartenaire): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierNomLibre(tx, d.nom);
    const [{ dernier }] = await tx.select({ dernier: sql<number>`coalesce(max(${partenaires.ordre}), -1)` }).from(partenaires);
    const [ligne] = await tx
      .insert(partenaires)
      .values({ ...d, ordre: Number(dernier) + 1 })
      .returning({ id: partenaires.id });
    return ligne;
  });
}

export async function modifierPartenaire(db: Db, id: string, d: DonneesPartenaire, o: { version: string }): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuel = await tx.query.partenaires.findFirst({ where: eq(partenaires.id, id), columns: { id: true } });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    await verifierNomLibre(tx, d.nom, id);
    const [maj] = await tx
      .update(partenaires)
      .set(d)
      .where(and(eq(partenaires.id, id), memeVersion(partenaires.majLe, o.version)))
      .returning({ majLe: partenaires.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    return { version: maj.majLe.toISOString() };
  });
}

export async function supprimerPartenaire(db: Db, id: string): Promise<void> {
  const lignes = await db.delete(partenaires).where(eq(partenaires.id, id)).returning({ id: partenaires.id });
  if (lignes.length === 0) throw new ErreurMetier(INTROUVABLE);
}

// Échange avec le voisin puis renumérote 0..n-1 : répare au passage les ordres en double ou troués.
export async function deplacerPartenaire(db: Db, id: string, sens: -1 | 1): Promise<void> {
  await db.transaction(async (tx) => {
    // Verrou d'abord, lecture ensuite : sous READ COMMITTED, un ORDER BY … FOR UPDATE peut renvoyer un ordre périmé.
    await tx.select({ id: partenaires.id }).from(partenaires).for("update");
    const lignes = await tx
      .select({ id: partenaires.id, ordre: partenaires.ordre })
      .from(partenaires)
      .orderBy(asc(partenaires.ordre), asc(partenaires.nom));
    const index = lignes.findIndex((l) => l.id === id);
    if (index === -1) throw new ErreurMetier(INTROUVABLE);
    const cible = index + sens;
    if (cible < 0 || cible >= lignes.length) return;
    [lignes[index], lignes[cible]] = [lignes[cible], lignes[index]];
    for (const [ordre, ligne] of lignes.entries()) {
      // majLe est recopié : renuméroter ne doit pas invalider la version d'un formulaire ouvert.
      if (ligne.ordre !== ordre) await tx.update(partenaires).set({ ordre, majLe: sql`${partenaires.majLe}` }).where(eq(partenaires.id, ligne.id));
    }
  });
}
