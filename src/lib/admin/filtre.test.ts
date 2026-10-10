import { describe, expect, it } from "vitest";
import { lireFiltre, urlListe } from "./filtre";

describe("lireFiltre", () => {
  it("lit recherche, statut et page", () => {
    expect(lireFiltre({ q: " forum ", statut: "publie", page: "3" })).toEqual({ q: "forum", statut: "publie", page: 3 });
  });
  it("ignore les valeurs inattendues", () => {
    expect(lireFiltre({ q: ["a", "b"], statut: "supprime", page: "-2" })).toEqual({ q: "", statut: undefined, page: 1 });
    expect(lireFiltre({ page: "abc" }).page).toBe(1);
  });
});

describe("urlListe", () => {
  it("ne garde que les paramètres utiles", () => {
    expect(urlListe("/admin/actualites", { q: "", page: 1 }, 1)).toBe("/admin/actualites");
    expect(urlListe("/admin/actualites", { q: "forum sim", statut: "brouillon", page: 1 }, 2)).toBe(
      "/admin/actualites?q=forum+sim&statut=brouillon&page=2",
    );
  });
});
