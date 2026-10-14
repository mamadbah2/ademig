import { beforeAll, describe, expect, it } from "vitest";
import { creerMembre, type DonneesCreationMembre } from "@/db/operations/membres";
import { membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { ficheDuCompte } from "./fiche-du-compte";
import { eq } from "drizzle-orm";

const base: DonneesCreationMembre = {
  nom: "Awa Ndiaye",
  slug: "awa-ndiaye",
  titre: "Géologue",
  specialite: "Géologie",
  promotion: 2015,
  numero: null,
  organisation: null,
  ville: null,
  resume: "Résumé.",
  bio: null,
  parcours: [],
  competences: [],
  realisations: [],
  liens: null,
  photoId: null,
  visible: true,
};

describe("ficheDuCompte", () => {
  let db: Db;
  beforeAll(async () => {
    db = await creerDbTest();
    await db.insert(user).values([
      { id: "u1", name: "Awa", email: "awa@ademig.test", role: "membre" },
      { id: "u2", name: "Admin", email: "admin@ademig.test", role: "editeur" },
    ]);
    const { id } = await creerMembre(db, base);
    await db.update(membres).set({ userId: "u1" }).where(eq(membres.id, id));
  });

  it("rend l'identifiant de la fiche rattachée au compte", async () => {
    const fiche = await ficheDuCompte(db, "u1");
    expect(fiche?.id).toEqual(expect.any(String));
  });

  it("rend undefined pour un compte sans fiche ou inconnu", async () => {
    expect(await ficheDuCompte(db, "u2")).toBeUndefined();
    expect(await ficheDuCompte(db, "inconnu")).toBeUndefined();
  });
});
