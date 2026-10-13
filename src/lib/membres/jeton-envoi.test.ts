import { describe, expect, it } from "vitest";
import type { Role } from "@/lib/roles";
import { TAILLE_MAX, TYPES_IMAGES } from "@/lib/validation/media";
import { decisionJetonEnvoi } from "./jeton-envoi";

const s = (role: Role) => ({ role });

describe("decisionJetonEnvoi", () => {
  it("refuse sans session", () => {
    expect(decisionJetonEnvoi(null, true, "membres/a.webp")).toBeNull();
  });

  it("garde les règles de la médiathèque pour un éditeur, quel que soit le dossier", () => {
    for (const role of ["editeur", "superadmin"] as const) {
      expect(decisionJetonEnvoi(s(role), false, "medias/a.png")).toEqual({
        allowedContentTypes: [...TYPES_IMAGES],
        maximumSizeInBytes: TAILLE_MAX,
      });
    }
  });

  it("accepte un membre avec fiche dans le dossier membres/, en images raster de 5 Mo", () => {
    expect(decisionJetonEnvoi(s("membre"), true, "membres/portrait.webp")).toEqual({
      allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
      maximumSizeInBytes: 5 * 1024 * 1024,
    });
  });

  it("traite un trésorier comme un membre : portrait seulement", () => {
    expect(decisionJetonEnvoi(s("tresorier"), true, "medias/a.png")).toBeNull();
    expect(decisionJetonEnvoi(s("tresorier"), true, "membres/a.webp")).not.toBeNull();
  });

  it("refuse un membre sans fiche", () => {
    expect(decisionJetonEnvoi(s("membre"), false, "membres/portrait.webp")).toBeNull();
  });

  it("refuse un membre hors du dossier membres/", () => {
    for (const chemin of ["medias/a.png", "portrait.webp", "../membres/a.webp", "membres", "Membres/a.webp"]) {
      expect(decisionJetonEnvoi(s("membre"), true, chemin)).toBeNull();
    }
  });
});
