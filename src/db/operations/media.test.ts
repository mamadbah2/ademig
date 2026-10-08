import { describe, expect, it } from "vitest";
import { photos } from "@/db/donnees-initiales/photos";
import { seed } from "@/db/seed";
import { creerDbTest } from "@/test/db";
import { ErreurMetier } from "./erreurs";
import { creerMedia, lireMedia, listerMedias, mediaExiste, modifierMedia, supprimerMedia, usagesMedia } from "./media";

const nouveau = {
  url: "https://abc123.public.blob.vercel-storage.com/medias/visite-x1.webp",
  pathname: "medias/visite-x1.webp",
  alt: "Visite du chantier de Ndayane",
  credit: "ADEMIG",
  width: 2000,
  height: 1333,
  mime: "image/webp",
  taille: 280_000,
};

describe("médiathèque", () => {
  it("ajoute une image et la place en tête de liste", async () => {
    const db = await creerDbTest();
    await seed(db);
    const m = await creerMedia(db, nouveau, null);
    expect((await listerMedias(db))[0].id).toBe(m.id);
  });

  it("recherche dans le texte alternatif et le crédit, sans tenir compte de la casse", async () => {
    const db = await creerDbTest();
    await creerMedia(db, nouveau, null);
    expect(await listerMedias(db, "NDAYANE")).toHaveLength(1);
    expect(await listerMedias(db, "ademig")).toHaveLength(1);
    expect(await listerMedias(db, "pétrole")).toHaveLength(0);
    // Les caractères spéciaux de LIKE sont pris au pied de la lettre.
    expect(await listerMedias(db, "%")).toHaveLength(0);
  });

  it("modifie le texte alternatif et le crédit", async () => {
    const db = await creerDbTest();
    const m = await creerMedia(db, nouveau, null);
    await modifierMedia(db, m.id, { alt: "Nouvelle description", credit: null });
    expect(await lireMedia(db, m.id)).toMatchObject({ alt: "Nouvelle description", credit: null });
    await expect(modifierMedia(db, crypto.randomUUID(), { alt: "x x x", credit: null })).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("liste les contenus qui utilisent une image", async () => {
    const db = await creerDbTest();
    await seed(db);
    const image = (await listerMedias(db)).find((m) => m.url === photos.journeeOfficiels.src)!;
    const usages = await usagesMedia(db, image.id);
    expect(usages.map((u) => u.lien)).toEqual(
      expect.arrayContaining([
        "/actualites/journee-nationale-contenu-local-2026",
        "/evenements/journee-nationale-contenu-local-2026",
      ]),
    );
    const portrait = (await listerMedias(db)).find((m) => m.url === "/membres/ibrahima-diao.jpg")!;
    expect(await usagesMedia(db, portrait.id)).toEqual([{ libelle: "Fiche de Dr Ibrahima Diao", lien: "/membres/ibrahima-diao" }]);
  });

  it("refuse de supprimer une image utilisée", async () => {
    const db = await creerDbTest();
    await seed(db);
    const portrait = (await listerMedias(db)).find((m) => m.url === "/membres/ibrahima-diao.jpg")!;
    await expect(supprimerMedia(db, portrait.id)).rejects.toThrow("Image utilisée par 1 contenu : retirez-la d'abord.");
  });

  it("supprime une image inutilisée et renvoie son chemin Blob", async () => {
    const db = await creerDbTest();
    const m = await creerMedia(db, nouveau, null);
    expect(await supprimerMedia(db, m.id)).toEqual({ url: nouveau.url, pathname: nouveau.pathname });
    expect(await lireMedia(db, m.id)).toBeUndefined();
  });

  it("indique si une adresse appartient déjà à une image", async () => {
    const db = await creerDbTest();
    await creerMedia(db, nouveau, null);
    expect(await mediaExiste(db, nouveau.url)).toBe(true);
    expect(await mediaExiste(db, "https://abc123.public.blob.vercel-storage.com/medias/autre.webp")).toBe(false);
  });
});
