import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErreurMetier } from "@/db/operations/erreurs";

const exigerMembre = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ modifierProfil: vi.fn() }));
const media = vi.hoisted(() => ({ mediaExiste: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const blob = vi.hoisted(() => ({ del: vi.fn() }));
vi.mock("@/lib/session", () => ({ exigerMembre }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/profil", () => ops);
vi.mock("@/db/operations/media", () => media);
vi.mock("next/cache", () => cache);
vi.mock("@vercel/blob", () => blob);

import { enregistrerProfil } from "./actions-profil";

const MEMBRE = { userId: "u1", nom: "Awa", email: "a@ademig.test", role: "membre", membreId: "fiche-1" };
const URL_BLOB = "https://x.public.blob.vercel-storage.com/membres/p-abc.webp";
process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_X_secret";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = { resume: "Géologue.", specialite: "Géologie", visibilite: "publique", ...champs };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  exigerMembre.mockResolvedValue(MEMBRE);
  ops.modifierProfil.mockResolvedValue({ photoRemplacee: null });
  media.mediaExiste.mockResolvedValue(false);
});

describe("enregistrerProfil", () => {
  it("ignore tout identifiant du formulaire : seule la session désigne la fiche", async () => {
    const r = await enregistrerProfil(null, formulaire({ membreId: "autre", id: "autre", userId: "autre", slug: "autre" }));
    expect(r).toEqual({ ok: true, message: "Profil enregistré." });
    expect(ops.modifierProfil).toHaveBeenCalledTimes(1);
    const [, userId, donnees] = ops.modifierProfil.mock.calls[0];
    expect(userId).toBe("u1");
    expect(JSON.stringify(donnees)).not.toContain("autre");
  });

  it("explique l'absence de fiche sans écrire", async () => {
    exigerMembre.mockResolvedValue({ sansFiche: true, session: MEMBRE });
    expect(await enregistrerProfil(null, formulaire())).toEqual({
      ok: false,
      message: "Aucune fiche membre n'est liée à votre compte : contactez le bureau.",
    });
    expect(ops.modifierProfil).not.toHaveBeenCalled();
  });

  it("renvoie les erreurs de saisie sans écrire", async () => {
    const r = await enregistrerProfil(null, formulaire({ linkedin: "https://evil.com/in/x" }));
    expect(!r.ok && r.erreurs?.linkedin).toEqual(["Collez l'adresse de votre profil LinkedIn (https://www.linkedin.com/in/…)."]);
    expect(ops.modifierProfil).not.toHaveBeenCalled();
  });

  it("invalide le cache des membres et l'accueil", async () => {
    await enregistrerProfil(null, formulaire());
    expect(cache.revalidateTag).toHaveBeenCalledWith("membres", { expire: 0 });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/espace-membre");
  });

  it("efface de Blob l'ancienne photo remplacée", async () => {
    ops.modifierProfil.mockResolvedValue({ photoRemplacee: { url: "https://x.public.blob.vercel-storage.com/membres/ancienne.webp", pathname: "membres/ancienne.webp" } });
    await enregistrerProfil(null, formulaire({ photoUrl: URL_BLOB, photoPathname: "membres/p-abc.webp", photoLargeur: "800", photoHauteur: "800" }));
    expect(blob.del).toHaveBeenCalledWith("https://x.public.blob.vercel-storage.com/membres/ancienne.webp");
  });

  it("une panne d'effacement n'annule pas l'enregistrement", async () => {
    ops.modifierProfil.mockResolvedValue({ photoRemplacee: { url: URL_BLOB, pathname: "membres/p-abc.webp" } });
    blob.del.mockRejectedValue(new Error("réseau"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await enregistrerProfil(null, formulaire())).ok).toBe(true);
  });

  it("nettoie le fichier envoyé quand l'enregistrement échoue", async () => {
    ops.modifierProfil.mockRejectedValue(new ErreurMetier("Fiche introuvable."));
    const r = await enregistrerProfil(null, formulaire({ photoUrl: URL_BLOB, photoPathname: "membres/p-abc.webp", photoLargeur: "800", photoHauteur: "800" }));
    expect(r).toEqual({ ok: false, message: "Fiche introuvable." });
    expect(blob.del).toHaveBeenCalledWith(URL_BLOB);
  });

  it("nettoie le fichier envoyé quand la saisie est invalide, sauf s'il est déjà enregistré", async () => {
    const champs = { linkedin: "x", photoUrl: URL_BLOB, photoPathname: "membres/p-abc.webp", photoLargeur: "800", photoHauteur: "800" };
    await enregistrerProfil(null, formulaire(champs));
    expect(blob.del).toHaveBeenCalledWith(URL_BLOB);
    blob.del.mockClear();
    media.mediaExiste.mockResolvedValue(true);
    await enregistrerProfil(null, formulaire(champs));
    expect(blob.del).not.toHaveBeenCalled();
  });

  it("ne supprime jamais un fichier hors du dossier membres/", async () => {
    await enregistrerProfil(null, formulaire({ linkedin: "x", photoUrl: "https://x.public.blob.vercel-storage.com/medias/logo.webp" }));
    expect(blob.del).not.toHaveBeenCalled();
  });

  it("refuse une photo d'une autre boutique Blob, sans rien écrire ni effacer", async () => {
    const r = await enregistrerProfil(
      null,
      formulaire({ photoUrl: "https://autre.public.blob.vercel-storage.com/membres/p.webp", photoPathname: "membres/p.webp", photoLargeur: "800", photoHauteur: "800" }),
    );
    expect(r.ok).toBe(false);
    expect(ops.modifierProfil).not.toHaveBeenCalled();
    expect(blob.del).not.toHaveBeenCalled();
  });

  it("n'efface jamais un ancien fichier hors de membres/", async () => {
    ops.modifierProfil.mockResolvedValue({ photoRemplacee: { url: "https://x.public.blob.vercel-storage.com/medias/a.webp", pathname: "medias/a.webp" } });
    await enregistrerProfil(null, formulaire());
    expect(blob.del).not.toHaveBeenCalled();
  });

  it("ne supprime pas la photo d'un autre membre quand l'enregistrement est refusé", async () => {
    ops.modifierProfil.mockRejectedValue(new ErreurMetier("Cette photo n'est pas la vôtre : choisissez-en une autre."));
    media.mediaExiste.mockResolvedValue(true);
    await enregistrerProfil(null, formulaire({ photoUrl: URL_BLOB, photoPathname: "membres/p-abc.webp", photoLargeur: "800", photoHauteur: "800" }));
    expect(blob.del).not.toHaveBeenCalled();
  });
});
