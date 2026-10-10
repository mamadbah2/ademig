import { describe, expect, it } from "vitest";
import { evenements as evenementsInitiaux } from "@/db/donnees-initiales/evenements";
import { versDateLocale } from "@/lib/admin/dates";
import { paragraphesEnHtml } from "@/lib/html";
import { schemaEnvoiEvenement, schemaEvenement } from "./evenements";

const valide = {
  titre: "Journée du contenu local",
  slug: "journee-contenu-local",
  debut: "2026-09-12T09:00",
  fin: "",
  lieuNom: "Hôtel Pullman Teranga",
  lieuVille: "Dakar",
  theme: "",
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  partenaires: '[{"nom":"CORICA"},{"nom":" MODEC "}]',
  videos: "[]",
  afficheId: "",
  photos: "[]",
};

describe("schemaEvenement", () => {
  it("lit un formulaire complet", () => {
    expect(schemaEvenement.parse(valide)).toEqual({
      titre: "Journée du contenu local",
      slug: "journee-contenu-local",
      debut: new Date("2026-09-12T09:00:00.000Z"),
      fin: null,
      lieuNom: "Hôtel Pullman Teranga",
      lieuVille: "Dakar",
      theme: null,
      resume: "Résumé.",
      corps: "<p>Texte.</p>",
      partenaires: ["CORICA", "MODEC"],
      videos: [],
      afficheId: null,
      photos: [],
    });
  });

  it("accepte les événements actuels du site", () => {
    for (const e of evenementsInitiaux) {
      const r = schemaEvenement.safeParse({
        titre: e.titre,
        slug: e.slug,
        debut: versDateLocale(new Date(e.debut)),
        fin: e.fin ? versDateLocale(new Date(e.fin)) : "",
        lieuNom: e.lieu.nom,
        lieuVille: e.lieu.ville,
        theme: e.theme ?? "",
        resume: e.resume,
        corps: paragraphesEnHtml(e.corps),
        partenaires: JSON.stringify((e.partenaires ?? []).map((nom) => ({ nom }))),
        videos: JSON.stringify(e.videos ?? []),
        afficheId: "",
        photos: "[]",
      });
      expect(r.success, `${e.slug} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("refuse une fin avant le début, sur le champ fin", () => {
    const r = schemaEvenement.safeParse({ ...valide, fin: "2026-09-12T08:00" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["fin"], message: "La fin doit être après le début." });
  });

  it("signale une date de fin invalide en français", () => {
    const r = schemaEvenement.safeParse({ ...valide, fin: "demain" });
    expect(r.error?.issues.find((i) => i.path[0] === "fin")).toMatchObject({ path: ["fin"], message: "Date de fin invalide." });
  });

  it("refuse une fin égale au début", () => {
    const r = schemaEvenement.safeParse({ ...valide, fin: valide.debut });
    expect(r.error?.issues[0]).toMatchObject({ path: ["fin"], message: "La fin doit être après le début." });
  });

  it.each([
    ["debut", { debut: "" }],
    ["fin", { fin: "demain" }],
    ["lieuNom", { lieuNom: " " }],
    ["lieuVille", { lieuVille: "" }],
    ["corps", { corps: "<p></p>" }],
    ["partenaires", { partenaires: '[{"nom":""}]' }],
    ["afficheId", { afficheId: "pas-un-uuid" }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaEvenement.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });

  it("refuse un partenaire cité deux fois", () => {
    expect(schemaEvenement.safeParse({ ...valide, partenaires: '[{"nom":"CORICA"},{"nom":"corica"}]' }).success).toBe(false);
  });
});

describe("schemaEnvoiEvenement", () => {
  it("ajoute intention, déverrouillage et version, et garde la règle de fin", () => {
    expect(schemaEnvoiEvenement.parse({ ...valide, intention: "publier", version: "2026-10-10T10:00:00.000Z" })).toMatchObject({
      intention: "publier",
      modifierSlug: false,
      version: "2026-10-10T10:00:00.000Z",
    });
    expect(schemaEnvoiEvenement.safeParse({ ...valide, fin: "2026-09-11T09:00" }).success).toBe(false);
  });
});
