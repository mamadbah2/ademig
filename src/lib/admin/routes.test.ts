import { describe, expect, it } from "vitest";
import { decisionProxy, estRouteAdminPublique, estRouteMembrePublique } from "./routes";

describe("estRouteAdminPublique", () => {
  it("laisse passer les pages de connexion", () => {
    expect(estRouteAdminPublique("/admin/connexion")).toBe(true);
    expect(estRouteAdminPublique("/admin/mot-de-passe-oublie")).toBe(true);
    expect(estRouteAdminPublique("/admin/reinitialiser")).toBe(true);
  });

  it("protège tout le reste de l'admin", () => {
    expect(estRouteAdminPublique("/admin")).toBe(false);
    expect(estRouteAdminPublique("/admin/comptes")).toBe(false);
    expect(estRouteAdminPublique("/admin/connexion-piege")).toBe(false);
  });
});

describe("estRouteMembrePublique", () => {
  it("n'ouvre que l'activation du compte", () => {
    expect(estRouteMembrePublique("/espace-membre/activer")).toBe(true);
    expect(estRouteMembrePublique("/espace-membre/profil")).toBe(false);
    expect(estRouteMembrePublique("/espace-membre")).toBe(false);
    expect(estRouteMembrePublique("/espace-membre/activer-piege")).toBe(false);
  });
});

describe("decisionProxy", () => {
  it("renvoie l'admin sans cookie vers sa connexion", () => {
    expect(decisionProxy("/admin/membres", false)).toBe("/admin/connexion");
    expect(decisionProxy("/admin/connexion", false)).toBeNull();
    expect(decisionProxy("/admin/membres", true)).toBeNull();
  });

  it("renvoie l'espace membre sans cookie vers /connexion avec le chemin de retour", () => {
    expect(decisionProxy("/espace-membre/profil", false)).toBe("/connexion?retour=%2Fespace-membre%2Fprofil");
    expect(decisionProxy("/espace-membre", false)).toBe("/connexion?retour=%2Fespace-membre");
    expect(decisionProxy("/espace-membre/activer", false)).toBeNull();
    expect(decisionProxy("/espace-membre/profil", true)).toBeNull();
  });

  it("ignore les autres chemins", () => {
    expect(decisionProxy("/", false)).toBeNull();
  });
});
