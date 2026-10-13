import { describe, expect, it } from "vitest";
import { aLeRole, estRoleAdmin } from "./roles";

describe("aLeRole", () => {
  it("donne au super-admin tous les droits", () => {
    expect(aLeRole("superadmin", "superadmin")).toBe(true);
    expect(aLeRole("superadmin", "editeur")).toBe(true);
  });

  it("limite l'éditeur à son rôle", () => {
    expect(aLeRole("editeur", "editeur")).toBe(true);
    expect(aLeRole("editeur", "superadmin")).toBe(false);
  });
});

describe("nouveaux rôles", () => {
  it("le trésorier et le membre n'ont pas les droits de l'éditeur", () => {
    expect(aLeRole("tresorier", "editeur")).toBe(false);
    expect(aLeRole("membre", "editeur")).toBe(false);
    expect(aLeRole("tresorier", "tresorier")).toBe(true);
    expect(aLeRole("superadmin", "tresorier")).toBe(true);
  });
  it("seul le membre n'a pas accès à l'admin", () => {
    expect(estRoleAdmin("membre")).toBe(false);
    expect(["superadmin", "editeur", "tresorier"].every((r) => estRoleAdmin(r as never))).toBe(true);
  });
});
