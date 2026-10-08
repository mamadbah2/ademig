import { describe, expect, it } from "vitest";
import { creerDbTest } from "@/test/db";
import { mandats, media, reglages, user } from "./schema";

describe("schéma de la base", () => {
  it("applique les migrations sur une base vide", async () => {
    const db = await creerDbTest();
    await db.insert(user).values({ id: "u1", name: "Awa", email: "awa@exemple.sn" });
    const [u] = await db.select().from(user);
    expect(u.role).toBe("editeur");
    expect(u.actif).toBe(true);
  });

  it("enregistre un média et refuse deux médias avec la même URL", async () => {
    const db = await creerDbTest();
    const valeurs = { url: "/hero/mine-strates.jpg", alt: "Une mine", width: 10, height: 10, mime: "image/jpeg" };
    await db.insert(media).values(valeurs);
    await expect(db.insert(media).values(valeurs)).rejects.toThrow();
  });

  it("n'autorise qu'un seul mandat actif", async () => {
    const db = await creerDbTest();
    await db.insert(mandats).values({ libelle: "Bureau 2024", dateElection: "2024-09-22", actif: true });
    await db.insert(mandats).values({ libelle: "Bureau 2021", dateElection: "2021-09-19", actif: false });
    await expect(
      db.insert(mandats).values({ libelle: "Bureau 2027", dateElection: "2027-09-20", actif: true }),
    ).rejects.toThrow();
  });

  it("donne des valeurs par défaut aux réglages", async () => {
    const db = await creerDbTest();
    await db.insert(reglages).values({
      contact: {
        email: "a@b.sn",
        phone: null,
        press: { name: "X", phone: "1" },
        address: { street: "s", postalBox: "b", city: "Dakar", country: "Sénégal" },
      },
    });
    const [r] = await db.select().from(reglages);
    expect(r.id).toBe(1);
    expect(r.reseaux).toEqual([]);
    expect(r.textes).toEqual({});
  });
});
