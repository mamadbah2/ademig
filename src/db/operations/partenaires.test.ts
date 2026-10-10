import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { lirePartenaireAdmin, listerPartenairesAdmin } from "@/db/requetes/admin/partenaires";
import { partenaires } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { CONFLIT } from "./commun";
import { ErreurMetier } from "./erreurs";
import { creerPartenaire, type DonneesPartenaire, deplacerPartenaire, modifierPartenaire, supprimerPartenaire } from "./partenaires";

const p = (nom: string): DonneesPartenaire => ({ nom, description: "Description.", categorie: "Entreprise", url: null, logoId: null, visible: true });
const noms = async (db: Db) => (await db.select().from(partenaires).orderBy(asc(partenaires.ordre), asc(partenaires.nom))).map((l) => l.nom);

describe("partenaires", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("place un nouveau partenaire en dernier", async () => {
    await creerPartenaire(db, p("A"));
    await creerPartenaire(db, p("B"));
    expect(await noms(db)).toEqual(["A", "B"]);
  });

  it("refuse un nom déjà pris, quelle que soit la casse", async () => {
    await creerPartenaire(db, p("CORICA"));
    const erreur = await creerPartenaire(db, p("corica")).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("nom");
  });

  it("déplace d'un rang, sans effet aux extrémités", async () => {
    const [a, , c] = [await creerPartenaire(db, p("A")), await creerPartenaire(db, p("B")), await creerPartenaire(db, p("C"))];
    await deplacerPartenaire(db, c.id, -1);
    expect(await noms(db)).toEqual(["A", "C", "B"]);
    await deplacerPartenaire(db, a.id, -1);
    await deplacerPartenaire(db, (await lirePartenaireAdmin(db, c.id))!.id, 1);
    expect(await noms(db)).toEqual(["A", "B", "C"]);
    await deplacerPartenaire(db, c.id, 1);
    expect(await noms(db)).toEqual(["A", "B", "C"]);
  });

  it("répare des ordres en double ou troués sans changer l'ordre relatif", async () => {
    await db.insert(partenaires).values([
      { nom: "A", description: "x", categorie: "Entreprise", ordre: 0 },
      { nom: "B", description: "x", categorie: "Entreprise", ordre: 5 },
      { nom: "C", description: "x", categorie: "Entreprise", ordre: 5 },
    ]);
    const c = (await db.select().from(partenaires).where(eq(partenaires.nom, "C")))[0];
    await deplacerPartenaire(db, c.id, -1);
    expect(await noms(db)).toEqual(["A", "C", "B"]);
    expect((await db.select().from(partenaires).orderBy(asc(partenaires.ordre))).map((l) => l.ordre)).toEqual([0, 1, 2]);
  });

  it("déplace encore correctement après une suppression", async () => {
    const [, b, c] = [await creerPartenaire(db, p("A")), await creerPartenaire(db, p("B")), await creerPartenaire(db, p("C"))];
    await supprimerPartenaire(db, b.id);
    await deplacerPartenaire(db, c.id, -1);
    expect(await noms(db)).toEqual(["C", "A"]);
  });

  it("modifie avec contrôle de version", async () => {
    const { id } = await creerPartenaire(db, p("A"));
    const v = (await lirePartenaireAdmin(db, id))!.version;
    await modifierPartenaire(db, id, { ...p("A"), visible: false }, { version: v });
    const erreur = await modifierPartenaire(db, id, p("A"), { version: v }).catch((e) => e);
    expect(erreur.message).toBe(CONFLIT);
    expect((await lirePartenaireAdmin(db, id))!.visible).toBe(false);
  });

  it("liste tous les partenaires pour l'admin, visibles ou non", async () => {
    await creerPartenaire(db, p("A"));
    await creerPartenaire(db, { ...p("B"), visible: false });
    expect((await listerPartenairesAdmin(db)).map((l) => [l.nom, l.visible])).toEqual([["A", true], ["B", false]]);
  });

  it("signale un partenaire introuvable", async () => {
    await expect(supprimerPartenaire(db, crypto.randomUUID())).rejects.toThrow("Partenaire introuvable.");
    await expect(deplacerPartenaire(db, crypto.randomUUID(), 1)).rejects.toThrow("Partenaire introuvable.");
  });

  it("renuméroter un voisin ne change pas la version d'un partenaire", async () => {
    const a = await creerPartenaire(db, p("A"));
    const b = await creerPartenaire(db, p("B"));
    const ancienne = (await lirePartenaireAdmin(db, a.id))!.version;
    await new Promise((r) => setTimeout(r, 10));
    await deplacerPartenaire(db, b.id, -1);
    expect(await noms(db)).toEqual(["B", "A"]);
    expect((await lirePartenaireAdmin(db, a.id))!.version).toBe(ancienne);
    await expect(modifierPartenaire(db, a.id, { ...p("A"), visible: false }, { version: ancienne })).resolves.toBeDefined();
  });

  it("autorise de renommer un partenaire avec une autre casse", async () => {
    const { id } = await creerPartenaire(db, p("Petrosen"));
    const v = (await lirePartenaireAdmin(db, id))!.version;
    await modifierPartenaire(db, id, p("PETROSEN"), { version: v });
    expect(await noms(db)).toEqual(["PETROSEN"]);
  });

  it("signale la modification d'un partenaire introuvable", async () => {
    await expect(modifierPartenaire(db, crypto.randomUUID(), p("A"), { version: new Date().toISOString() })).rejects.toThrow("Partenaire introuvable.");
  });
});
