import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurMetier } from "@/db/operations/erreurs";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const invitations = vi.hoisted(() => ({
  inviterParEmail: vi.fn(),
  genererLienInvitation: vi.fn(),
  inviterLesNonInvites: vi.fn(),
  verifierInvitable: vi.fn(),
  desactiverCompteMembre: vi.fn(),
  reactiverCompteMembre: vi.fn(),
}));
const comptes = vi.hoisted(() => ({ changerActivation: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/invitations", () => invitations);
vi.mock("@/db/operations/comptes", () => comptes);
vi.mock("next/cache", () => cache);

import { urlSite } from "@/lib/membres/url";
import { copierLienInvitation, desactiverMembre, inviterTousLesNonInvites, reactiverMembre, renvoyerInvitationMembre } from "./invitations";

const ID = "u-membre";

beforeEach(() => {
  vi.clearAllMocks();
  exigerRole.mockResolvedValue({ userId: "admin", role: "superadmin" });
  invitations.verifierInvitable.mockResolvedValue(undefined);
});

describe("autorisation", () => {
  it("refuse chaque action à un éditeur, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await renvoyerInvitationMembre(ID)).toEqual(refus);
    expect(await copierLienInvitation(ID)).toEqual(refus);
    expect(await inviterTousLesNonInvites()).toEqual(refus);
    expect(await desactiverMembre(ID)).toEqual(refus);
    expect(await reactiverMembre(ID)).toEqual(refus);
    expect(Object.values({ ...invitations, ...comptes }).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("superadmin");
  });
});

describe("renvoyerInvitationMembre", () => {
  it("met l'invitation en file en priorité", async () => {
    const r = await renvoyerInvitationMembre(ID);
    expect(r.ok).toBe(true);
    expect(invitations.inviterParEmail).toHaveBeenCalledWith({}, ID, expect.any(Function), { prioritaire: true });
  });

  it("refuse un compte déjà activé", async () => {
    invitations.verifierInvitable.mockRejectedValue(new ErreurMetier("Ce compte est déjà activé."));
    const r = await renvoyerInvitationMembre(ID);
    expect(r).toEqual({ ok: false, message: "Ce compte est déjà activé." });
    expect(invitations.inviterParEmail).not.toHaveBeenCalled();
  });
});

describe("copierLienInvitation", () => {
  it("renvoie un lien d'activation sur l'adresse du site", async () => {
    invitations.genererLienInvitation.mockResolvedValue({ jeton: "abc" });
    const r = await copierLienInvitation(ID);
    expect(r.ok && r.donnees?.url.startsWith(urlSite())).toBe(true);
    expect(r.ok && r.donnees?.url).toContain("/espace-membre/activer?jeton=abc");
  });

  it("refuse un compte déjà activé, sans générer de lien", async () => {
    invitations.verifierInvitable.mockRejectedValue(new ErreurMetier("Ce compte est déjà activé."));
    expect((await copierLienInvitation(ID)).ok).toBe(false);
    expect(invitations.genererLienInvitation).not.toHaveBeenCalled();
  });

  it("n'annonce pas le lien dans le message", async () => {
    invitations.genererLienInvitation.mockResolvedValue({ jeton: "abc" });
    const r = await copierLienInvitation(ID);
    expect(r.message ?? "").not.toContain("abc");
  });
});

describe("inviterTousLesNonInvites", () => {
  it("annonce le nombre de comptes mis en file", async () => {
    invitations.inviterLesNonInvites.mockResolvedValue(3);
    const r = await inviterTousLesNonInvites();
    expect(r).toMatchObject({ ok: true, donnees: { invites: 3 } });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/membres");
  });
});

describe("desactiverMembre et reactiverMembre", () => {
  it("désactive le compte au nom de l'acteur et retire ses invitations", async () => {
    expect((await desactiverMembre(ID)).ok).toBe(true);
    expect(invitations.desactiverCompteMembre).toHaveBeenCalledWith({}, { acteurId: "admin", cibleId: ID });
  });

  it("réactive le compte", async () => {
    expect((await reactiverMembre(ID)).ok).toBe(true);
    expect(invitations.reactiverCompteMembre).toHaveBeenCalledWith({}, ID);
  });
});
