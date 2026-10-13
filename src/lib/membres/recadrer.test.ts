import { describe, expect, it } from "vitest";
import { COTE_PORTRAIT, zoneCarree } from "./recadrer";

describe("zoneCarree", () => {
  it("centre un carré dans une image paysage", () => {
    expect(zoneCarree(1600, 1000)).toEqual({ x: 300, y: 0, cote: 1000, sortie: COTE_PORTRAIT });
  });
  it("centre un carré dans une image portrait", () => {
    expect(zoneCarree(600, 1200)).toEqual({ x: 0, y: 300, cote: 600, sortie: 600 });
  });
  it("n'agrandit jamais une petite image", () => {
    expect(zoneCarree(300, 300).sortie).toBe(300);
  });
  it("plafonne la sortie à 800 px", () => {
    expect(zoneCarree(4000, 3000).sortie).toBe(800);
  });
});
