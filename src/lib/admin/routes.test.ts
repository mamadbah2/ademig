import { describe, expect, it } from "vitest";
import { estRouteAdminPublique } from "./routes";

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
