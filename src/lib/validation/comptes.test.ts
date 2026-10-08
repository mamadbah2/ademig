import { describe, expect, it } from "vitest";
import { schemaInvitation } from "./comptes";

describe("schemaInvitation", () => {
  it("normalise l'email et le nom", () => {
    expect(schemaInvitation.parse({ nom: "  Awa Ndiaye ", email: " Awa@Exemple.SN ", role: "editeur" })).toEqual({
      nom: "Awa Ndiaye",
      email: "awa@exemple.sn",
      role: "editeur",
    });
  });

  it("refuse un email invalide, un nom vide et un rôle inconnu", () => {
    const r = schemaInvitation.safeParse({ nom: " ", email: "awa", role: "admin" });
    expect(r.success).toBe(false);
    const champs = r.error!.issues.map((i) => i.path[0]);
    expect(champs).toEqual(expect.arrayContaining(["nom", "email", "role"]));
  });
});
