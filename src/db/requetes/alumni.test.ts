import { describe, expect, it } from "vitest";
import { remplacerAlumni } from "@/db/operations/alumni";
import { alumni, membres } from "@/db/schema";
import type { LigneAlumni } from "@/lib/alumni/nettoyage";
import { creerDbTest } from "@/test/db";
import { listerAlumni } from "./alumni";

const ligne = (numero: number, nom: string, promotion: number): LigneAlumni => ({
  numero,
  prenom: "Awa",
  nom,
  promotion,
  promotionOrdre: "1re",
  structure: null,
  poste: null,
  domaines: [],
  decede: false,
});

describe("alumni", () => {
  it("trie par promotion récente puis par nom, et écarte ceux qui ont une fiche membre", async () => {
    const db = await creerDbTest();
    await remplacerAlumni(db, [ligne(1, "Fall", 1986), ligne(2, "Sow", 2020), ligne(3, "Ba", 2020), ligne(4, "Diao", 2006)]);
    await db.insert(membres).values({ slug: "diao", nom: "Dr Diao", titre: "", specialite: "", resume: "", numero: 4 });
    expect((await listerAlumni(db)).map((a) => a.numero)).toEqual([3, 2, 1]);
  });

  it("met à jour par numéro et retire les lignes absentes du nouveau fichier", async () => {
    const db = await creerDbTest();
    await remplacerAlumni(db, [ligne(1, "Fall", 1986), ligne(2, "Sow", 2020)]);
    await remplacerAlumni(db, [{ ...ligne(1, "Fall", 1986), poste: "Géologue" }]);
    const lignes = await db.select().from(alumni);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ numero: 1, poste: "Géologue" });
  });

  it("refuse un import vide, qui viderait la liste", async () => {
    const db = await creerDbTest();
    await expect(remplacerAlumni(db, [])).rejects.toThrow(/aucune ligne/);
  });
});
