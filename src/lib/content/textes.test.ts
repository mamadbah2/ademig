import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLES_TEXTES, fusionnerTextes, normaliserTexte, TEXTES, textesAEnregistrer } from "./textes";

describe("catalogue des textes", () => {
  it("a des clés lisibles, des libellés uniques et des textes d'origine qui tiennent dans leur limite", () => {
    for (const cle of CLES_TEXTES) {
      const t = TEXTES[cle];
      expect(cle).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
      expect(t.defaut.length, cle).toBeLessThanOrEqual(t.max);
      expect(normaliserTexte(cle, t.defaut), cle).toBe(t.defaut);
    }
    const libelles = CLES_TEXTES.map((cle) => TEXTES[cle].libelle);
    expect(new Set(libelles).size).toBe(libelles.length);
  });

  it("range les textes de l'accueil avant ceux de L'Amicale", () => {
    const groupes = CLES_TEXTES.map((cle) => TEXTES[cle].groupe);
    expect(groupes.lastIndexOf("Accueil")).toBeLessThan(groupes.indexOf("L'Amicale"));
  });
});

describe("normaliserTexte", () => {
  it("une ligne ne garde aucun retour à la ligne", () => {
    expect(normaliserTexte("accueil.accroche", "  Les ingénieurs\n  du Sénégal ")).toBe("Les ingénieurs du Sénégal");
  });

  it("un paragraphe garde ses retours à la ligne, au format Unix", () => {
    expect(normaliserTexte("accueil.devise.agir", " Ligne 1\r\nLigne 2 ")).toBe("Ligne 1\nLigne 2");
  });
});

describe("fusionnerTextes", () => {
  it("rend le texte d'origine pour une clé absente, vide ou mal formée", () => {
    const t = fusionnerTextes({ "accueil.accroche": "   ", "amicale.intro": 42 as unknown as string });
    expect(t["accueil.accroche"]).toBe(TEXTES["accueil.accroche"].defaut);
    expect(t["amicale.intro"]).toBe(TEXTES["amicale.intro"].defaut);
    expect(t["amicale.mission1.titre"]).toBe("Soutenir l'ENSMG");
    expect(Object.keys(t)).toEqual(CLES_TEXTES);
  });

  it("rend le texte enregistré et ignore les clés inconnues", () => {
    const t = fusionnerTextes({ "accueil.accroche": "Nouveau titre", "accueil.disparu": "x" });
    expect(t["accueil.accroche"]).toBe("Nouveau titre");
    expect(Object.keys(t)).not.toContain("accueil.disparu");
  });
});

describe("textesAEnregistrer", () => {
  it("ne garde que les textes qui diffèrent du texte d'origine, nettoyés", () => {
    expect(
      textesAEnregistrer({
        "accueil.accroche": `  ${TEXTES["accueil.accroche"].defaut} `,
        "amicale.intro": "",
        "amicale.mission1.titre": "  Appuyer l'école  ",
        "accueil.devise.agir": "Ligne 1\r\nLigne 2",
      }),
    ).toEqual({ "amicale.mission1.titre": "Appuyer l'école", "accueil.devise.agir": "Ligne 1\nLigne 2" });
  });

  it("une saisie vide ou remise à l'origine vide toutes les clés", () => {
    expect(textesAEnregistrer({})).toEqual({});
  });
});

// Chaque texte du catalogue doit être lu par sa page, sinon le modifier dans l'admin n'aurait aucun effet.
const PAGES = { Accueil: "src/app/(site)/page.tsx", "L'Amicale": "src/app/(site)/amicale/page.tsx" } as const;

describe("pages du site", () => {
  it("chaque texte est lu par sa page, qui n'en garde plus de copie", () => {
    for (const cle of CLES_TEXTES) {
      const source = readFileSync(PAGES[TEXTES[cle].groupe], "utf8");
      expect(source, cle).toContain(`"${cle}"`);
      expect(source, cle).not.toContain(TEXTES[cle].defaut);
    }
  });
});
