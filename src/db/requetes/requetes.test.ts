import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { actualites as actualitesInitiales } from "@/db/donnees-initiales/actualites";
import { evenements as evenementsInitiaux } from "@/db/donnees-initiales/evenements";
import { membres as membresInitiaux } from "@/db/donnees-initiales/membres";
import { commissions as commissionsInitiales, ordreBureau, partenaires as partenairesInitiaux } from "@/db/donnees-initiales/organisation";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import * as t from "@/db/schema";
import { seed } from "@/db/seed";
import type { Db } from "@/db/types";
import { paragraphesEnHtml } from "@/lib/html";
import { creerDbTest } from "@/test/db";
import { listerActualites, trouverActualite } from "./actualites";
import { listerEvenements, trouverEvenement } from "./evenements";
import { listerMembres, trouverMembre } from "./membres";
import { lireBureau, listerPartenaires } from "./organisation";
import { lireReglages } from "./reglages";

const iso = (date: string) => new Date(date).toISOString();

describe("requêtes du site public après le seed", () => {
  let db: Db;
  beforeAll(async () => {
    db = await creerDbTest();
    await seed(db);
  });

  it("rend les actualités à l'identique, de la plus récente à la plus ancienne", async () => {
    const attendu = actualitesInitiales
      .map((a) => ({ ...a, corps: paragraphesEnHtml(a.corps) }))
      .sort((a, b) => b.date.localeCompare(a.date));
    expect(await listerActualites(db)).toEqual(attendu);
    expect(await trouverActualite(db, attendu[0].slug)).toEqual(attendu[0]);
    expect(await trouverActualite(db, "inexistante")).toBeUndefined();
  });

  it("rend les événements à l'identique, dates normalisées en ISO", async () => {
    const attendu = evenementsInitiaux
      .map((e) => ({ ...e, corps: paragraphesEnHtml(e.corps), debut: iso(e.debut), fin: e.fin && iso(e.fin) }))
      .sort((a, b) => b.debut.localeCompare(a.debut));
    expect(await listerEvenements(db)).toEqual(attendu);
    expect(await trouverEvenement(db, attendu[0].slug)).toEqual(attendu[0]);
  });

  it("rend les membres à l'identique, dans l'ordre protocolaire", async () => {
    const attendu = membresInitiaux.map((m) => ({ ...m, bio: m.bio && paragraphesEnHtml(m.bio) }));
    expect(await listerMembres(db)).toEqual(attendu);
    expect(await trouverMembre(db, "ibrahima-diao")).toEqual(attendu[0]);
  });

  it("compose le bureau exécutif et les commissions du mandat actif", async () => {
    const bureau = await lireBureau(db);
    expect(bureau.executif.map((m) => m.slug)).toEqual(ordreBureau);
    expect(bureau.commissions.map((c) => ({ nom: c.nom, mission: c.mission, membres: c.membres.map((m) => m.slug) }))).toEqual(
      commissionsInitiales,
    );
  });

  it("rend les partenaires à l'identique", async () => {
    expect(await listerPartenaires(db)).toEqual(partenairesInitiaux);
  });

  it("rend les réglages initiaux", async () => {
    expect(await lireReglages(db)).toEqual(reglagesInitiaux);
  });
});

describe("filtres de publication", () => {
  it("cache les brouillons", async () => {
    const db = await creerDbTest();
    await seed(db);
    const slug = actualitesInitiales[0].slug;
    await db.update(t.actualites).set({ statut: "brouillon" }).where(eq(t.actualites.slug, slug));
    expect((await listerActualites(db)).map((a) => a.slug)).not.toContain(slug);
    expect(await trouverActualite(db, slug)).toBeUndefined();
  });

  it("cache les membres et partenaires non visibles", async () => {
    const db = await creerDbTest();
    await seed(db);
    await db.update(t.membres).set({ visible: false }).where(eq(t.membres.slug, "oumar-niang"));
    await db.update(t.partenaires).set({ visible: false }).where(eq(t.partenaires.nom, "MODEC"));
    expect((await listerMembres(db)).map((m) => m.slug)).not.toContain("oumar-niang");
    expect(await trouverMembre(db, "oumar-niang")).toBeUndefined();
    expect((await lireBureau(db)).commissions.flatMap((c) => c.membres.map((m) => m.slug))).not.toContain("oumar-niang");
    expect((await listerPartenaires(db)).map((p) => p.nom)).not.toContain("MODEC");
  });
});

describe("base vide", () => {
  it("retombe sur les réglages initiaux et des listes vides", async () => {
    const db = await creerDbTest();
    expect(await lireReglages(db)).toEqual(reglagesInitiaux);
    expect(await listerActualites(db)).toEqual([]);
    expect(await lireBureau(db)).toEqual({ executif: [], commissions: [] });
  });
});
