import { describe, expect, it } from "vitest";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import { FAQ_DEFAUT, FAQ_MAX_QUESTIONS, FAQ_MAX_REPONSE } from "@/lib/content/faq";
import { TEXTES } from "@/lib/content/textes";
import { schemaCoordonnees, schemaFaq, schemaReseaux, schemaTextes } from "./reglages";

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

describe("schemaFaq", () => {
  const json = (v: unknown) => JSON.stringify(v);

  it("accepte la FAQ d'origine telle quelle", () => {
    expect(schemaFaq.parse({ faq: json(FAQ_DEFAUT) }).faq).toEqual(FAQ_DEFAUT);
  });

  it("met la question sur une ligne et garde les paragraphes de la réponse", () => {
    const r = schemaFaq.parse({ faq: json([{ question: "  Qui\n peut  adhérer ? ", reponse: " Les diplômés.\r\nVoir les statuts. " }]) });
    expect(r.faq).toEqual([{ question: "Qui peut adhérer ?", reponse: "Les diplômés.\nVoir les statuts." }]);
  });

  it("accepte une liste vide, qui masque la section", () => {
    expect(schemaFaq.parse({ faq: "[]", version: "2026-10-11T10:00:00.000Z" })).toEqual({ faq: [], version: "2026-10-11T10:00:00.000Z" });
  });

  it("refuse une question ou une réponse vide, sur l'élément fautif", () => {
    const r = schemaFaq.safeParse({ faq: json([FAQ_DEFAUT[0], { question: "Question ?", reponse: "  " }]) });
    expect(r.error!.issues[0].path).toEqual(["faq", 1, "reponse"]);
    expect(schemaFaq.safeParse({ faq: json([{ question: "", reponse: "Réponse" }]) }).success).toBe(false);
  });

  it("refuse une réponse trop longue, trop de questions, un doublon et un JSON illisible", () => {
    const longue = schemaFaq.safeParse({ faq: json([{ question: "Q ?", reponse: "x".repeat(FAQ_MAX_REPONSE + 1) }]) });
    expect(longue.error!.issues[0].message).toBe(`${FAQ_MAX_REPONSE} caractères au plus.`);
    const trop = Array.from({ length: FAQ_MAX_QUESTIONS + 1 }, (_, i) => ({ question: `Q${i} ?`, reponse: "R" }));
    expect(schemaFaq.safeParse({ faq: json(trop) }).success).toBe(false);
    const doublon = schemaFaq.safeParse({ faq: json([{ question: "Qui ?", reponse: "A" }, { question: "qui ?", reponse: "B" }]) });
    expect(doublon.error!.issues[0].message).toBe("Deux questions sont identiques.");
    expect(schemaFaq.safeParse({ faq: "[{" }).success).toBe(false);
  });

  it("refuse une version malformée", () => {
    expect(schemaFaq.safeParse({ faq: "[]", version: "hier" }).success).toBe(false);
  });
});
