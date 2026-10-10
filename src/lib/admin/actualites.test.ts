import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ creerActualite: vi.fn(), modifierActualite: vi.fn(), supprimerActualite: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/actualites", () => ops);
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => ({ redirect }));

import { creerActualite, enregistrerActualite, supprimerActualiteAction } from "./actualites";

const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = { titre: "Forum", slug: "forum", date: "2025-11-20", resume: "Résumé.", corps: "<p>Texte.</p>", ...champs };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await creerActualite(null, formulaire())).toEqual(refus);
    expect(await enregistrerActualite(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z" }))).toEqual(refus);
    expect(await supprimerActualiteAction(ID)).toEqual(refus);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" }));

  it("renvoie les erreurs de saisie sans écrire", async () => {
    const r = await creerActualite(null, formulaire({ titre: "" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erreurs?.titre).toBeTruthy();
    expect(ops.creerActualite).not.toHaveBeenCalled();
  });

  it("crée, invalide le cache du site et redirige vers la fiche", async () => {
    ops.creerActualite.mockResolvedValue({ id: ID });
    await creerActualite(null, formulaire({ intention: "publier" }));
    expect(ops.creerActualite).toHaveBeenCalledWith({}, expect.objectContaining({ titre: "Forum", photos: [] }), "publier");
    expect(cache.revalidateTag).toHaveBeenCalledWith("actualites", { expire: 0 });
    expect(redirect).toHaveBeenCalledWith(`/admin/actualites/${ID}?cree=1`);
  });

  it("enregistre avec la version et renvoie la nouvelle", async () => {
    ops.modifierActualite.mockResolvedValue({ version: "2026-01-02T00:00:00.000Z" });
    const r = await enregistrerActualite(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z", intention: "depublier" }));
    expect(r).toEqual({ ok: true, message: "Actualité retirée du site.", donnees: { version: "2026-01-02T00:00:00.000Z" } });
    expect(ops.modifierActualite).toHaveBeenCalledWith({}, ID, expect.objectContaining({ slug: "forum" }), {
      version: "2026-01-01T00:00:00.000Z",
      intention: "depublier",
      modifierSlug: false,
    });
    expect(cache.revalidateTag).toHaveBeenCalledWith("actualites", { expire: 0 });
  });

  it("répond « introuvable » pour un identifiant invalide, sans requête", async () => {
    expect(await enregistrerActualite("x", null, formulaire())).toEqual({ ok: false, message: "Actualité introuvable." });
    expect(await supprimerActualiteAction("x")).toEqual({ ok: false, message: "Actualité introuvable." });
    expect(ops.modifierActualite).not.toHaveBeenCalled();
  });

  it("traite une version absente comme un conflit", async () => {
    const r = await enregistrerActualite(ID, null, formulaire());
    expect(r.ok).toBe(false);
    expect(ops.modifierActualite).not.toHaveBeenCalled();
  });

  it("supprime et invalide le cache", async () => {
    ops.supprimerActualite.mockResolvedValue(undefined);
    expect(await supprimerActualiteAction(ID)).toEqual({ ok: true, message: "Actualité supprimée." });
    expect(cache.revalidateTag).toHaveBeenCalledWith("actualites", { expire: 0 });
  });
});
