import { beforeEach, describe, expect, it } from "vitest";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import { lireReglagesAdmin } from "@/db/requetes/admin/reglages";
import { lireReglages } from "@/db/requetes/reglages";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { CONFLIT } from "./commun";
import { modifierReglages } from "./reglages";

const PERIMEE = "2020-01-01T00:00:00.000Z";

describe("réglages", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("sans ligne en base, lit les valeurs d'origine puis crée la ligne au premier enregistrement", async () => {
    expect(await lireReglagesAdmin(db)).toEqual({ ...reglagesInitiaux, version: null });
    const { version } = await modifierReglages(db, { textes: { "amicale.intro": "Intro" } }, { version: null });
    expect(await lireReglagesAdmin(db)).toEqual({ ...reglagesInitiaux, textes: { "amicale.intro": "Intro" }, version });
  });

  it("refuse une seconde création : quelqu'un a enregistré entre-temps", async () => {
    await modifierReglages(db, { reseaux: [] }, { version: null });
    await expect(modifierReglages(db, { reseaux: [] }, { version: null })).rejects.toThrow(CONFLIT);
  });

  it("n'écrit que la partie envoyée, et le site public la lit", async () => {
    const { version } = await modifierReglages(db, { textes: {} }, { version: null });
    const nouveau = await modifierReglages(db, { textes: { "accueil.accroche": "Titre" } }, { version });
    expect(nouveau.version).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await lireReglages(db)).toEqual({ ...reglagesInitiaux, textes: { "accueil.accroche": "Titre" } });
    const lu = await lireReglagesAdmin(db);
    expect(lu.version).toBe(nouveau.version);
  });

  it("garde la FAQ à null (FAQ d'origine) jusqu'au premier enregistrement, puis la lit telle quelle", async () => {
    const { version } = await modifierReglages(db, { textes: {} }, { version: null });
    expect((await lireReglages(db)).faq).toBeNull();
    const faq = [{ question: "Comment adhérer ?", reponse: "Écrivez au bureau." }];
    const r = await modifierReglages(db, { faq }, { version });
    expect((await lireReglages(db)).faq).toEqual(faq);
    await modifierReglages(db, { faq: [] }, { version: r.version });
    expect((await lireReglages(db)).faq).toEqual([]);
  });

  it("refuse une version périmée sans rien écrire", async () => {
    await modifierReglages(db, { textes: {} }, { version: null });
    const contact = { ...reglagesInitiaux.contact, email: "autre@ademig.sn" };
    await expect(modifierReglages(db, { contact }, { version: PERIMEE })).rejects.toThrow(CONFLIT);
    expect((await lireReglages(db)).contact).toEqual(reglagesInitiaux.contact);
  });
});
