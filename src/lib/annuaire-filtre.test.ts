import { describe, expect, it } from "vitest";
import { lireFiltreAnnuaire, urlAnnuaire } from "./annuaire-filtre";

describe("lireFiltreAnnuaire", () => {
  it("lit recherche, promotion, spécialité et page", () => {
    expect(lireFiltreAnnuaire({ q: " awa ", promotion: "2015", specialite: "Mines", page: "2" })).toEqual({
      q: "awa",
      promotion: 2015,
      specialite: "Mines",
      page: 2,
    });
  });
  it("ignore les valeurs inattendues", () => {
    expect(lireFiltreAnnuaire({ q: ["a"], promotion: "abc", specialite: "", page: "-1" })).toEqual({
      q: "",
      promotion: null,
      specialite: null,
      page: 1,
    });
    expect(lireFiltreAnnuaire({ promotion: "99999999999" }).promotion).toBeNull();
    expect(lireFiltreAnnuaire({ page: "99999999999" }).page).toBe(10000);
  });
});

describe("urlAnnuaire", () => {
  it("ne garde que les paramètres utiles", () => {
    const f = { q: "", promotion: null, specialite: null, page: 1 };
    expect(urlAnnuaire(f, 1)).toBe("/espace-membre/annuaire");
    expect(urlAnnuaire({ ...f, q: "awa sow", promotion: 2015, specialite: "Mines" }, 3)).toBe(
      "/espace-membre/annuaire?q=awa+sow&promotion=2015&specialite=Mines&page=3",
    );
  });
});
