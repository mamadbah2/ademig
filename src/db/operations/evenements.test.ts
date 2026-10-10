import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { evenementPhotos, evenements } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { CONFLIT } from "./commun";
import { ErreurMetier } from "./erreurs";
import { creerEvenement, type DonneesEvenement, modifierEvenement, supprimerEvenement } from "./evenements";
import { creerMedia } from "./media";

const base: DonneesEvenement = {
  titre: "Journée du contenu local",
  slug: "journee-contenu-local",
  debut: new Date("2026-09-12T09:00:00.000Z"),
  fin: null,
  lieuNom: "Hôtel Pullman Teranga",
  lieuVille: "Dakar",
  theme: null,
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  partenaires: ["CORICA"],
  videos: [],
  afficheId: null,
  photos: [],
};

async function image(db: Db, n: number) {
  const m = await creerMedia(
    db,
    { url: `/images/ev-${n}.webp`, pathname: null, alt: `Image ${n}`, credit: null, width: 10, height: 10, mime: "image/webp", taille: null },
    null,
  );
  return m.id;
}

const lire = async (db: Db, id: string) => (await db.query.evenements.findFirst({ where: eq(evenements.id, id) }))!;
const version = async (db: Db, id: string) => (await lire(db, id)).majLe.toISOString();

describe("événements", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("crée un brouillon avec son affiche et ses partenaires", async () => {
    const affiche = await image(db, 1);
    const { id } = await creerEvenement(db, { ...base, afficheId: affiche }, "enregistrer");
    expect(await lire(db, id)).toMatchObject({ statut: "brouillon", publieLe: null, afficheId: affiche, partenaires: ["CORICA"] });
  });

  it("refuse un lien déjà pris, sur le champ slug", async () => {
    await creerEvenement(db, base, "enregistrer");
    const erreur = await creerEvenement(db, { ...base, titre: "Autre" }, "enregistrer").catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("slug");
  });

  it("publie, dépublie et garde la date de première publication", async () => {
    const { id } = await creerEvenement(db, base, "publier");
    const premiere = (await lire(db, id)).publieLe;
    await modifierEvenement(db, id, base, { version: await version(db, id), intention: "depublier", modifierSlug: false });
    expect(await lire(db, id)).toMatchObject({ statut: "brouillon", publieLe: premiere });
  });

  it("refuse une version périmée sans rien écrire, photos comprises", async () => {
    const photo = await image(db, 2);
    const { id } = await creerEvenement(db, base, "enregistrer");
    const v = await version(db, id);
    await modifierEvenement(db, id, { ...base, titre: "Premier" }, { version: v, intention: "enregistrer", modifierSlug: false });
    const erreur = await modifierEvenement(db, id, { ...base, titre: "Second", photos: [photo] }, { version: v, intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur.message).toBe(CONFLIT);
    expect((await lire(db, id)).titre).toBe("Premier");
    expect(await db.select().from(evenementPhotos).where(eq(evenementPhotos.evenementId, id))).toHaveLength(0);
  });

  it("verrouille le lien d'un événement publié", async () => {
    const { id } = await creerEvenement(db, base, "publier");
    const v = await version(db, id);
    const erreur = await modifierEvenement(db, id, { ...base, slug: "autre" }, { version: v, intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur.champ).toBe("slug");
    await modifierEvenement(db, id, { ...base, slug: "autre" }, { version: v, intention: "enregistrer", modifierSlug: true });
    expect((await lire(db, id)).slug).toBe("autre");
  });

  it("réécrit les photos dans l'ordre et enregistre la fin", async () => {
    const [a, b] = [await image(db, 3), await image(db, 4)];
    const { id } = await creerEvenement(db, { ...base, photos: [a, b] }, "enregistrer");
    const fin = new Date("2026-09-12T18:00:00.000Z");
    await modifierEvenement(db, id, { ...base, fin, photos: [b, a] }, { version: await version(db, id), intention: "enregistrer", modifierSlug: false });
    const photos = await db.select().from(evenementPhotos).where(eq(evenementPhotos.evenementId, id)).orderBy(evenementPhotos.ordre);
    expect(photos.map((p) => p.mediaId)).toEqual([b, a]);
    expect((await lire(db, id)).fin).toEqual(fin);
  });

  it("supprime l'événement et ses liaisons, pas les images", async () => {
    const affiche = await image(db, 5);
    const { id } = await creerEvenement(db, { ...base, afficheId: affiche, photos: [affiche] }, "enregistrer");
    await supprimerEvenement(db, id);
    expect(await db.select().from(evenementPhotos).where(eq(evenementPhotos.evenementId, id))).toHaveLength(0);
    expect(await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, affiche) })).toBeDefined();
    await expect(supprimerEvenement(db, id)).rejects.toThrow("Événement introuvable.");
  });
});
