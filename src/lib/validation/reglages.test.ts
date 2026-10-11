import { describe, expect, it } from "vitest";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import { TEXTES } from "@/lib/content/textes";
import { schemaCoordonnees, schemaReseaux, schemaTextes } from "./reglages";

const coordonnees = {
  email: " contact@ademig.sn ",
  telephone: "",
  presseNom: "Birama Ndoye",
  presseTelephone: "+221 77 552 52 25",
  rue: "ENSMG, Bâtiment BRGM, Route de l'Université",
  boitePostale: "BP 5396 Dakar-Fann",
  ville: "Dakar",
  pays: "Sénégal",
};
const champsEnErreur = (r: { error?: { issues: { path: PropertyKey[] }[] } }) => r.error!.issues.map((i) => String(i.path[0])).sort();

describe("schemaCoordonnees", () => {
  it("rend les coordonnées actuelles du site", () => {
    expect(schemaCoordonnees.parse(coordonnees)).toEqual({ contact: reglagesInitiaux.contact });
  });

  it("garde un téléphone saisi", () => {
    expect(schemaCoordonnees.parse({ ...coordonnees, telephone: " +221 33 824 00 00 " }).contact.phone).toBe("+221 33 824 00 00");
  });

  it("refuse un email invalide et un téléphone fantaisiste", () => {
    const r = schemaCoordonnees.safeParse({ ...coordonnees, email: "pas-une-adresse", telephone: "appelez-nous" });
    expect(r.success).toBe(false);
    expect(champsEnErreur(r)).toEqual(["email", "telephone"]);
  });

  it("exige le contact presse et l'adresse", () => {
    const r = schemaCoordonnees.safeParse({ ...coordonnees, presseNom: " ", pays: "" });
    expect(champsEnErreur(r)).toEqual(["pays", "presseNom"]);
  });

  it("refuse une version malformée", () => {
    expect(schemaCoordonnees.safeParse({ ...coordonnees, version: "hier" }).success).toBe(false);
  });
});

describe("schemaReseaux", () => {
  const json = (v: unknown) => JSON.stringify(v);

  it("accepte les réseaux actuels du site", () => {
    expect(schemaReseaux.parse({ reseaux: json(reglagesInitiaux.reseaux) }).reseaux).toEqual(reglagesInitiaux.reseaux);
  });

  it("refuse une adresse qui n'est pas en https, sur l'élément fautif", () => {
    for (const url of ["http://exemple.com", "javascript:alert(1)", "exemple.com"]) {
      const r = schemaReseaux.safeParse({ reseaux: json([{ label: "YouTube", url: "https://www.youtube.com/@ADEMIG-SN" }, { label: "X", url }]) });
      expect(r.success, url).toBe(false);
      expect(r.error!.issues[0].path, url).toEqual(["reseaux", 1, "url"]);
    }
  });

  it("refuse deux réseaux du même nom et un JSON illisible", () => {
    const doublon = schemaReseaux.safeParse({
      reseaux: json([
        { label: "LinkedIn", url: "https://a.sn" },
        { label: "linkedin ", url: "https://b.sn" },
      ]),
    });
    expect(doublon.error!.issues[0].message).toBe("Deux réseaux portent le même nom.");
    expect(schemaReseaux.safeParse({ reseaux: "[{" }).success).toBe(false);
  });
});

describe("schemaTextes", () => {
  it("n'enregistre que les textes modifiés", () => {
    const r = schemaTextes.parse({
      "accueil.accroche": TEXTES["accueil.accroche"].defaut,
      "amicale.intro": " Nouvelle intro ",
      version: "2026-10-11T10:00:00.000Z",
    });
    expect(r).toEqual({ version: "2026-10-11T10:00:00.000Z", textes: { "amicale.intro": "Nouvelle intro" } });
  });

  it("refuse une clé inconnue", () => {
    expect(schemaTextes.safeParse({ "accueil.inconnu": "x" }).success).toBe(false);
  });

  it("refuse un texte trop long, sur son champ", () => {
    const { max } = TEXTES["amicale.intro"];
    const r = schemaTextes.safeParse({ "amicale.intro": "x".repeat(max + 1) });
    expect(r.error!.issues[0].path).toEqual(["amicale.intro"]);
    expect(r.error!.issues[0].message).toBe(`${max} caractères au plus.`);
  });
});
