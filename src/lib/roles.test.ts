import { describe, expect, it } from "vitest";
import { aLeRole } from "./roles";

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
