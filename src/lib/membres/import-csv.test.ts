import { describe, expect, it } from "vitest";
import { ErreurMetier } from "@/db/operations/erreurs";
import { analyserCsv } from "./import-csv";

describe("analyserCsv", () => {
  it("lit le format Excel français (BOM, point-virgule, guillemets, CRLF)", () => {
    const csv = "﻿Nom;Prénom;Email;Téléphone;Promotion;Spécialité\r\nNdiaye;Awa;AWA@Example.org ;77 123 45 67;2015;\"Mines; carrières\"\r\n";
    expect(analyserCsv(csv)).toEqual({
      valides: [{ ligne: 2, nom: "Ndiaye", prenom: "Awa", email: "awa@example.org", telephone: "77 123 45 67", promotion: 2015, specialite: "Mines; carrières" }],
      problemes: [],
    });
  });
  it("accepte la virgule et des colonnes facultatives absentes", () => {
    const r = analyserCsv("nom,prenom,email\nSow,Ali,ali@ex.org\n");
    expect(r.valides[0]).toMatchObject({ nom: "Sow", telephone: null, promotion: null, specialite: null });
  });
  it("signale email invalide, champ manquant, promotion absurde et doublon dans le fichier", () => {
    const csv = "nom;prenom;email;promotion\nA;B;pas-un-email;\n;C;c@ex.org;\nD;E;d@ex.org;1850\nF;G;f@ex.org;\nH;I;F@EX.ORG;\n";
    const r = analyserCsv(csv);
    expect(r.valides.map((l) => l.email)).toEqual(["f@ex.org"]);
    expect(r.problemes).toEqual([
      { ligne: 2, message: "Email invalide : « pas-un-email »." },
      { ligne: 3, message: "Nom manquant." },
      { ligne: 4, message: "Promotion invalide : « 1850 »." },
      { ligne: 6, message: "Email en double dans le fichier (déjà ligne 5)." },
    ]);
  });
  it("ignore les lignes vides", () => {
    expect(analyserCsv("nom;prenom;email\n\n;;\nA;B;a@ex.org\n").valides).toHaveLength(1);
  });
  it("gère les guillemets doublés et les alias d'en-têtes", () => {
    const r = analyserCsv("Nom;Prénom;Mail;Tel;Promo\n\"O\"\"Neil\";Jo;jo@ex.org;77;2020\n");
    expect(r.valides[0]).toMatchObject({ nom: "O\"Neil", telephone: null, promotion: 2020 });
  });
  it("ramène le téléphone à la règle du profil, ou null s'il ne la respecte pas", () => {
    const csv = "nom;prenom;email;telephone\nA;B;a@ex.org;+221 77-123.45.67\nC;D;c@ex.org;(+221) 77 123 45 67\nE;F;e@ex.org;7,71E+08\nG;H;g@ex.org;123\n";
    expect(analyserCsv(csv).valides.map((l) => l.telephone)).toEqual(["+221 77 123 45 67", null, null, null]);
  });
  it("refuse un fichier sans les colonnes obligatoires", () => {
    expect(() => analyserCsv("name;mail\nA;a@ex.org")).toThrow(ErreurMetier);
  });
  it("refuse un fichier mal décodé (pas en UTF-8)", () => {
    expect(() => analyserCsv("nom;prenom;email\nNd�aye;A;a@ex.org")).toThrow(/CSV UTF-8/);
  });
  it("refuse plus de 2000 lignes", () => {
    const csv = "nom;prenom;email\n" + Array.from({ length: 2001 }, (_, i) => `N${i};P;m${i}@ex.org`).join("\n");
    expect(() => analyserCsv(csv)).toThrow(/2000/);
  });
});
