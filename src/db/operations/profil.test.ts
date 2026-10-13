import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { media, membres } from "@/db/schema";
import type { Db } from "@/db/types";
import { schemaProfil } from "@/lib/membres/profil";
import { creerDbTest } from "@/test/db";
import { creerCompte } from "./comptes";
import { ErreurMetier } from "./erreurs";
import { lireProfil, modifierProfil } from "./profil";

async function fiche(db: Db, n: number, extra: Partial<typeof membres.$inferInsert> = {}) {
  const { id: userId } = await creerCompte(db, { nom: `Membre ${n}`, email: `e2e-${n}@ademig.test`, role: "membre" });
  const [m] = await db
    .insert(membres)
    .values({ slug: `membre-${n}`, nom: `Membre ${n}`, titre: "T", specialite: "S", resume: "R", userId, ...extra })
    .returning();
  return { userId, membreId: m.id };
}

const saisie = (champs: Record<string, string> = {}) =>
  schemaProfil.parse({ resume: "Nouvelle présentation.", specialite: "Géologie", visibilite: "publique", ...champs });

const photo = (n: number) => ({
  photoUrl: `https://x.public.blob.vercel-storage.com/membres/p${n}.webp`,
  photoPathname: `membres/p${n}.webp`,
  photoLargeur: "800",
  photoHauteur: "800",
});

const lire = async (db: Db, id: string) => (await db.select().from(membres).where(eq(membres.id, id)))[0];

describe("modifierProfil", () => {
  it("ne modifie que la fiche du compte, jamais celle d'un autre", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1);
    const b = await fiche(db, 2);
    const avant = await lire(db, b.membreId);
    await modifierProfil(db, a.userId, saisie({ ville: "Dakar", telephone: "771234567", ...photo(1) }));
    expect(await lire(db, b.membreId)).toEqual(avant);
    expect(await lire(db, a.membreId)).toMatchObject({ resume: "Nouvelle présentation.", ville: "Dakar", telephone: "771234567" });
  });

  it("refuse un compte sans fiche", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, { nom: "Sans fiche", email: "e2e-sf@ademig.test", role: "membre" });
    await expect(modifierProfil(db, id, saisie())).rejects.toThrow(ErreurMetier);
  });

  it("convertit la visibilité en deux colonnes", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1);
    await modifierProfil(db, a.userId, saisie({ visibilite: "membres" }));
    expect(await lire(db, a.membreId)).toMatchObject({ visible: false, annuaire: true });
    await modifierProfil(db, a.userId, saisie({ visibilite: "masquee" }));
    expect(await lire(db, a.membreId)).toMatchObject({ visible: false, annuaire: false });
    await modifierProfil(db, a.userId, saisie({ visibilite: "publique" }));
    expect(await lire(db, a.membreId)).toMatchObject({ visible: true, annuaire: true });
  });

  it("crée la ligne media de la photo et la rattache", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1);
    const r = await modifierProfil(db, a.userId, saisie(photo(1)));
    expect(r).toEqual({ photoRemplacee: null });
    const m = await lire(db, a.membreId);
    const [ligne] = await db.select().from(media).where(eq(media.id, m.photoId!));
    expect(ligne).toMatchObject({ alt: "Portrait de Membre 1", pathname: "membres/p1.webp", width: 800, height: 800, creePar: a.userId });
  });

  it("sans nouvelle photo, garde l'actuelle", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1);
    await modifierProfil(db, a.userId, saisie(photo(1)));
    const avant = (await lire(db, a.membreId)).photoId;
    await modifierProfil(db, a.userId, saisie());
    expect((await lire(db, a.membreId)).photoId).toBe(avant);
  });

  it("une nouvelle photo remplace l'ancienne, dont la ligne media est supprimée", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1);
    await modifierProfil(db, a.userId, saisie(photo(1)));
    const ancienne = (await lire(db, a.membreId)).photoId!;
    const r = await modifierProfil(db, a.userId, saisie(photo(2)));
    expect(r).toEqual({ photoRemplacee: { url: photo(1).photoUrl, pathname: "membres/p1.webp" } });
    expect(await db.select().from(media).where(eq(media.id, ancienne))).toHaveLength(0);
    expect((await lire(db, a.membreId)).photoId).not.toBe(ancienne);
  });

  it("garde l'ancienne photo si une autre fiche l'utilise encore", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1);
    await modifierProfil(db, a.userId, saisie(photo(1)));
    const ancienne = (await lire(db, a.membreId)).photoId!;
    await fiche(db, 2, { photoId: ancienne });
    const r = await modifierProfil(db, a.userId, saisie(photo(2)));
    expect(r).toEqual({ photoRemplacee: null });
    expect(await db.select().from(media).where(eq(media.id, ancienne))).toHaveLength(1);
  });

  it("ne modifie que le lien LinkedIn et garde email et site", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1, { liens: { email: "a@b.sn", site: "https://a.sn", linkedin: "https://linkedin.com/in/ancien" } });
    await modifierProfil(db, a.userId, saisie({ linkedin: "https://www.linkedin.com/in/nouveau" }));
    expect((await lire(db, a.membreId)).liens).toEqual({ email: "a@b.sn", site: "https://a.sn", linkedin: "https://www.linkedin.com/in/nouveau" });
    await modifierProfil(db, a.userId, saisie());
    expect((await lire(db, a.membreId)).liens).toEqual({ email: "a@b.sn", site: "https://a.sn" });
  });

  it("laisse liens à null quand il ne reste rien", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1, { liens: { linkedin: "https://linkedin.com/in/x" } });
    await modifierProfil(db, a.userId, saisie());
    expect((await lire(db, a.membreId)).liens).toBeNull();
  });
});

describe("lireProfil", () => {
  it("renvoie la fiche du compte avec sa photo", async () => {
    const db = await creerDbTest();
    const a = await fiche(db, 1, { numeroMembre: 7, promotion: 2008, liens: { linkedin: "https://linkedin.com/in/x" }, visible: false, annuaire: true });
    await fiche(db, 2);
    await modifierProfil(db, a.userId, saisie({ ...photo(1), promotion: "2008", linkedin: "https://linkedin.com/in/x", visibilite: "membres" }));
    expect(await lireProfil(db, a.userId)).toEqual({
      membreId: a.membreId,
      nom: "Membre 1",
      email: "e2e-1@ademig.test",
      numeroMembre: 7,
      photo: photo(1).photoUrl,
      resume: "Nouvelle présentation.",
      linkedin: "https://linkedin.com/in/x",
      promotion: "2008",
      specialite: "Géologie",
      organisation: "",
      ville: "",
      telephone: "",
      visibilite: "membres",
      slug: "membre-1",
    });
  });

  it("renvoie undefined sans fiche", async () => {
    const db = await creerDbTest();
    expect(await lireProfil(db, "inconnu")).toBeUndefined();
  });
});
