import { describe, expect, it } from "vitest";
import { calculerDimensions, nomDeFichier } from "./preparer-image";

describe("calculerDimensions", () => {
  it("réduit le plus grand côté à 2000 px en gardant les proportions", () => {
    expect(calculerDimensions(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(calculerDimensions(3024, 4032)).toEqual({ width: 1500, height: 2000 });
  });

  it("n'agrandit jamais une petite image", () => {
    expect(calculerDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("nomDeFichier", () => {
  it("produit un nom sans accents ni espaces", () => {
    expect(nomDeFichier("Journée Contenu Local (1).JPG", "webp")).toBe("journee-contenu-local-1.webp");
  });

  it("donne un nom par défaut", () => {
    expect(nomDeFichier("???.png", "webp")).toBe("image.webp");
  });
});
