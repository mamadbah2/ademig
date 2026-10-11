import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFLIT } from "@/db/operations/commun";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ creerMembre: vi.fn(), modifierMembre: vi.fn(), supprimerMembre: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/membres", () => ops);
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => ({ redirect }));

import { creerMembre, enregistrerMembre, supprimerMembreAction } from "./membres";

const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = { nom: "Awa Ndiaye", slug: "awa-ndiaye", titre: "Géologue", specialite: "Géologie", resume: "Résumé.", ...champs };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await creerMembre(null, formulaire())).toEqual(refus);
    expect(await enregistrerMembre(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z" }))).toEqual(refus);
    expect(await supprimerMembreAction(ID)).toEqual(refus);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" }));

  it("renvoie l'erreur d'email sans écrire", async () => {
    const r = await creerMembre(null, formulaire({ lienEmail: "pas-un-email" }));
    expect(!r.ok && r.erreurs?.lienEmail).toEqual(["Adresse email invalide."]);
    expect(ops.creerMembre).not.toHaveBeenCalled();
  });

  it("crée une fiche masquée par défaut, invalide membres et bureau, puis redirige", async () => {
    ops.creerMembre.mockResolvedValue({ id: ID });
    await creerMembre(null, formulaire());
    expect(ops.creerMembre).toHaveBeenCalledWith({}, expect.objectContaining({ visible: false, liens: null, bio: null, promotion: null, competences: [] }));
    expect(ops.creerMembre.mock.calls[0][1]).not.toHaveProperty("modifierSlug");
    expect(cache.revalidateTag).toHaveBeenCalledWith("membres", { expire: 0 });
    expect(cache.revalidateTag).toHaveBeenCalledWith("bureau", { expire: 0 });
    expect(redirect).toHaveBeenCalledWith(`/admin/membres/${ID}?cree=1`);
  });

  it("enregistre avec la version et le déverrouillage du lien", async () => {
    ops.modifierMembre.mockResolvedValue({ version: "2026-01-02T00:00:00.000Z" });
    const r = await enregistrerMembre(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z", modifierSlug: "on" }));
    expect(r).toEqual({ ok: true, message: "Fiche enregistrée.", donnees: { version: "2026-01-02T00:00:00.000Z" } });
    expect(ops.modifierMembre).toHaveBeenCalledWith({}, ID, expect.objectContaining({ nom: "Awa Ndiaye" }), {
      version: "2026-01-01T00:00:00.000Z",
      modifierSlug: true,
    });
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/admin/membres/${ID}`);
  });

  it("refuse un enregistrement sans version", async () => {
    expect(await enregistrerMembre(ID, null, formulaire())).toEqual({ ok: false, message: CONFLIT });
    expect(ops.modifierMembre).not.toHaveBeenCalled();
  });

  it("répond « introuvable » pour un identifiant invalide, sans requête", async () => {
    expect(await enregistrerMembre("x", null, formulaire())).toEqual({ ok: false, message: "Membre introuvable." });
    expect(await supprimerMembreAction("x")).toEqual({ ok: false, message: "Membre introuvable." });
    expect(ops.modifierMembre).not.toHaveBeenCalled();
    expect(ops.supprimerMembre).not.toHaveBeenCalled();
  });

  it("supprime et invalide le cache", async () => {
    ops.supprimerMembre.mockResolvedValue(undefined);
    expect(await supprimerMembreAction(ID)).toEqual({ ok: true, message: "Membre supprimé." });
    expect(cache.revalidateTag).toHaveBeenCalledWith("membres", { expire: 0 });
    expect(cache.revalidateTag).toHaveBeenCalledWith("bureau", { expire: 0 });
  });
});
