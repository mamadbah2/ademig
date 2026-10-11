import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { commissionMembres, commissions, mandats, membres, postesBureau } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import { CONFLIT, memeVersion } from "./commun";
import { ErreurMetier } from "./erreurs";

export type PosteSaisi = { membreId: string; fonction: string; executif: boolean };
export type CommissionSaisie = { nom: string; mission: string; membres: string[] };
export type DonneesMandat = { libelle: string; dateElection: string; postes: PosteSaisi[]; commissions: CommissionSaisie[] };

const INTROUVABLE = "Mandat introuvable.";

export async function creerMandat(
  db: Db,
  d: { libelle: string; dateElection: string },
  o: { reprendreCommissions: boolean },
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [mandat] = await tx.insert(mandats).values({ ...d, actif: false }).returning({ id: mandats.id });
    const actif = o.reprendreCommissions
      ? await tx.query.mandats.findFirst({ where: eq(mandats.actif, true), columns: { id: true } })
      : undefined;
    if (actif) {
      // Noms et missions seulement : la composition d'une commission change avec le bureau.
      const modeles = await tx
        .select({ nom: commissions.nom, mission: commissions.mission })
        .from(commissions)
        .where(eq(commissions.mandatId, actif.id))
        .orderBy(asc(commissions.ordre));
      if (modeles.length > 0) {
        await tx.insert(commissions).values(modeles.map((c, ordre) => ({ ...c, ordre, mandatId: mandat.id })));
      }
    }
    return mandat;
  });
}

// Sans ce contrôle, la clé étrangère répondrait par le message des images manquantes.
async function verifierMembres(tx: Tx, ids: string[]) {
  const uniques = [...new Set(ids)];
  if (uniques.length === 0) return;
  const trouves = await tx.select({ id: membres.id }).from(membres).where(inArray(membres.id, uniques)).for("share");
  if (trouves.length !== uniques.length) throw new ErreurMetier("Un membre choisi n'existe plus : rechargez la page.");
}

// Tout l'écran d'un mandat est réécrit d'un coup, sous la version du mandat.
export async function enregistrerMandat(db: Db, id: string, d: DonneesMandat, o: { version: string }): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuel = await tx.query.mandats.findFirst({ where: eq(mandats.id, id), columns: { id: true } });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    const [maj] = await tx
      .update(mandats)
      .set({ libelle: d.libelle, dateElection: d.dateElection })
      .where(and(eq(mandats.id, id), memeVersion(mandats.majLe, o.version)))
      .returning({ majLe: mandats.majLe, actif: mandats.actif });
    if (!maj) throw new ErreurMetier(CONFLIT);
    // Lever l'erreur annule la transaction : rien n'est écrit.
    if (maj.actif && d.postes.length === 0) throw new ErreurMetier("Le mandat en place doit garder au moins un poste.", "postes");
    await verifierMembres(tx, [...d.postes.map((p) => p.membreId), ...d.commissions.flatMap((c) => c.membres)]);

    await tx.delete(postesBureau).where(eq(postesBureau.mandatId, id));
    if (d.postes.length > 0) {
      await tx.insert(postesBureau).values(d.postes.map((p, ordre) => ({ ...p, ordre, mandatId: id })));
    }
    // Les membres des commissions partent en cascade avec elles.
    await tx.delete(commissions).where(eq(commissions.mandatId, id));
    for (const [ordre, c] of d.commissions.entries()) {
      const [ligne] = await tx
        .insert(commissions)
        .values({ mandatId: id, nom: c.nom, mission: c.mission, ordre })
        .returning({ id: commissions.id });
      if (c.membres.length > 0) {
        await tx.insert(commissionMembres).values(c.membres.map((membreId, rang) => ({ commissionId: ligne.id, membreId, ordre: rang })));
      }
    }
    return { version: maj.majLe.toISOString() };
  });
}

export async function activerMandat(db: Db, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Verrou : une suppression ou un enregistrement concurrent attend la fin de l'activation.
    const [mandat] = await tx.select({ actif: mandats.actif }).from(mandats).where(eq(mandats.id, id)).for("update");
    if (!mandat) throw new ErreurMetier(INTROUVABLE);
    if (mandat.actif) return;
    if ((await tx.$count(postesBureau, eq(postesBureau.mandatId, id))) === 0) {
      throw new ErreurMetier("Ajoutez au moins un poste et enregistrez avant d'activer ce mandat.");
    }
    // majLe est recopié : activer ne doit pas invalider la version d'un formulaire ouvert.
    // L'index unique partiel refuse un second mandat actif si deux activations se croisent.
    await tx.update(mandats).set({ actif: false, majLe: sql`${mandats.majLe}` }).where(eq(mandats.actif, true));
    const actives = await tx
      .update(mandats)
      .set({ actif: true, majLe: sql`${mandats.majLe}` })
      .where(eq(mandats.id, id))
      .returning({ id: mandats.id });
    if (actives.length === 0) throw new ErreurMetier(INTROUVABLE);
  });
}

export async function supprimerMandat(db: Db, id: string): Promise<void> {
  // Le filtre sur `actif` protège aussi d'une activation survenue entre-temps.
  const lignes = await db
    .delete(mandats)
    .where(and(eq(mandats.id, id), eq(mandats.actif, false)))
    .returning({ id: mandats.id });
  if (lignes.length > 0) return;
  const existe = await db.query.mandats.findFirst({ where: eq(mandats.id, id), columns: { id: true } });
  throw new ErreurMetier(existe ? "Le mandat en place ne peut pas être supprimé : activez d'abord un autre mandat." : INTROUVABLE);
}
