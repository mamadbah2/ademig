import { beforeEach, describe, expect, it } from "vitest";
import { creerEvenement, type DonneesEvenement } from "@/db/operations/evenements";
import { creerMedia } from "@/db/operations/media";
import { trouverEvenement } from "@/db/requetes/evenements";
import { partenaires } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { cheminApercu } from "./apercu";
import { lireEvenementAdmin, listerEvenementsAdmin, suggestionsPartenaires } from "./evenements";

const base: DonneesEvenement = {
  titre: "Forum",
  slug: "forum",
  debut: new Date("2025-11-05T09:00:00.000Z"),
  fin: new Date("2025-11-06T18:00:00.000Z"),
  lieuNom: "CICAD",
  lieuVille: "Diamniadio",
  theme: null,
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  partenaires: [],
  videos: [],
  afficheId: null,
  photos: [],
};

describe("lectures de l'admin des événements", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("liste brouillons et publiés, du plus récent au plus ancien, avec filtres", async () => {
    await creerEvenement(db, { ...base, slug: "ancien", titre: "Ancien", debut: new Date("2024-01-01T09:00:00Z"), fin: null }, "publier");
    await creerEvenement(db, { ...base, slug: "recent", titre: "Récent", debut: new Date("2026-01-01T09:00:00Z"), fin: null }, "enregistrer");
    const { lignes, total } = await listerEvenementsAdmin(db, { q: "", page: 1 });
    expect(total).toBe(2);
    expect(lignes.map((l) => [l.slug, l.statut])).toEqual([["recent", "brouillon"], ["ancien", "publie"]]);
    expect((await listerEvenementsAdmin(db, { q: "anc", page: 1 })).lignes.map((l) => l.slug)).toEqual(["ancien"]);
    expect((await listerEvenementsAdmin(db, { q: "", statut: "brouillon", page: 1 })).lignes.map((l) => l.slug)).toEqual(["recent"]);
  });

  it("lit une fiche prête pour le formulaire", async () => {
    const affiche = await creerMedia(db, { url: "/a.webp", pathname: null, alt: "Affiche", credit: null, width: 4, height: 3, mime: "image/webp", taille: null }, null);
    const { id } = await creerEvenement(db, { ...base, afficheId: affiche.id, partenaires: ["CORICA"] }, "publier");
    const fiche = await lireEvenementAdmin(db, id);
    expect(fiche).toMatchObject({
      debut: "2025-11-05T09:00",
      fin: "2025-11-06T18:00",
      theme: "",
      partenaires: ["CORICA"],
      statut: "publie",
      dejaPublie: true,
    });
    expect(fiche!.affiche?.alt).toBe("Affiche");
    expect(fiche!.version).toMatch(/\.\d{3}Z$/);
    expect(await lireEvenementAdmin(db, crypto.randomUUID())).toBeUndefined();
  });

  it("propose les noms des partenaires dans leur ordre", async () => {
    await db.insert(partenaires).values([
      { nom: "MODEC", description: "x", categorie: "Entreprise", ordre: 1 },
      { nom: "CORICA", description: "x", categorie: "Institution", ordre: 0 },
    ]);
    expect(await suggestionsPartenaires(db)).toEqual(["CORICA", "MODEC"]);
  });

  it("ne sert un brouillon qu'en aperçu et construit son chemin depuis la base", async () => {
    const { id } = await creerEvenement(db, base, "enregistrer");
    expect(await trouverEvenement(db, "forum")).toBeUndefined();
    expect((await trouverEvenement(db, "forum", { brouillons: true }))?.titre).toBe("Forum");
    expect(await cheminApercu(db, "evenement", id)).toBe("/evenements/forum");
    expect(await cheminApercu(db, "evenement", crypto.randomUUID())).toBeNull();
  });
});
