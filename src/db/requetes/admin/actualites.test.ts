import { beforeEach, describe, expect, it } from "vitest";
import { creerActualite, type DonneesActualite } from "@/db/operations/actualites";
import { creerMedia } from "@/db/operations/media";
import { trouverActualite } from "@/db/requetes/actualites";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { lireActualiteAdmin, listerActualitesAdmin } from "./actualites";
import { cheminApercu } from "./apercu";
import { PAR_PAGE } from "./commun";

const base: DonneesActualite = {
  titre: "Forum",
  slug: "forum",
  date: "2025-11-20",
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  sources: [],
  videos: [],
  photos: [],
};

describe("lectures de l'admin", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("liste brouillons et publiées, de la plus récente à la plus ancienne", async () => {
    await creerActualite(db, { ...base, slug: "ancienne", titre: "Ancienne", date: "2024-01-01" }, "publier");
    await creerActualite(db, { ...base, slug: "recente", titre: "Récente", date: "2026-01-01" }, "enregistrer");
    const { lignes, total } = await listerActualitesAdmin(db, { q: "", page: 1 });
    expect(total).toBe(2);
    expect(lignes.map((l) => [l.slug, l.statut])).toEqual([["recente", "brouillon"], ["ancienne", "publie"]]);
  });

  it("filtre par statut et par recherche littérale", async () => {
    await creerActualite(db, { ...base, slug: "a", titre: "Forum 100% emploi" }, "publier");
    await creerActualite(db, { ...base, slug: "b", titre: "Journée" }, "enregistrer");
    expect((await listerActualitesAdmin(db, { q: "", statut: "brouillon", page: 1 })).lignes.map((l) => l.slug)).toEqual(["b"]);
    expect((await listerActualitesAdmin(db, { q: "100%", page: 1 })).lignes.map((l) => l.slug)).toEqual(["a"]);
    expect((await listerActualitesAdmin(db, { q: "%", page: 1 })).total).toBe(1);
  });

  it("pagine par 25", async () => {
    for (let i = 0; i < PAR_PAGE + 2; i++) {
      await creerActualite(db, { ...base, slug: `a-${i}`, date: `2025-01-${String((i % 28) + 1).padStart(2, "0")}` }, "enregistrer");
    }
    const page2 = await listerActualitesAdmin(db, { q: "", page: 2 });
    expect(page2.total).toBe(PAR_PAGE + 2);
    expect(page2.lignes).toHaveLength(2);
  });

  it("lit une fiche avec ses photos dans l'ordre et une version à la milliseconde", async () => {
    const m1 = await creerMedia(db, { url: "/a.webp", pathname: null, alt: "A", credit: null, width: 4, height: 3, mime: "image/webp", taille: null }, null);
    const m2 = await creerMedia(db, { url: "/b.webp", pathname: null, alt: "B", credit: null, width: 4, height: 3, mime: "image/webp", taille: null }, null);
    const { id } = await creerActualite(db, { ...base, photos: [m2.id, m1.id] }, "publier");
    const fiche = await lireActualiteAdmin(db, id);
    expect(fiche).toMatchObject({ id, slug: "forum", statut: "publie", dejaPubliee: true });
    expect(fiche!.photos.map((p) => p.alt)).toEqual(["B", "A"]);
    expect(fiche!.version).toMatch(/\.\d{3}Z$/);
    expect(await lireActualiteAdmin(db, crypto.randomUUID())).toBeUndefined();
  });

  it("ne sert un brouillon au site public que sur demande", async () => {
    await creerActualite(db, base, "enregistrer");
    expect(await trouverActualite(db, "forum")).toBeUndefined();
    expect((await trouverActualite(db, "forum", { brouillons: true }))?.titre).toBe("Forum");
  });

  it("construit le chemin d'aperçu depuis la base", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    expect(await cheminApercu(db, "actualite", id)).toBe("/actualites/forum");
    expect(await cheminApercu(db, "actualite", crypto.randomUUID())).toBeNull();
  });
});
