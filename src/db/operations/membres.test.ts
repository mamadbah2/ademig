import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import { commissionMembres, commissions, mandats, membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import { schemaMembre } from "@/lib/validation/membres";
import { creerDbTest } from "@/test/db";
import { CONFLIT } from "./commun";
import { ErreurMetier } from "./erreurs";
import { creerMembre, type DonneesMembre, modifierMembre, supprimerMembre } from "./membres";

const base: DonneesMembre = {
  nom: "Awa Ndiaye",
  slug: "awa-ndiaye",
  titre: "Géologue",
  specialite: "Géologie",
  promotion: 2015,
  numero: null,
  organisation: null,
  ville: "Dakar",
  resume: "Résumé.",
  bio: null,
  parcours: [{ periode: "2015", poste: "Ingénieure diplômée", organisation: "ENSMG", description: undefined }],
  competences: ["SIG"],
  realisations: [],
  liens: { email: "awa@example.org" },
  photoId: null,
  visible: false,
};

const lire = async (db: Db, id: string) => (await db.query.membres.findFirst({ where: eq(membres.id, id) }))!;
const version = async (db: Db, id: string) => (await lire(db, id)).majLe.toISOString();

async function mandatInactif(db: Db) {
  const [m] = await db.insert(mandats).values({ libelle: "Bureau 2020", dateElection: "2020-09-20" }).returning({ id: mandats.id });
  return m.id;
}

describe("membres", () => {
  it("DonneesMembre est exactement la sortie du schéma de validation", () => {
    // Assignables dans les deux sens (le schéma range ses sorties dans une intersection de types).
    expectTypeOf<z.output<typeof schemaMembre>>().toExtend<DonneesMembre>();
    expectTypeOf<DonneesMembre>().toExtend<z.output<typeof schemaMembre>>();
  });

  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("crée une fiche avec ses listes et ses liens", async () => {
    const { id } = await creerMembre(db, base);
    expect(await lire(db, id)).toMatchObject({ nom: "Awa Ndiaye", visible: false, competences: ["SIG"], liens: { email: "awa@example.org" } });
  });

  it("refuse un lien déjà pris, sur le champ slug", async () => {
    await creerMembre(db, base);
    const erreur = await creerMembre(db, { ...base, nom: "Autre" }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("slug");
  });

  it("refuse une version périmée sans rien écrire", async () => {
    const { id } = await creerMembre(db, base);
    const v = await version(db, id);
    await modifierMembre(db, id, { ...base, titre: "Premier" }, { version: v, modifierSlug: false });
    const erreur = await modifierMembre(db, id, { ...base, titre: "Second" }, { version: v, modifierSlug: false }).catch((e) => e);
    expect(erreur.message).toBe(CONFLIT);
    expect((await lire(db, id)).titre).toBe("Premier");
  });

  it("laisse changer le lien d'une fiche masquée, l'exige déverrouillé si elle est visible", async () => {
    const { id } = await creerMembre(db, base);
    await modifierMembre(db, id, { ...base, slug: "awa-ndiaye-2" }, { version: await version(db, id), modifierSlug: false });
    await modifierMembre(db, id, { ...base, slug: "awa-ndiaye-2", visible: true }, { version: await version(db, id), modifierSlug: false });
    const erreur = await modifierMembre(db, id, { ...base, slug: "awa", visible: true }, { version: await version(db, id), modifierSlug: false }).catch((e) => e);
    expect(erreur.champ).toBe("slug");
    await modifierMembre(db, id, { ...base, slug: "awa", visible: true }, { version: await version(db, id), modifierSlug: true });
    expect((await lire(db, id)).slug).toBe("awa");
  });

  it("refuse de supprimer un membre qui occupe un poste, même dans un ancien mandat", async () => {
    const { id } = await creerMembre(db, base);
    await db.insert(postesBureau).values({ mandatId: await mandatInactif(db), membreId: id, fonction: "Trésorière", ordre: 0 });
    await expect(supprimerMembre(db, id)).rejects.toThrow(/fait partie d'un bureau/);
    expect(await lire(db, id)).toBeDefined();
  });

  it("refuse de supprimer un membre présent dans une seule commission", async () => {
    const { id } = await creerMembre(db, base);
    const [c] = await db.insert(commissions).values({ mandatId: await mandatInactif(db), nom: "Finances", mission: "Budget.", ordre: 0 }).returning({ id: commissions.id });
    await db.insert(commissionMembres).values({ commissionId: c.id, membreId: id, ordre: 0 });
    await expect(supprimerMembre(db, id)).rejects.toThrow(/fait partie d'un bureau/);
  });

  it("supprime une fiche libre et signale un membre introuvable", async () => {
    const { id } = await creerMembre(db, base);
    await supprimerMembre(db, id);
    expect(await db.query.membres.findFirst({ where: eq(membres.id, id) })).toBeUndefined();
    await expect(supprimerMembre(db, id)).rejects.toThrow("Membre introuvable.");
  });
});
