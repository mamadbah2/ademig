import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { actualitePhotos, actualites } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { creerActualite, type DonneesActualite, modifierActualite, supprimerActualite } from "./actualites";
import { CONFLIT } from "./commun";
import { ErreurMetier } from "./erreurs";
import { creerMedia } from "./media";

const base: DonneesActualite = {
  titre: "Forum de recrutement",
  slug: "forum-de-recrutement",
  date: "2025-11-20",
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  sources: [{ label: "APS", url: "https://aps.sn/" }],
  videos: [],
  photos: [],
};

async function image(db: Db, n: number) {
  const m = await creerMedia(
    db,
    { url: `/images/test-${n}.webp`, pathname: null, alt: `Image ${n}`, credit: null, width: 10, height: 10, mime: "image/webp", taille: null },
    null,
  );
  return m.id;
}

async function lire(db: Db, id: string) {
  return (await db.query.actualites.findFirst({ where: eq(actualites.id, id) }))!;
}

// Version telle que le formulaire la renvoie : à la milliseconde.
const versionDe = (d: Date) => d.toISOString();

describe("actualités", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("crée un brouillon sans date de publication", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    const a = await lire(db, id);
    expect(a).toMatchObject({ statut: "brouillon", publieLe: null, slug: "forum-de-recrutement" });
  });

  it("crée et publie d'un coup", async () => {
    const { id } = await creerActualite(db, base, "publier");
    const a = await lire(db, id);
    expect(a.statut).toBe("publie");
    expect(a.publieLe).toBeInstanceOf(Date);
  });

  it("refuse un slug déjà pris, sur le champ slug", async () => {
    await creerActualite(db, base, "enregistrer");
    const erreur = await creerActualite(db, { ...base, titre: "Autre" }, "enregistrer").catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("slug");
  });

  it("accepte la version lue juste après la création (maj_le à la microseconde en base)", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    const version = versionDe((await lire(db, id)).majLe);
    const r = await modifierActualite(db, id, { ...base, titre: "Nouveau titre" }, { version, intention: "enregistrer", modifierSlug: false });
    expect((await lire(db, id)).titre).toBe("Nouveau titre");
    expect(r.version).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("refuse une version périmée sans rien écrire", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    const version = versionDe((await lire(db, id)).majLe);
    await modifierActualite(db, id, { ...base, titre: "Premier" }, { version, intention: "enregistrer", modifierSlug: false });
    const erreur = await modifierActualite(db, id, { ...base, titre: "Second" }, { version, intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.message).toBe(CONFLIT);
    expect((await lire(db, id)).titre).toBe("Premier");
  });

  it("publie, dépublie et garde la date de première publication", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    let v = (await modifierActualite(db, id, base, { version: versionDe((await lire(db, id)).majLe), intention: "publier", modifierSlug: false })).version;
    const premiere = (await lire(db, id)).publieLe;
    expect(premiere).toBeInstanceOf(Date);
    v = (await modifierActualite(db, id, base, { version: v, intention: "depublier", modifierSlug: false })).version;
    expect(await lire(db, id)).toMatchObject({ statut: "brouillon", publieLe: premiere });
    await modifierActualite(db, id, base, { version: v, intention: "publier", modifierSlug: false });
    expect((await lire(db, id)).publieLe).toEqual(premiere);
  });

  it("garde le statut quand on enregistre simplement", async () => {
    const { id } = await creerActualite(db, base, "publier");
    await modifierActualite(db, id, { ...base, resume: "Autre" }, { version: versionDe((await lire(db, id)).majLe), intention: "enregistrer", modifierSlug: false });
    expect((await lire(db, id)).statut).toBe("publie");
  });

  it("change librement le slug d'un brouillon jamais publié", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    await modifierActualite(db, id, { ...base, slug: "nouveau-lien" }, { version: versionDe((await lire(db, id)).majLe), intention: "enregistrer", modifierSlug: false });
    expect((await lire(db, id)).slug).toBe("nouveau-lien");
  });

  it("refuse de changer le slug d'une actualité déjà publiée sans déverrouillage", async () => {
    const { id } = await creerActualite(db, base, "publier");
    const version = versionDe((await lire(db, id)).majLe);
    const erreur = await modifierActualite(db, id, { ...base, slug: "nouveau-lien" }, { version, intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("slug");
    await modifierActualite(db, id, { ...base, slug: "nouveau-lien" }, { version, intention: "enregistrer", modifierSlug: true });
    expect((await lire(db, id)).slug).toBe("nouveau-lien");
  });

  it("refuse un slug pris par une autre actualité lors d'une modification", async () => {
    await creerActualite(db, { ...base, slug: "deja-pris" }, "enregistrer");
    const { id } = await creerActualite(db, base, "enregistrer");
    const erreur = await modifierActualite(db, id, { ...base, slug: "deja-pris" }, { version: versionDe((await lire(db, id)).majLe), intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur.champ).toBe("slug");
  });

  it("réécrit les photos dans l'ordre donné", async () => {
    const [a, b, c] = [await image(db, 1), await image(db, 2), await image(db, 3)];
    const { id } = await creerActualite(db, { ...base, photos: [a, b] }, "enregistrer");
    await modifierActualite(db, id, { ...base, photos: [c, a] }, { version: versionDe((await lire(db, id)).majLe), intention: "enregistrer", modifierSlug: false });
    const photos = await db.select().from(actualitePhotos).where(eq(actualitePhotos.actualiteId, id)).orderBy(actualitePhotos.ordre);
    expect(photos.map((p) => [p.mediaId, p.ordre])).toEqual([[c, 0], [a, 1]]);
  });

  it("signale une actualité introuvable", async () => {
    const erreur = await modifierActualite(db, crypto.randomUUID(), base, { version: new Date().toISOString(), intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.message).toBe("Actualité introuvable.");
  });

  it("supprime l'actualité et ses liaisons, pas les images", async () => {
    const img = await image(db, 1);
    const { id } = await creerActualite(db, { ...base, photos: [img] }, "enregistrer");
    await supprimerActualite(db, id);
    expect(await db.query.actualites.findFirst({ where: eq(actualites.id, id) })).toBeUndefined();
    expect(await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, img) })).toBeDefined();
    await expect(supprimerActualite(db, id)).rejects.toThrow("Actualité introuvable.");
  });
});
