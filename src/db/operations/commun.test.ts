import { describe, expect, it } from "vitest";
import { ErreurMetier } from "./erreurs";
import { exigerSlugModifiable, publication } from "./commun";

const hier = new Date("2026-01-01T00:00:00.000Z");

describe("publication", () => {
  it("crée en brouillon ou publie d'un coup", () => {
    expect(publication("enregistrer", null)).toEqual({ statut: "brouillon", publieLe: null });
    const r = publication("publier", null);
    expect(r.statut).toBe("publie");
    expect(r.publieLe).toBeInstanceOf(Date);
  });
  it("garde la première date de publication", () => {
    expect(publication("depublier", { statut: "publie", publieLe: hier })).toEqual({ statut: "brouillon", publieLe: hier });
    expect(publication("publier", { statut: "brouillon", publieLe: hier })).toEqual({ statut: "publie", publieLe: hier });
    expect(publication("enregistrer", { statut: "publie", publieLe: hier })).toEqual({ statut: "publie", publieLe: hier });
  });
});

describe("exigerSlugModifiable", () => {
  it("laisse changer le lien d'un contenu jamais publié", () => {
    expect(exigerSlugModifiable({ slug: "a", publieLe: null }, "b", false, "x")).toBe(true);
    expect(exigerSlugModifiable({ slug: "a", publieLe: null }, "a", false, "x")).toBe(false);
  });
  it("exige le déverrouillage après une publication", () => {
    expect(() => exigerSlugModifiable({ slug: "a", publieLe: hier }, "b", false, "Verrouillé.")).toThrow(ErreurMetier);
    expect(exigerSlugModifiable({ slug: "a", publieLe: hier }, "b", true, "x")).toBe(true);
  });
});
