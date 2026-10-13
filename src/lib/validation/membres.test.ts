import { describe, expect, it } from "vitest";
import { membres as membresInitiaux } from "@/db/donnees-initiales/membres";
import { paragraphesEnHtml } from "@/lib/html";
import { schemaEnvoiMembre, schemaMembre } from "./membres";

const valide = {
  nom: " Dr Ibrahima Diao ",
  slug: "ibrahima-diao",
  titre: "Chef de mission",
  specialite: "Géologie",
  promotion: "2006",
  numero: "173",
  organisation: "CACO",
  ville: "",
  resume: "Président de l'ADEMIG.",
  bio: "<p>Bio <strong>riche</strong><script>alert(1)</script></p>",
  parcours: '[{"periode":"2006","poste":"Ingénieur diplômé","organisation":"IST","description":""}]',
  competences: '[{"nom":"Géologie"},{"nom":" Contenu local "}]',
  realisations: "[]",
  lienLinkedin: "",
  lienEmail: "diao@example.org",
  lienSite: "",
  photoId: "",
  visible: "on",
};

describe("schemaMembre", () => {
  it("lit un formulaire complet et nettoie la biographie", () => {
    expect(schemaMembre.parse(valide)).toEqual({
      nom: "Dr Ibrahima Diao",
      slug: "ibrahima-diao",
      titre: "Chef de mission",
      specialite: "Géologie",
      promotion: 2006,
      numero: 173,
      organisation: "CACO",
      ville: null,
      resume: "Président de l'ADEMIG.",
      bio: "<p>Bio <strong>riche</strong></p>",
      parcours: [{ periode: "2006", poste: "Ingénieur diplômé", organisation: "IST" }],
      competences: ["Géologie", "Contenu local"],
      realisations: [],
      liens: { email: "diao@example.org" },
      photoId: null,
      visible: true,
    });
  });

  it("accepte les membres actuels du site", () => {
    for (const m of membresInitiaux) {
      const r = schemaMembre.safeParse({
        nom: m.nom,
        slug: m.slug,
        titre: m.titre,
        specialite: m.specialite,
        promotion: m.promotion?.toString() ?? "",
        numero: m.numero?.toString() ?? "",
        organisation: m.organisation ?? "",
        ville: m.ville ?? "",
        resume: m.resume,
        bio: m.bio ? paragraphesEnHtml(m.bio) : "",
        parcours: JSON.stringify(m.parcours),
        competences: JSON.stringify(m.competences.map((nom) => ({ nom }))),
        realisations: JSON.stringify(m.realisations ?? []),
        lienLinkedin: m.liens?.linkedin ?? "",
        lienEmail: m.liens?.email ?? "",
        lienSite: m.liens?.site ?? "",
        photoId: "",
      });
      expect(r.success, `${m.slug} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("donne null aux champs facultatifs vides et masque par défaut", () => {
    const r = schemaMembre.parse({ ...valide, bio: "<p> </p>", promotion: "", numero: "", lienEmail: "", visible: undefined });
    expect(r).toMatchObject({ bio: null, promotion: null, numero: null, liens: null, visible: false });
  });

  it.each(["https://example.com/in/awa", "ftp://www.linkedin.com/in/awa", "https://linkedin.com/company/x"])(
    "refuse l'adresse LinkedIn %s, comme le profil du membre",
    (lienLinkedin) => {
      const r = schemaMembre.safeParse({ ...valide, lienLinkedin });
      expect(r.error?.issues.find((i) => i.path[0] === "lienLinkedin")?.message).toMatch(/LinkedIn/);
    },
  );

  it("accepte une adresse LinkedIn de profil, ou vide", () => {
    expect(schemaMembre.parse({ ...valide, lienLinkedin: " https://sn.linkedin.com/in/awa/?utm_source=share " }).liens).toMatchObject({
      linkedin: "https://www.linkedin.com/in/awa",
    });
    expect(schemaMembre.parse({ ...valide, lienLinkedin: "  ", lienEmail: "", lienSite: "" }).liens).toBeNull();
  });

  it.each([
    ["nom", { nom: "" }],
    ["slug", { slug: "Pas Bon" }],
    ["titre", { titre: " " }],
    ["promotion", { promotion: "deux mille" }],
    ["numero", { numero: "-3" }],
    ["resume", { resume: "" }],
    ["lienLinkedin", { lienLinkedin: "javascript:alert(1)" }],
    ["lienEmail", { lienEmail: "pas-un-email" }],
    ["parcours", { parcours: '[{"periode":"","poste":"x","organisation":"y"}]' }],
    ["competences", { competences: '[{"nom":"SIG"},{"nom":"sig"}]' }],
    ["realisations", { realisations: '[{"titre":"x","description":""}]' }],
    ["photoId", { photoId: "x" }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaMembre.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });
});

describe("schemaEnvoiMembre", () => {
  it("ajoute déverrouillage et version", () => {
    expect(schemaEnvoiMembre.parse({ ...valide, modifierSlug: "on", version: "2026-10-10T10:00:00.000Z" })).toMatchObject({
      modifierSlug: true,
      version: "2026-10-10T10:00:00.000Z",
      liens: { email: "diao@example.org" },
    });
    expect(schemaEnvoiMembre.safeParse({ ...valide, version: "hier" }).success).toBe(false);
  });
});
