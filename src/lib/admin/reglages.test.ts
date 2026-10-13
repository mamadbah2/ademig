import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFLIT } from "@/db/operations/commun";
import { ErreurMetier } from "@/db/operations/erreurs";
import { TEXTES } from "@/lib/content/textes";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ modifierReglages: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/reglages", () => ops);
vi.mock("next/cache", () => cache);

import { enregistrerCoordonnees, enregistrerFaq, enregistrerReseaux, enregistrerTextes } from "./reglages";

const VERSION = "2026-10-11T10:00:00.000Z";
const NOUVELLE = "2026-10-11T11:00:00.000Z";
const coordonnees = {
  email: "contact@ademig.sn",
  presseNom: "Birama Ndoye",
  presseTelephone: "+221 77 552 52 25",
  rue: "ENSMG",
  boitePostale: "BP 5396 Dakar-Fann",
  ville: "Dakar",
  pays: "Sénégal",
};

function formulaire(champs: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await enregistrerCoordonnees(null, formulaire({ ...coordonnees, version: VERSION }))).toEqual(refus);
    expect(await enregistrerReseaux(null, formulaire({ reseaux: "[]", version: VERSION }))).toEqual(refus);
    expect(await enregistrerTextes(null, formulaire({ version: VERSION }))).toEqual(refus);
    expect(await enregistrerFaq(null, formulaire({ faq: "[]", version: VERSION }))).toEqual(refus);
    expect(ops.modifierReglages).not.toHaveBeenCalled();
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => {
    exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" });
    ops.modifierReglages.mockResolvedValue({ version: NOUVELLE });
  });

  it("enregistre les coordonnées, invalide le cache et renvoie la nouvelle version", async () => {
    const r = await enregistrerCoordonnees(null, formulaire({ ...coordonnees, version: VERSION }));
    expect(r).toEqual({ ok: true, message: "Coordonnées enregistrées.", donnees: { version: NOUVELLE } });
    expect(ops.modifierReglages).toHaveBeenCalledWith(
      {},
      { contact: expect.objectContaining({ email: "contact@ademig.sn", phone: null }) },
      { version: VERSION },
    );
    expect(cache.revalidateTag).toHaveBeenCalledWith("reglages", { expire: 0 });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/reglages");
  });

  it("une saisie invalide renvoie les erreurs par champ sans écrire", async () => {
    const r = await enregistrerCoordonnees(null, formulaire({ ...coordonnees, email: "x", version: VERSION }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erreurs?.email).toEqual(["Adresse email invalide."]);
    expect(ops.modifierReglages).not.toHaveBeenCalled();
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("sans version, demande la création de la ligne", async () => {
    await enregistrerReseaux(null, formulaire({ reseaux: "[]" }));
    expect(ops.modifierReglages).toHaveBeenCalledWith({}, { reseaux: [] }, { version: null });
  });

  it("un texte remis à l'origine n'est pas enregistré", async () => {
    const r = await enregistrerTextes(null, formulaire({ "accueil.accroche": TEXTES["accueil.accroche"].defaut, version: VERSION }));
    expect(r).toEqual({ ok: true, message: "Textes enregistrés.", donnees: { version: NOUVELLE } });
    expect(ops.modifierReglages).toHaveBeenCalledWith({}, { textes: {} }, { version: VERSION });
  });

  it("enregistre la FAQ, seule, et invalide le cache des réglages", async () => {
    const faq = [{ question: "Comment adhérer ?", reponse: "Écrivez au bureau." }];
    const r = await enregistrerFaq(null, formulaire({ faq: JSON.stringify(faq), version: VERSION }));
    expect(r).toEqual({ ok: true, message: "Questions fréquentes enregistrées.", donnees: { version: NOUVELLE } });
    expect(ops.modifierReglages).toHaveBeenCalledWith({}, { faq }, { version: VERSION });
    expect(cache.revalidateTag).toHaveBeenCalledWith("reglages", { expire: 0 });
  });

  it("un conflit de version devient un message", async () => {
    ops.modifierReglages.mockRejectedValue(new ErreurMetier(CONFLIT));
    expect(await enregistrerTextes(null, formulaire({ version: VERSION }))).toEqual({ ok: false, message: CONFLIT });
  });
});
