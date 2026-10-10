import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFLIT } from "@/db/operations/commun";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({
  creerPartenaire: vi.fn(),
  modifierPartenaire: vi.fn(),
  supprimerPartenaire: vi.fn(),
  deplacerPartenaire: vi.fn(),
}));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/partenaires", () => ops);
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => ({ redirect }));

import { creerPartenaire, deplacerPartenaireAction, enregistrerPartenaire, supprimerPartenaireAction } from "./partenaires";

const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = { nom: "Petrosen", description: "Société nationale.", categorie: "Institution", ...champs };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await creerPartenaire(null, formulaire())).toEqual(refus);
    expect(await enregistrerPartenaire(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z" }))).toEqual(refus);
    expect(await supprimerPartenaireAction(ID)).toEqual(refus);
    expect(await deplacerPartenaireAction(ID, 1)).toEqual(refus);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" }));

  it("crée, invalide le cache des partenaires et redirige", async () => {
    ops.creerPartenaire.mockResolvedValue({ id: ID });
    await creerPartenaire(null, formulaire());
    expect(ops.creerPartenaire).toHaveBeenCalledWith({}, expect.objectContaining({ visible: false, url: null, logoId: null }));
    expect(cache.revalidateTag).toHaveBeenCalledWith("partenaires", { expire: 0 });
    expect(redirect).toHaveBeenCalledWith(`/admin/partenaires/${ID}?cree=1`);
  });

  it("refuse d'enregistrer sans version, sans écrire", async () => {
    expect(await enregistrerPartenaire(ID, null, formulaire())).toEqual({ ok: false, message: CONFLIT });
    expect(ops.modifierPartenaire).not.toHaveBeenCalled();
  });

  it("enregistre avec la version et renvoie la nouvelle", async () => {
    ops.modifierPartenaire.mockResolvedValue({ version: "2026-01-02T00:00:00.000Z" });
    const r = await enregistrerPartenaire(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z" }));
    expect(r).toEqual({ ok: true, message: "Partenaire enregistré.", donnees: { version: "2026-01-02T00:00:00.000Z" } });
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/admin/partenaires/${ID}`);
  });

  it("déplace et invalide le cache ; refuse un sens invalide", async () => {
    expect(await deplacerPartenaireAction(ID, 1)).toEqual({ ok: true });
    expect(ops.deplacerPartenaire).toHaveBeenCalledWith({}, ID, 1);
    expect(cache.revalidateTag).toHaveBeenCalledWith("partenaires", { expire: 0 });
    ops.deplacerPartenaire.mockClear();
    expect(await deplacerPartenaireAction(ID, 2 as never)).toEqual({ ok: false, message: "Déplacement impossible." });
    expect(ops.deplacerPartenaire).not.toHaveBeenCalled();
  });

  it("supprime et invalide le cache", async () => {
    expect(await supprimerPartenaireAction(ID)).toEqual({ ok: true, message: "Partenaire supprimé." });
    expect(ops.supprimerPartenaire).toHaveBeenCalledWith({}, ID);
    expect(cache.revalidateTag).toHaveBeenCalledWith("partenaires", { expire: 0 });
  });

  it("répond « introuvable » pour un identifiant invalide, sans requête", async () => {
    const introuvable = { ok: false, message: "Partenaire introuvable." };
    expect(await enregistrerPartenaire("x", null, formulaire())).toEqual(introuvable);
    expect(await supprimerPartenaireAction("x")).toEqual(introuvable);
    expect(await deplacerPartenaireAction("x", 1)).toEqual(introuvable);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
  });
});
