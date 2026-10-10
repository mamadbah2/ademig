import { beforeEach, describe, expect, it } from "vitest";
import { creerMembre, type DonneesMembre } from "@/db/operations/membres";
import { trouverMembre } from "@/db/requetes/membres";
import { mandats, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { cheminApercu } from "./apercu";
import { lireMembreAdmin, listerMembresAdmin, optionsMembres } from "./membres";

const base: DonneesMembre = {
  nom: "Awa Ndiaye",
  slug: "awa-ndiaye",
  titre: "Géologue",
  specialite: "Géologie",
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
  visible: true,
};

describe("lectures de l'admin des membres", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("liste visibles et masqués par nom, avec la fonction du mandat actif", async () => {
    const { id } = await creerMembre(db, { ...base, nom: "Bineta Fall", slug: "bineta-fall" });
    await creerMembre(db, { ...base, visible: false });
    const [m] = await db.insert(mandats).values({ libelle: "Bureau", dateElection: "2024-09-22", actif: true }).returning({ id: mandats.id });
    await db.insert(postesBureau).values({ mandatId: m.id, membreId: id, fonction: "Secrétaire générale", ordre: 0 });

    const { lignes, total } = await listerMembresAdmin(db, { q: "", page: 1 });
    expect(total).toBe(2);
    expect(lignes.map((l) => [l.nom, l.visible, l.fonction])).toEqual([
      ["Awa Ndiaye", false, null],
      ["Bineta Fall", true, "Secrétaire générale"],
    ]);
    expect((await listerMembresAdmin(db, { q: "bine", page: 1 })).lignes.map((l) => l.slug)).toEqual(["bineta-fall"]);
  });

  it("lit une fiche prête pour le formulaire", async () => {
    const { id } = await creerMembre(db, { ...base, liens: { linkedin: "https://linkedin.com/in/awa" } });
    expect(await lireMembreAdmin(db, id)).toMatchObject({
      promotion: "2015",
      numero: "",
      organisation: "",
      bio: "",
      liens: { linkedin: "https://linkedin.com/in/awa", email: "", site: "" },
      photo: null,
      fonction: null,
    });
    expect((await lireMembreAdmin(db, id))!.version).toMatch(/\.\d{3}Z$/);
    expect(await lireMembreAdmin(db, crypto.randomUUID())).toBeUndefined();
  });

  it("propose tous les membres, masqués compris, par nom", async () => {
    await creerMembre(db, { ...base, nom: "Zackaria Diaw", slug: "zackaria-diaw" });
    await creerMembre(db, { ...base, visible: false });
    expect((await optionsMembres(db)).map((o) => [o.nom, o.visible])).toEqual([
      ["Awa Ndiaye", false],
      ["Zackaria Diaw", true],
    ]);
  });

  it("ne sert une fiche masquée qu'en aperçu et construit son chemin depuis la base", async () => {
    const { id } = await creerMembre(db, { ...base, visible: false });
    expect(await trouverMembre(db, "awa-ndiaye")).toBeUndefined();
    expect((await trouverMembre(db, "awa-ndiaye", { masques: true }))?.nom).toBe("Awa Ndiaye");
    expect(await cheminApercu(db, "membre", id)).toBe("/membres/awa-ndiaye");
    expect(await cheminApercu(db, "membre", crypto.randomUUID())).toBeNull();
  });
});
