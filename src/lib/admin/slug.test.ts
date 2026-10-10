import { describe, expect, it } from "vitest";
import { slugifier } from "./slug";

describe("slugifier", () => {
  it("retire accents, ponctuation et majuscules", () => {
    expect(slugifier("Journée nationale du Contenu local : 2026 !")).toBe("journee-nationale-du-contenu-local-2026");
  });
  it("traite les apostrophes et ligatures", () => {
    expect(slugifier("L'œuvre de l’amicale")).toBe("l-oeuvre-de-l-amicale");
  });
  it("ne laisse ni tiret en tête ni en fin", () => {
    expect(slugifier("  -- Forum --  ")).toBe("forum");
  });
  it("coupe à 80 caractères sans finir par un tiret", () => {
    const slug = slugifier("mot ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
  it("renvoie une chaîne vide quand il n'y a rien à garder", () => {
    expect(slugifier("!!!")).toBe("");
  });
});
