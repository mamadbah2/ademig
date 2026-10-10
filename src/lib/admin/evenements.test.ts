import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ creerEvenement: vi.fn(), modifierEvenement: vi.fn(), supprimerEvenement: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/evenements", () => ops);
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => ({ redirect }));

import { creerEvenement, enregistrerEvenement, supprimerEvenementAction } from "./evenements";

const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = {
    titre: "Forum",
    slug: "forum",
    debut: "2025-11-05T09:00",
    lieuNom: "CICAD",
    lieuVille: "Diamniadio",
    resume: "Résumé.",
    corps: "<p>Texte.</p>",
    ...champs,
  };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await creerEvenement(null, formulaire())).toEqual(refus);
    expect(await enregistrerEvenement(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z" }))).toEqual(refus);
    expect(await supprimerEvenementAction(ID)).toEqual(refus);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" }));

  it("renvoie l'erreur de fin sans écrire", async () => {
    const r = await creerEvenement(null, formulaire({ fin: "2025-11-04T09:00" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erreurs?.fin).toEqual(["La fin doit être après le début."]);
    expect(ops.creerEvenement).not.toHaveBeenCalled();
  });

  it("crée, invalide le cache des événements et redirige", async () => {
    ops.creerEvenement.mockResolvedValue({ id: ID });
    await creerEvenement(null, formulaire());
    expect(ops.creerEvenement).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ debut: new Date("2025-11-05T09:00:00.000Z"), fin: null, afficheId: null, partenaires: [] }),
      "enregistrer",
    );
    expect(cache.revalidateTag).toHaveBeenCalledWith("evenements", { expire: 0 });
    expect(redirect).toHaveBeenCalledWith(`/admin/evenements/${ID}?cree=1`);
  });

  it("enregistre avec la version et renvoie la nouvelle", async () => {
    ops.modifierEvenement.mockResolvedValue({ version: "2026-01-02T00:00:00.000Z" });
    const r = await enregistrerEvenement(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z", intention: "publier" }));
    expect(r).toEqual({ ok: true, message: "Événement publié.", donnees: { version: "2026-01-02T00:00:00.000Z" } });
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/admin/evenements/${ID}`);
  });

  it("répond « introuvable » pour un identifiant invalide, sans requête", async () => {
    expect(await enregistrerEvenement("x", null, formulaire())).toEqual({ ok: false, message: "Événement introuvable." });
    expect(await supprimerEvenementAction("x")).toEqual({ ok: false, message: "Événement introuvable." });
    expect(ops.modifierEvenement).not.toHaveBeenCalled();
    expect(ops.supprimerEvenement).not.toHaveBeenCalled();
  });

  it("supprime et invalide le cache", async () => {
    ops.supprimerEvenement.mockResolvedValue(undefined);
    expect(await supprimerEvenementAction(ID)).toEqual({ ok: true, message: "Événement supprimé." });
    expect(cache.revalidateTag).toHaveBeenCalledWith("evenements", { expire: 0 });
  });
});
