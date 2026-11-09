import { describe, expect, it } from "vitest";
import { analyserFichierAlumni } from "./nettoyage";

const ENTETE =
  "N°_dordre,Civilité,PRENOM (S),NOM,Promotion ordre,Promotion Année,Adressee-mail,Numéro_Téléphone,Structure_actuelle,Poste_occupé,Domaine_s_dactivité,Pays d Origine";

const lire = (...lignes: string[]) => analyserFichierAlumni([ENTETE, ...lignes].join("\n"));

describe("analyserFichierAlumni", () => {
  it("ne conserve ni l'e-mail, ni le téléphone, ni la civilité, ni le pays", () => {
    const [ligne] = lire("2,Mme,Awa,FALL,1ère,1986,awa@exemple.sn,221770000000,OT Consulting,Directrice,BTP,Niger");
    expect(ligne).toEqual({
      numero: 2,
      prenom: "Awa",
      nom: "Fall",
      promotion: 1986,
      promotionOrdre: "1re",
      structure: "OT Consulting",
      poste: "Directrice",
      domaines: ["BTP"],
      decede: false,
    });
    const texte = JSON.stringify(ligne);
    for (const prive of ["awa@exemple.sn", "221770000000", "Mme", "Niger"]) expect(texte).not.toContain(prive);
  });

  it("écarte le chômage, l'absence de poste et la recherche d'emploi", () => {
    const [a, b] = lire(
      "3,Mr,Ali,BA,30ème,2015,,,Chômage,Néant,\"Oil&Gas, Recherche d'emploi\",Sénégal",
      "4,Mr,Omar,BA,30ème,2015,,,Aucune,,Recherched'emploi,Sénégal",
    );
    expect(a).toMatchObject({ structure: null, poste: null, domaines: ["Oil & Gas"] });
    expect(b).toMatchObject({ structure: null, poste: null, domaines: [] });
  });

  it("repère une personne décédée sans publier la marque brute", () => {
    const [ligne, suivante] = lire(
      "13,Mr,Meissa (DCD),FALL (DCD),3ème,1988,,,,,,Sénégal",
      "14,Mr,Awa,FALL,3ème,1988,,,,,,Sénégal",
    );
    expect(ligne).toMatchObject({ prenom: "Meissa", nom: "Fall", decede: true });
    expect(suivante.decede).toBe(false);
  });

  it("corrige les noms et les saisies sans espaces", () => {
    const [a, b, c] = lire(
      "35,Mr,Mouhamed David,M'BAYE,6ème,1991,,,,Chefdemission,\"Mines/Géologie,hydraulique\",Sénégal",
      "449,Mme,Fatima Ezzahra,EL-KAMOUNI,38ème,2023,,,DSPConsultingSARL,DIRECTEUR GÉNÉRAL,,Maroc",
      "86,Mr,ADAMOU HILIFOU,Mounkeila,15ème,2000,,,,,,",
    );
    expect(a).toMatchObject({ nom: "M'Baye", poste: "Chef de mission", domaines: ["Mines / Géologie", "Hydraulique"] });
    expect(b).toMatchObject({ nom: "El-Kamouni", structure: "DSP Consulting SARL", poste: "Directeur général" });
    expect(c).toMatchObject({ prenom: "Adamou Hilifou", nom: "Mounkeila" });
  });

  it("n'affiche qu'une fois « Retraité » saisi en structure et en poste", () => {
    const [ligne] = lire("10,Mr,Ali,BA,3ème,1988,,,Retraité,Retraité,,Sénégal");
    expect(ligne).toMatchObject({ structure: null, poste: "Retraité" });
  });

  it("refuse un fichier dont une colonne attendue manque", () => {
    expect(() => analyserFichierAlumni("N°_dordre,NOM\n1,BA")).toThrow(/Colonne manquante/);
  });
});
