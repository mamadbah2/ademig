import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.hoisted(() => vi.fn());
const redirect = vi.hoisted(() =>
  vi.fn((chemin: string) => {
    throw new Error(`REDIRECT:${chemin}`);
  }),
);
const ficheDuCompte = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), cache: <T,>(f: T) => f }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/requetes/fiche-du-compte", () => ({ ficheDuCompte }));

import { AccesRefuse } from "@/lib/roles";
import { destinationApresConnexion, estRouteMembrePublique, exigerAdmin, exigerMembre, exigerRole, exigerSession } from "./session";

function sessionDe(role: string, actif = true) {
  getSession.mockResolvedValue({ user: { id: "u1", name: "Awa", email: "awa@ademig.test", role, actif } });
}

beforeEach(() => vi.clearAllMocks());

describe("exigerSession / exigerAdmin", () => {
  it("renvoie un membre vers son espace, jamais vers l'admin", async () => {
    sessionDe("membre");
    await expect(exigerSession()).rejects.toThrow("REDIRECT:/espace-membre");
    await expect(exigerAdmin()).rejects.toThrow("REDIRECT:/espace-membre");
    await expect(exigerRole("editeur")).rejects.toThrow("REDIRECT:/espace-membre");
  });

  it("renvoie vers la connexion de l'admin sans session ou compte inactif", async () => {
    getSession.mockResolvedValue(null);
    await expect(exigerSession()).rejects.toThrow("REDIRECT:/admin/connexion");
    sessionDe("editeur", false);
    await expect(exigerSession()).rejects.toThrow("REDIRECT:/admin/connexion");
  });

  it("laisse entrer les rôles d'administration et garde exigerRole", async () => {
    sessionDe("tresorier");
    expect((await exigerAdmin()).role).toBe("tresorier");
    await expect(exigerRole("editeur")).rejects.toBeInstanceOf(AccesRefuse);
  });
});

describe("exigerMembre", () => {
  it("renvoie vers /connexion sans session", async () => {
    getSession.mockResolvedValue(null);
    await expect(exigerMembre()).rejects.toThrow("REDIRECT:/connexion");
  });

  it("rend { sansFiche } pour un compte sans fiche, sans erreur", async () => {
    sessionDe("editeur");
    ficheDuCompte.mockResolvedValue(undefined);
    const r = await exigerMembre();
    expect(r).toMatchObject({ sansFiche: true, session: { userId: "u1", role: "editeur" } });
  });

  it("rend la session avec membreId quand une fiche est rattachée", async () => {
    sessionDe("membre");
    ficheDuCompte.mockResolvedValue({ id: "fiche-1" });
    expect(await exigerMembre()).toMatchObject({ userId: "u1", role: "membre", membreId: "fiche-1" });
    expect(ficheDuCompte).toHaveBeenCalledWith({}, "u1");
  });
});

describe("garde pure ré-exportée", () => {
  it("expose la destination et les routes publiques", () => {
    expect(destinationApresConnexion("membre")).toBe("/espace-membre");
    expect(estRouteMembrePublique("/espace-membre/activer")).toBe(true);
  });
});
