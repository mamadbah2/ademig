import { describe, expect, it } from "vitest";
import { deplacer, retirer } from "./liste";

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
