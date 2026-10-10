import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFLIT } from "@/db/operations/commun";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ creerMandat: vi.fn(), enregistrerMandat: vi.fn(), activerMandat: vi.fn(), supprimerMandat: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/bureau", () => ops);
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => ({ redirect }));

import { activerMandatAction, creerMandatAction, enregistrerMandatAction, supprimerMandatAction } from "./bureau";

const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";
const MEMBRE = "0b6a2a5e-3c1d-4f2e-8a9b-1c2d3e4f5a6b";
const VERSION = "2026-01-01T00:00:00.000Z";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = { libelle: "Bureau 2027", dateElection: "2027-09-20", ...champs };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await creerMandatAction(null, formulaire())).toEqual(refus);
    expect(await enregistrerMandatAction(ID, null, formulaire({ version: VERSION }))).toEqual(refus);
    expect(await activerMandatAction(ID)).toEqual(refus);
    expect(await supprimerMandatAction(ID)).toEqual(refus);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" }));

  it("crée un mandat, invalide bureau et membres, puis redirige", async () => {
    ops.creerMandat.mockResolvedValue({ id: ID });
    await creerMandatAction(null, formulaire({ reprendreCommissions: "on" }));
    expect(ops.creerMandat).toHaveBeenCalledWith({}, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: true });
    expect(cache.revalidateTag).toHaveBeenCalledWith("bureau", { expire: 0 });
    expect(cache.revalidateTag).toHaveBeenCalledWith("membres", { expire: 0 });
    expect(redirect).toHaveBeenCalledWith(`/admin/bureau/${ID}?cree=1`);
  });

  it("enregistre le mandat avec sa version", async () => {
    ops.enregistrerMandat.mockResolvedValue({ version: "2026-01-02T00:00:00.000Z" });
    const postes = JSON.stringify([{ membreId: MEMBRE, fonction: "Président", executif: true }]);
    const r = await enregistrerMandatAction(ID, null, formulaire({ version: VERSION, postes }));
    expect(r).toEqual({ ok: true, message: "Mandat enregistré.", donnees: { version: "2026-01-02T00:00:00.000Z" } });
    expect(ops.enregistrerMandat).toHaveBeenCalledWith(
      {},
      ID,
      {
        libelle: "Bureau 2027",
        dateElection: "2027-09-20",
        postes: [{ membreId: MEMBRE, fonction: "Président", executif: true }],
        commissions: [],
      },
      { version: VERSION },
    );
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/admin/bureau/${ID}`);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/membres");
  });

  it("numérote l'élément en erreur, sans écrire", async () => {
    const postes = JSON.stringify([{ membreId: "", fonction: "Président", executif: true }]);
    const r = await enregistrerMandatAction(ID, null, formulaire({ version: VERSION, postes }));
    expect(!r.ok && r.erreurs?.postes).toEqual(["Élément 1 : Choisissez un membre."]);
    expect(ops.enregistrerMandat).not.toHaveBeenCalled();
  });

  it("refuse un enregistrement sans version", async () => {
    expect(await enregistrerMandatAction(ID, null, formulaire())).toEqual({ ok: false, message: CONFLIT });
    expect(ops.enregistrerMandat).not.toHaveBeenCalled();
  });

  it("active un mandat et invalide le cache", async () => {
    const r = await activerMandatAction(ID);
    expect(r).toEqual({ ok: true, message: "Mandat activé : il est désormais affiché sur le site." });
    expect(ops.activerMandat).toHaveBeenCalledWith({}, ID);
    expect(cache.revalidateTag).toHaveBeenCalledWith("bureau", { expire: 0 });
    expect(cache.revalidateTag).toHaveBeenCalledWith("membres", { expire: 0 });
  });

  it("supprime un mandat", async () => {
    expect(await supprimerMandatAction(ID)).toEqual({ ok: true, message: "Mandat supprimé." });
    expect(ops.supprimerMandat).toHaveBeenCalledWith({}, ID);
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/bureau");
  });

  it("répond « introuvable » pour un identifiant invalide, sans requête", async () => {
    const introuvable = { ok: false, message: "Mandat introuvable." };
    expect(await enregistrerMandatAction("x", null, formulaire({ version: VERSION }))).toEqual(introuvable);
    expect(await activerMandatAction("x")).toEqual(introuvable);
    expect(await supprimerMandatAction("x")).toEqual(introuvable);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
  });
});
