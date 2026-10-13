import { describe, expect, it } from "vitest";
import { retourValide } from "./retour";

describe("retourValide", () => {
  it("accepte les adresses de l'espace membre", () => {
    expect(retourValide("/espace-membre")).toBe("/espace-membre");
    expect(retourValide("/espace-membre/profil")).toBe("/espace-membre/profil");
    expect(retourValide("/espace-membre?bienvenue=1")).toBe("/espace-membre?bienvenue=1");
  });

  it("refuse tout le reste (redirection ouverte)", () => {
    for (const mauvais of [
      "//evil.com",
      "//espace-membre",
      "https://evil.com/espace-membre",
      "javascript:alert(1)",
      "/admin",
      "/espace-membreX",
      "/espace-membre/../admin",
      "/espace-membre\\..\\evil",
      "/espace-membre/%2e%2e/admin",
      "espace-membre",
      "",
    ]) {
      expect(retourValide(mauvais), mauvais).toBeNull();
    }
  });

  it("refuse une valeur absente ou multiple", () => {
    expect(retourValide(undefined)).toBeNull();
    expect(retourValide(["/espace-membre", "/espace-membre/profil"])).toBeNull();
  });
});
