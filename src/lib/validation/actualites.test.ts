import { describe, expect, it } from "vitest";
import { actualites as actualitesInitiales } from "@/db/donnees-initiales/actualites";
import { paragraphesEnHtml } from "@/lib/html";
import { schemaActualite, schemaEnvoiActualite } from "./actualites";

const valide = {
  titre: " Forum ",
  slug: "forum",
  date: "2025-11-20",
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  sources: '[{"label":"APS","url":"https://aps.sn/"}]',
  videos: '[{"id":"https://youtu.be/dQw4w9WgXcQ","titre":"Reportage"}]',
  photos: "[]",
};

describe("schemaActualite", () => {
  it("lit un formulaire complet", () => {
    expect(schemaActualite.parse(valide)).toEqual({
      titre: "Forum",
      slug: "forum",
      date: "2025-11-20",
      resume: "Résumé.",
      corps: "<p>Texte.</p>",
      sources: [{ label: "APS", url: "https://aps.sn/" }],
      videos: [{ id: "dQw4w9WgXcQ", titre: "Reportage" }],
      photos: [],
    });
  });

  it("accepte les actualités actuelles du site", () => {
    for (const a of actualitesInitiales) {
      const r = schemaActualite.safeParse({
        ...a,
        corps: paragraphesEnHtml(a.corps),
        sources: JSON.stringify(a.sources ?? []),
        videos: JSON.stringify(a.videos ?? []),
        photos: "[]",
      });
      expect(r.success, `${a.slug} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("nettoie le corps", () => {
    const r = schemaActualite.parse({ ...valide, corps: '<p>Texte<img src=x onerror="alert(1)"></p>' });
    expect(r.corps).toBe("<p>Texte</p>");
  });

  it.each([
    ["titre", { titre: "  " }],
    ["date", { date: "20/11/2025" }],
    ["resume", { resume: "" }],
    ["corps", { corps: "<p></p>" }],
    ["sources", { sources: '[{"label":"APS","url":"javascript:alert(1)"}]' }],
    ["videos", { videos: '[{"id":"pas-une-video","titre":"x"}]' }],
    ["photos", { photos: '["pas-un-uuid"]' }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaActualite.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });

  it("refuse une photo choisie deux fois", () => {
    const id = crypto.randomUUID();
    expect(schemaActualite.safeParse({ ...valide, photos: JSON.stringify([id, id]) }).success).toBe(false);
  });
});

describe("schemaEnvoiActualite", () => {
  it("ajoute intention, déverrouillage et version", () => {
    const r = schemaEnvoiActualite.parse({ ...valide, intention: "publier", modifierSlug: "on", version: "2026-10-10T10:00:00.000Z" });
    expect(r).toMatchObject({ intention: "publier", modifierSlug: true, version: "2026-10-10T10:00:00.000Z" });
  });

  it("refuse une version qui n'est pas une date", () => {
    expect(schemaEnvoiActualite.safeParse({ ...valide, version: "pas-une-date" }).success).toBe(false);
  });
});
