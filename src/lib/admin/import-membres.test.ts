import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const importOps = vi.hoisted(() => ({ classerImport: vi.fn(), executerImport: vi.fn() }));
const invitationOps = vi.hoisted(() => ({ inviterParEmail: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/import-membres", () => importOps);
vi.mock("@/db/operations/invitations", () => invitationOps);
vi.mock("next/cache", () => cache);

import { analyserImport, confirmerImport } from "./import-membres";

const CSV = "nom;prenom;email\nNdiaye;Awa;e2e-awa@ademig.test\nFall;Bineta;e2e-bineta@ademig.test\n";

const formulaire = (fichier: File | string = new File([CSV], "membres.csv", { type: "text/csv" })) => {
  const fd = new FormData();
  fd.set("fichier", fichier);
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  importOps.classerImport.mockImplementation(async (_db, lignes) => lignes.map((l: object) => ({ ...l, statut: "nouveau", ficheId: null, userId: null })));
});

describe("analyserImport", () => {
  it("est refusé à un éditeur, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    expect(await analyserImport(null, formulaire())).toEqual({ ok: false, message: "Accès refusé." });
    expect(exigerRole).toHaveBeenCalledWith("superadmin");
    expect(importOps.classerImport).not.toHaveBeenCalled();
  });

  it("analyse et classe le fichier d'un superadmin, et renvoie le CSV lu", async () => {
    exigerRole.mockResolvedValue({ userId: "u1", role: "superadmin" });
    const r = await analyserImport(null, formulaire());
    expect(r.ok && r.donnees?.csv).toBe(CSV);
    expect(r.ok && r.donnees?.lignes).toHaveLength(2);
    expect(r.ok && r.donnees?.problemes).toEqual([]);
  });

  it("refuse un fichier de plus de 1 Mo", async () => {
    exigerRole.mockResolvedValue({ userId: "u1", role: "superadmin" });
    const gros = new File(["x".repeat(1024 * 1024 + 1)], "gros.csv", { type: "text/csv" });
    const r = await analyserImport(null, formulaire(gros));
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/1 Mo/);
    expect(importOps.classerImport).not.toHaveBeenCalled();
  });

  it("refuse l'absence de fichier", async () => {
    exigerRole.mockResolvedValue({ userId: "u1", role: "superadmin" });
    expect((await analyserImport(null, formulaire("pas un fichier"))).ok).toBe(false);
  });

  it("traduit un fichier illisible en message", async () => {
    exigerRole.mockResolvedValue({ userId: "u1", role: "superadmin" });
    const r = await analyserImport(null, formulaire(new File(["Ndiaye;Awa\n"], "x.csv")));
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/email/i);
    expect(importOps.classerImport).not.toHaveBeenCalled();
  });
});

describe("confirmerImport", () => {
  beforeEach(() => {
    exigerRole.mockResolvedValue({ userId: "u1", role: "superadmin" });
  });

  it("est refusé à un éditeur", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    expect(await confirmerImport(CSV)).toEqual({ ok: false, message: "Accès refusé." });
    expect(importOps.executerImport).not.toHaveBeenCalled();
  });

  it("réanalyse le CSV, exécute, invite chaque compte une fois et renvoie les compteurs", async () => {
    importOps.executerImport.mockResolvedValue({ crees: 1, rattaches: 1, ignores: 0, aInviter: ["a", "b", "a"] });
    const r = await confirmerImport(CSV);
    expect(importOps.executerImport).toHaveBeenCalledWith({}, [
      expect.objectContaining({ email: "e2e-awa@ademig.test", prenom: "Awa" }),
      expect.objectContaining({ email: "e2e-bineta@ademig.test" }),
    ]);
    expect(invitationOps.inviterParEmail).toHaveBeenCalledTimes(2);
    expect(invitationOps.inviterParEmail).toHaveBeenCalledWith({}, "a");
    expect(r.ok && r.donnees).toEqual({ crees: 1, rattaches: 1, ignores: 0, invites: 2, echecs: 0 });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/membres");
  });

  it("compte les invitations en échec sans faire échouer l'import", async () => {
    importOps.executerImport.mockResolvedValue({ crees: 2, rattaches: 0, ignores: 0, aInviter: ["a", "b"] });
    invitationOps.inviterParEmail.mockRejectedValueOnce(new Error("panne"));
    const r = await confirmerImport(CSV);
    expect(r.ok && r.donnees).toEqual({ crees: 2, rattaches: 0, ignores: 0, invites: 1, echecs: 1 });
    expect(r.message).toMatch(/1 invitation/);
  });

  it("n'importe que les lignes valides et n'exécute rien si le CSV est illisible", async () => {
    importOps.executerImport.mockResolvedValue({ crees: 1, rattaches: 0, ignores: 0, aInviter: ["a"] });
    await confirmerImport(`${CSV}Sans;Email;pas-un-email\n`);
    expect(importOps.executerImport.mock.calls[0][1]).toHaveLength(2);
    importOps.executerImport.mockClear();
    expect((await confirmerImport("colonne;inconnue\n")).ok).toBe(false);
    expect(importOps.executerImport).not.toHaveBeenCalled();
  });
});
