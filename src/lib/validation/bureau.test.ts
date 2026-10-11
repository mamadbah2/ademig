import type { z } from "zod";
import { describe, expect, it } from "vitest";
import { erreursDe } from "@/lib/admin/resultat";
import { schemaEnvoiMandat, schemaMandat, schemaNouveauMandat } from "./bureau";

// Resultat<never> est une union : on n'en garde que les erreurs de champ.
const erreursPar = (e: z.ZodError) => {
  const r = erreursDe(e);
  return r.ok ? undefined : r.erreurs;
};

const A = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";
const B = "0b6a2a5e-3c1d-4f2e-8a9b-1c2d3e4f5a6b";

const valide = {
  libelle: " Bureau 2027 ",
  dateElection: "2027-09-20",
  postes: JSON.stringify([
    { membreId: A, fonction: "Président", executif: true },
    { membreId: B, fonction: " Trésorière ", executif: false },
  ]),
  commissions: JSON.stringify([{ nom: "Finances", mission: "Budget.", membres: [{ membreId: B }, { membreId: A }] }]),
};

describe("schemaMandat", () => {
  it("lit un mandat complet, dans l'ordre saisi", () => {
    expect(schemaMandat.parse(valide)).toEqual({
      libelle: "Bureau 2027",
      dateElection: "2027-09-20",
      postes: [
        { membreId: A, fonction: "Président", executif: true },
        { membreId: B, fonction: "Trésorière", executif: false },
      ],
      commissions: [{ nom: "Finances", mission: "Budget.", membres: [B, A] }],
    });
  });

  it("accepte un mandat encore vide", () => {
    expect(schemaMandat.parse({ libelle: "Bureau 2027", dateElection: "2027-09-20" })).toMatchObject({ postes: [], commissions: [] });
  });

  it("refuse un membre à deux postes", () => {
    const postes = JSON.stringify([
      { membreId: A, fonction: "Président", executif: true },
      { membreId: A, fonction: "Trésorier", executif: false },
    ]);
    const r = schemaMandat.safeParse({ ...valide, postes });
    expect(erreursPar(r.error!)).toEqual({ postes: ["Un membre n'occupe qu'un poste par mandat."] });
  });

  it("dit quel poste corriger", () => {
    const postes = JSON.stringify([
      { membreId: A, fonction: "Président", executif: true },
      { membreId: "", fonction: "Trésorier", executif: false },
    ]);
    const r = schemaMandat.safeParse({ ...valide, postes });
    expect(erreursPar(r.error!)).toEqual({ postes: ["Élément 2 : Choisissez un membre."] });
  });

  it("refuse un membre deux fois dans une commission, et deux commissions du même nom", () => {
    const doublonMembre = JSON.stringify([{ nom: "Finances", mission: "x", membres: [{ membreId: A }, { membreId: A }] }]);
    expect(schemaMandat.safeParse({ ...valide, commissions: doublonMembre }).success).toBe(false);
    const doublonNom = JSON.stringify([
      { nom: "Finances", mission: "x", membres: [] },
      { nom: "finances ", mission: "y", membres: [] },
    ]);
    const r = schemaMandat.safeParse({ ...valide, commissions: doublonNom });
    expect(erreursPar(r.error!)).toEqual({ commissions: ["Deux commissions portent le même nom."] });
  });

  it.each([
    ["libelle", { libelle: " " }],
    ["dateElection", { dateElection: "22/09/2024" }],
    ["postes", { postes: '[{"membreId":"x","fonction":"","executif":false}]' }],
    ["commissions", { commissions: '[{"nom":"","mission":"x","membres":[]}]' }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaMandat.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });

  it("refuse une version malformée", () => {
    expect(schemaEnvoiMandat.safeParse({ ...valide, version: "hier" }).success).toBe(false);
  });
});

describe("schemaNouveauMandat", () => {
  it("lit la case de reprise des commissions", () => {
    expect(schemaNouveauMandat.parse({ libelle: "Bureau 2027", dateElection: "2027-09-20", reprendreCommissions: "on" })).toEqual({
      libelle: "Bureau 2027",
      dateElection: "2027-09-20",
      reprendreCommissions: true,
    });
    expect(schemaNouveauMandat.parse({ libelle: "Bureau 2027", dateElection: "2027-09-20" }).reprendreCommissions).toBe(false);
  });
});
