import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { creerDbTest } from "@/test/db";
import { actualites as actualitesInitiales } from "./donnees-initiales/actualites";
import { evenements as evenementsInitiaux } from "./donnees-initiales/evenements";
import { membres as membresInitiaux } from "./donnees-initiales/membres";
import { commissions as commissionsInitiales, ordreBureau, partenaires as partenairesInitiaux } from "./donnees-initiales/organisation";
import * as t from "./schema";
import { imagesInitiales, seed } from "./seed";
import type { Db } from "./types";

async function compter(db: Db) {
  return {
    media: await db.$count(t.media),
    actualites: await db.$count(t.actualites),
    actualitePhotos: await db.$count(t.actualitePhotos),
    evenements: await db.$count(t.evenements),
    evenementPhotos: await db.$count(t.evenementPhotos),
    membres: await db.$count(t.membres),
    mandats: await db.$count(t.mandats),
    postes: await db.$count(t.postesBureau),
    commissions: await db.$count(t.commissions),
    commissionMembres: await db.$count(t.commissionMembres),
    partenaires: await db.$count(t.partenaires),
    reglages: await db.$count(t.reglages),
  };
}

describe("seed", () => {
  it("importe tout le contenu initial", async () => {
    const db = await creerDbTest();
    await seed(db);
    expect(await compter(db)).toEqual({
      media: imagesInitiales().length,
      actualites: actualitesInitiales.length,
      actualitePhotos: actualitesInitiales.reduce((n, a) => n + (a.photos?.length ?? 0), 0),
      evenements: evenementsInitiaux.length,
      evenementPhotos: evenementsInitiaux.reduce((n, e) => n + (e.photos?.length ?? 0), 0),
      membres: membresInitiaux.length,
      mandats: 1,
      postes: membresInitiaux.filter((m) => m.fonction).length,
      commissions: commissionsInitiales.length,
      commissionMembres: commissionsInitiales.reduce((n, c) => n + c.membres.length, 0),
      partenaires: partenairesInitiaux.length,
      reglages: 1,
    });
  });

  it("recense chaque image une seule fois, avec ses dimensions", () => {
    const images = imagesInitiales();
    expect(new Set(images.map((i) => i.src)).size).toBe(images.length);
    expect(images.find((i) => i.src === "/membres/ibrahima-diao.jpg")?.alt).toBe("Portrait de Dr Ibrahima Diao");
  });

  it("publie les contenus et convertit le corps en HTML", async () => {
    const db = await creerDbTest();
    await seed(db);
    const a = await db.query.actualites.findFirst({ where: eq(t.actualites.slug, actualitesInitiales[0].slug) });
    expect(a?.statut).toBe("publie");
    expect(a?.corps.startsWith("<p>")).toBe(true);
  });

  it("crée le bureau 2024 actif et marque le bureau exécutif", async () => {
    const db = await creerDbTest();
    await seed(db);
    const mandat = await db.query.mandats.findFirst({ with: { postes: { with: { membre: true } } } });
    expect(mandat?.libelle).toBe("Bureau 2024");
    expect(mandat?.actif).toBe(true);
    const executif = mandat!.postes.filter((p) => p.executif).sort((a, b) => a.ordre - b.ordre);
    expect(executif.map((p) => p.membre.slug)).toEqual(ordreBureau);
  });

  it("est idempotent", async () => {
    const db = await creerDbTest();
    await seed(db);
    const avant = await compter(db);
    await seed(db);
    expect(await compter(db)).toEqual(avant);
  });

  it("n'écrase pas une modification faite dans l'admin", async () => {
    const db = await creerDbTest();
    await seed(db);
    const slug = actualitesInitiales[0].slug;
    await db.update(t.actualites).set({ titre: "Titre corrigé" }).where(eq(t.actualites.slug, slug));
    await db.update(t.media).set({ alt: "Texte corrigé" }).where(eq(t.media.url, "/membres/ibrahima-diao.jpg"));
    await seed(db);
    expect((await db.query.actualites.findFirst({ where: eq(t.actualites.slug, slug) }))?.titre).toBe("Titre corrigé");
    expect((await db.query.media.findFirst({ where: eq(t.media.url, "/membres/ibrahima-diao.jpg") }))?.alt).toBe("Texte corrigé");
  });
});
