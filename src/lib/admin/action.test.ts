import { describe, expect, it, vi } from "vitest";
import { ErreurMetier } from "@/db/operations/erreurs";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));

import { action } from "./action";

describe("action", () => {
  it("refuse un éditeur qui demande un droit de super-administrateur", async () => {
    exigerRole.mockRejectedValueOnce(new AccesRefuse());
    const fn = vi.fn();
    expect(await action("superadmin", fn)).toEqual({ ok: false, message: "Accès refusé." });
    expect(fn).not.toHaveBeenCalled();
  });

  it("exécute la fonction avec la session quand le rôle suffit", async () => {
    const session = { userId: "u1", role: "editeur" };
    exigerRole.mockResolvedValueOnce(session);
    const fn = vi.fn(async () => ({ ok: true as const, message: "Fait." }));
    expect(await action("editeur", fn)).toEqual({ ok: true, message: "Fait." });
    expect(fn).toHaveBeenCalledWith(session);
  });

  it("traduit une erreur métier", async () => {
    exigerRole.mockResolvedValueOnce({ userId: "u1" });
    const res = await action("editeur", async () => {
      throw new ErreurMetier("Image introuvable.");
    });
    expect(res).toEqual({ ok: false, message: "Image introuvable." });
  });

  it("relance les autres erreurs", async () => {
    exigerRole.mockResolvedValueOnce({ userId: "u1" });
    await expect(
      action("editeur", async () => {
        throw new Error("panne");
      }),
    ).rejects.toThrow("panne");
  });
});
