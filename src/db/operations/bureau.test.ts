import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import { lireMandatAdmin, listerMandatsAdmin } from "@/db/requetes/admin/bureau";
import { lireBureau } from "@/db/requetes/organisation";
import { commissionMembres, commissions, mandats, membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import { schemaMandat } from "@/lib/validation/bureau";
import { creerDbTest } from "@/test/db";
import { activerMandat, creerMandat, type DonneesMandat, enregistrerMandat, supprimerMandat } from "./bureau";
import { CONFLIT } from "./commun";

async function membre(db: Db, slug: string) {
  const [m] = await db.insert(membres).values({ slug, nom: slug, titre: "T", specialite: "S", resume: "R" }).returning({ id: membres.id });
  return m.id;
}

const version = async (db: Db, id: string) => (await lireMandatAdmin(db, id))!.version;
const actifs = async (db: Db) => (await db.select().from(mandats).where(eq(mandats.actif, true))).map((m) => m.libelle);

describe("bureau", () => {
  it("DonneesMandat est exactement la sortie de schemaMandat", () => {
    expectTypeOf<z.output<typeof schemaMandat>>().toExtend<DonneesMandat>();
    expectTypeOf<DonneesMandat>().toExtend<z.output<typeof schemaMandat>>();
  });


  let db: Db;
  let a: string;
  let b: string;
  let enPlace: string;

  beforeEach(async () => {
    db = await creerDbTest();
    [a, b] = [await membre(db, "awa"), await membre(db, "bineta")];
    // Mandat en place, avec un poste et deux commissions.
    ({ id: enPlace } = await creerMandat(db, { libelle: "Bureau 2024", dateElection: "2024-09-22" }, { reprendreCommissions: false }));
    await enregistrerMandat(
      db,
      enPlace,
      {
        libelle: "Bureau 2024",
        dateElection: "2024-09-22",
        postes: [{ membreId: a, fonction: "Présidente", executif: true }],
        commissions: [
          { nom: "Finances", mission: "Budget.", membres: [b] },
          { nom: "Sociale", mission: "Solidarité.", membres: [] },
        ],
      },
      { version: await version(db, enPlace) },
    );
    await activerMandat(db, enPlace);
  });

  it("crée un mandat inactif et reprend les commissions du mandat en place, sans leurs membres", async () => {
    const { id } = await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: true });
    const mandat = (await lireMandatAdmin(db, id))!;
    expect(mandat.actif).toBe(false);
    expect(mandat.commissions).toEqual([
      { nom: "Finances", mission: "Budget.", membres: [] },
      { nom: "Sociale", mission: "Solidarité.", membres: [] },
    ]);
    const sansReprise = await creerMandat(db, { libelle: "Bureau 2030", dateElection: "2030-09-20" }, { reprendreCommissions: false });
    expect((await lireMandatAdmin(db, sansReprise.id))!.commissions).toEqual([]);
  });

  it("réécrit postes et commissions dans l'ordre reçu", async () => {
    const { id } = await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: false });
    const d: DonneesMandat = {
      libelle: "Bureau 2027",
      dateElection: "2027-09-20",
      postes: [
        { membreId: b, fonction: "Présidente", executif: true },
        { membreId: a, fonction: "Trésorière", executif: false },
      ],
      commissions: [{ nom: "Communication", mission: "Presse.", membres: [a, b] }],
    };
    await enregistrerMandat(db, id, d, { version: await version(db, id) });
    expect(await lireMandatAdmin(db, id)).toMatchObject({ postes: d.postes, commissions: d.commissions });
    await enregistrerMandat(db, id, { ...d, postes: [d.postes[1]], commissions: [] }, { version: await version(db, id) });
    expect(await lireMandatAdmin(db, id)).toMatchObject({ postes: [d.postes[1]], commissions: [] });
    expect(await db.select().from(commissionMembres)).toHaveLength(1); // seule celle du mandat en place reste
  });

  it("refuse une version périmée sans rien écrire", async () => {
    const v = await version(db, enPlace);
    await enregistrerMandat(db, enPlace, { libelle: "Bureau 2024 (1)", dateElection: "2024-09-22", postes: [], commissions: [] }, { version: v });
    const erreur = await enregistrerMandat(
      db,
      enPlace,
      { libelle: "Bureau 2024 (2)", dateElection: "2024-09-22", postes: [{ membreId: b, fonction: "X", executif: false }], commissions: [] },
      { version: v },
    ).catch((e) => e);
    expect(erreur.message).toBe(CONFLIT);
    expect(await lireMandatAdmin(db, enPlace)).toMatchObject({ libelle: "Bureau 2024 (1)", postes: [] });
  });

  it("refuse un membre disparu, sans rien écrire", async () => {
    const v = await version(db, enPlace);
    const erreur = await enregistrerMandat(
      db,
      enPlace,
      { libelle: "Autre", dateElection: "2024-09-22", postes: [{ membreId: crypto.randomUUID(), fonction: "X", executif: false }], commissions: [] },
      { version: v },
    ).catch((e) => e);
    expect(erreur.message).toBe("Un membre choisi n'existe plus : rechargez la page.");
    expect(await lireMandatAdmin(db, enPlace)).toMatchObject({ libelle: "Bureau 2024", version: v });
  });

  it("active un mandat d'un coup, sans changer sa version, et le site suit", async () => {
    const { id } = await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: false });
    const d = { libelle: "Bureau 2027", dateElection: "2027-09-20", postes: [{ membreId: b, fonction: "Présidente", executif: true }], commissions: [] };
    await enregistrerMandat(db, id, d, { version: await version(db, id) });
    const avant = await version(db, id);
    await activerMandat(db, id);
    expect(await actifs(db)).toEqual(["Bureau 2027"]);
    expect(await version(db, id)).toBe(avant);
    // Le formulaire resté ouvert s'enregistre encore.
    await enregistrerMandat(db, id, { ...d, libelle: "Bureau 2027-2030" }, { version: avant });
    expect((await lireBureau(db)).executif.map((m) => m.slug)).toEqual(["bineta"]);
    await activerMandat(db, id);
    expect(await actifs(db)).toEqual(["Bureau 2027-2030"]);
  });

  it("refuse d'activer un mandat sans poste, sans rien changer", async () => {
    const { id } = await creerMandat(db, { libelle: "Vide", dateElection: "2027-09-20" }, { reprendreCommissions: true });
    await expect(activerMandat(db, id)).rejects.toThrow("Ajoutez au moins un poste et enregistrez avant d'activer ce mandat.");
    expect(await actifs(db)).toEqual(["Bureau 2024"]);
  });

  it("refuse de supprimer le mandat en place, supprime un mandat inactif avec ses postes et commissions", async () => {
    await expect(supprimerMandat(db, enPlace)).rejects.toThrow(/mandat en place/);
    const { id } = await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: true });
    await supprimerMandat(db, id);
    expect(await lireMandatAdmin(db, id)).toBeUndefined();
    expect(await db.select().from(commissions).where(eq(commissions.mandatId, id))).toHaveLength(0);
    await expect(supprimerMandat(db, id)).rejects.toThrow("Mandat introuvable.");
    await expect(activerMandat(db, id)).rejects.toThrow("Mandat introuvable.");
  });

  it("liste les mandats, le plus récent d'abord, avec leur nombre de postes", async () => {
    await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: false });
    expect((await listerMandatsAdmin(db)).map((m) => [m.libelle, m.actif, m.postes])).toEqual([
      ["Bureau 2027", false, 0],
      ["Bureau 2024", true, 1],
    ]);
    expect(await db.select().from(postesBureau)).toHaveLength(1);
  });
});
