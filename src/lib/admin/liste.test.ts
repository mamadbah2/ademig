import { describe, expect, it } from "vitest";
import { cibleFocusApres, deplacer, retirer } from "./liste";

describe("listes ordonnées", () => {
  it("monte et descend un élément", () => {
    expect(deplacer(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(deplacer(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });
  it("ne sort pas des bornes", () => {
    expect(deplacer(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(deplacer(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
  it("retire sans modifier l'original", () => {
    const l = ["a", "b"];
    expect(retirer(l, 0)).toEqual(["b"]);
    expect(l).toEqual(["a", "b"]);
  });
});

describe("cibleFocusApres", () => {
  it("suit l'élément monté, sur ↓ s'il arrive en tête", () => {
    expect(cibleFocusApres("monter", 2, 3)).toEqual({ index: 1, bouton: "haut" });
    expect(cibleFocusApres("monter", 1, 3)).toEqual({ index: 0, bouton: "bas" });
  });
  it("suit l'élément descendu, sur ↑ s'il arrive en dernier", () => {
    expect(cibleFocusApres("descendre", 0, 3)).toEqual({ index: 1, bouton: "bas" });
    expect(cibleFocusApres("descendre", 1, 3)).toEqual({ index: 2, bouton: "haut" });
  });
  it("après un retrait, va au « Retirer » suivant, sinon au précédent, sinon à l'ajout", () => {
    expect(cibleFocusApres("retirer", 0, 3)).toEqual({ index: 0, bouton: "retirer" });
    expect(cibleFocusApres("retirer", 2, 3)).toEqual({ index: 1, bouton: "retirer" });
    expect(cibleFocusApres("retirer", 0, 1)).toBe("ajout");
  });
});
