import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { creerMembre, type DonneesMembre } from "@/db/operations/membres";
import { membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { listerAnnuaire, PAR_PAGE_ANNUAIRE, type FiltreAnnuaire } from "./annuaire";

const base: DonneesMembre = {
  nom: "X",
  slug: "x",
  titre: "Ingénieur",
  specialite: "Mines",
  promotion: 2015,
  numero: null,
  organisation: null,
  ville: null,
  resume: "Résumé.",
  bio: null,
  parcours: [],
  competences: [],
  realisations: [],
  liens: null,
  photoId: null,
  visible: false,
};
const tous: FiltreAnnuaire = { q: "", promotion: null, specialite: null, page: 1 };

describe("listerAnnuaire", () => {
  let db: Db;

  async function fiche(slug: string, nom: string, o: Partial<DonneesMembre> = {}, rattache?: { userId: string; annuaire: boolean }) {
    const { id } = await creerMembre(db, { ...base, ...o, slug, nom });
    await db
      .update(membres)
      .set({
        annuaire: rattache?.annuaire ?? false,
        userId: rattache?.userId ?? null,
        telephone: "+221770000000",
        emailContact: "prive@ademig.test",
      })
      .where(eq(membres.id, id));
  }

  beforeAll(async () => {
    db = await creerDbTest();
    await db.insert(user).values([
      { id: "ua", name: "A", email: "a@ademig.test", role: "membre", actif: true },
      { id: "ub", name: "B", email: "b@ademig.test", role: "membre", actif: true },
      { id: "uc", name: "C", email: "c@ademig.test", role: "membre", actif: false },
      { id: "ud", name: "D", email: "d@ademig.test", role: "membre", actif: true },
    ]);
    await fiche("awa", "Awa Ndiaye", { promotion: 2015, specialite: "Mines", organisation: "Sabodala Gold", ville: "Dakar", liens: { linkedin: "https://www.linkedin.com/in/awa" } }, { userId: "ua", annuaire: true });
    await fiche("bureau", "Moussa Diao", { promotion: 2012, specialite: "Géologie", visible: true });
    await fiche("bao", "Bao Fall", { promotion: 2012, specialite: "Mines" }, { userId: "ub", annuaire: true });
    await fiche("cheikh", "Cheikh Sow", {}, { userId: "uc", annuaire: true });
    await fiche("dame", "Dame Ba", {}, { userId: "ud", annuaire: false });
    await fiche("sans-compte", "Eva Sans Compte", {}, undefined);
  });

  it("liste les comptes actifs en annuaire et les fiches publiques, par ordre alphabétique", async () => {
    const r = await listerAnnuaire(db, tous);
    expect(r.fiches.map((f) => f.nom)).toEqual(["Awa Ndiaye", "Bao Fall", "Moussa Diao"]);
    expect(r.total).toBe(3);
  });

  it("exclut la fiche masquée, le compte non activé et la fiche sans compte non publique", async () => {
    const noms = (await listerAnnuaire(db, tous)).fiches.map((f) => f.nom);
    expect(noms).not.toContain("Dame Ba");
    expect(noms).not.toContain("Cheikh Sow");
    expect(noms).not.toContain("Eva Sans Compte");
  });

  it("n'expose que les clés prévues, jamais téléphone ni email de contact", async () => {
    const [f] = (await listerAnnuaire(db, { ...tous, q: "awa" })).fiches;
    expect(Object.keys(f).sort()).toEqual(
      ["linkedin", "nom", "organisation", "photo", "promotion", "resume", "slug", "specialite", "ville"].sort(),
    );
    expect(f.linkedin).toBe("https://www.linkedin.com/in/awa");
    expect(JSON.stringify(f)).not.toContain("prive@ademig.test");
    expect(JSON.stringify(f)).not.toContain("770000000");
  });

  it("cherche dans le nom et l'organisation sans tenir compte de la casse", async () => {
    expect((await listerAnnuaire(db, { ...tous, q: "NDIAYE" })).fiches.map((f) => f.slug)).toEqual(["awa"]);
    expect((await listerAnnuaire(db, { ...tous, q: "sabodala" })).fiches.map((f) => f.slug)).toEqual(["awa"]);
    expect((await listerAnnuaire(db, { ...tous, q: "%" })).total).toBe(0);
  });

  it("filtre par promotion et par spécialité", async () => {
    expect((await listerAnnuaire(db, { ...tous, promotion: 2012 })).fiches.map((f) => f.slug)).toEqual(["bao", "bureau"]);
    expect((await listerAnnuaire(db, { ...tous, specialite: "Mines" })).fiches.map((f) => f.slug)).toEqual(["awa", "bao"]);
    expect((await listerAnnuaire(db, { ...tous, promotion: 2012, specialite: "Mines" })).fiches.map((f) => f.slug)).toEqual(["bao"]);
  });

  it("propose les promotions (récentes d'abord) et spécialités de l'annuaire, sans les fiches exclues", async () => {
    const r = await listerAnnuaire(db, { ...tous, q: "awa" });
    expect(r.promotions).toEqual([2015, 2012]);
    expect(r.specialites).toEqual(["Géologie", "Mines"]);
  });

  it("pagine par 24", async () => {
    for (let i = 0; i < 25; i++) {
      await fiche(`pg-${i}`, `Page ${String(i).padStart(2, "0")}`, { promotion: 1999, visible: true });
    }
    expect(PAR_PAGE_ANNUAIRE).toBe(24);
    const p1 = await listerAnnuaire(db, { ...tous, promotion: 1999 });
    expect(p1.fiches).toHaveLength(24);
    expect(p1.total).toBe(25);
    const p2 = await listerAnnuaire(db, { ...tous, promotion: 1999, page: 2 });
    expect(p2.fiches.map((f) => f.nom)).toEqual(["Page 24"]);
  });
});
