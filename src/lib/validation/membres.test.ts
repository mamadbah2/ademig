import { describe, expect, it } from "vitest";
import { membres as membresInitiaux } from "@/db/donnees-initiales/membres";
import { schemaEnvoiMembre, schemaMembre } from "./membres";

const valide = {
  nom: " Dr Ibrahima Diao ",
  slug: "ibrahima-diao",
  titre: "Ingénieur Chef de Mission",
  specialite: "Géologie",
  promotion: "2006",
  organisation: "CACO – BTP",
  lienLinkedin: "",
  photoId: "",
  visible: "on",
};

describe("schemaMembre", () => {
  it("lit le formulaire de l'admin", () => {
    expect(schemaMembre.parse(valide)).toEqual({
      nom: "Dr Ibrahima Diao",
      slug: "ibrahima-diao",
      titre: "Ingénieur Chef de Mission",
      specialite: "Géologie",
      promotion: 2006,
      organisation: "CACO – BTP",
      liens: null,
      photoId: null,
      visible: true,
    });
  });

  it("ignore les champs qui ne sont plus saisis (résumé, biographie, parcours…)", () => {
    const r = schemaMembre.parse({ ...valide, resume: "x", bio: "<p>x</p>", parcours: "pas du json", lienEmail: "x@y.z" });
    expect(r).not.toHaveProperty("resume");
    expect(r).not.toHaveProperty("bio");
    expect(r).not.toHaveProperty("parcours");
    expect(r.liens).toBeNull();
  });

  it("accepte les membres actuels du site", () => {
    for (const m of membresInitiaux) {
      const r = schemaMembre.safeParse({
        nom: m.nom,
        slug: m.slug,
        titre: m.titre,
        specialite: m.specialite,
        promotion: m.promotion?.toString() ?? "",
        organisation: m.organisation ?? "",
        lienLinkedin: m.liens?.linkedin ?? "",
        photoId: "",
      });
      expect(r.success, `${m.slug} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("donne une valeur vide aux champs facultatifs et masque par défaut", () => {
    const r = schemaMembre.parse({ nom: "Khardiata Ka", slug: "khardiata-ka", photoId: "" });
    expect(r).toEqual({
      nom: "Khardiata Ka",
      slug: "khardiata-ka",
      titre: "",
      specialite: "",
      promotion: null,
      organisation: null,
      liens: null,
      photoId: null,
      visible: false,
    });
  });

  it.each(["https://example.com/in/awa", "ftp://www.linkedin.com/in/awa", "https://linkedin.com/company/x"])(
    "refuse l'adresse LinkedIn %s, comme le profil du membre",
    (lienLinkedin) => {
      const r = schemaMembre.safeParse({ ...valide, lienLinkedin });
      expect(r.error?.issues.find((i) => i.path[0] === "lienLinkedin")?.message).toMatch(/LinkedIn/);
    },
  );

  it("accepte une adresse LinkedIn de profil, ou vide", () => {
    expect(schemaMembre.parse({ ...valide, lienLinkedin: " https://sn.linkedin.com/in/awa/?utm_source=share " }).liens).toEqual({
      linkedin: "https://www.linkedin.com/in/awa",
    });
    expect(schemaMembre.parse({ ...valide, lienLinkedin: "  " }).liens).toBeNull();
  });

  it.each([
    ["nom", { nom: "" }],
    ["slug", { slug: "Pas Bon" }],
    ["titre", { titre: "x".repeat(121) }],
    ["promotion", { promotion: "deux mille" }],
    ["lienLinkedin", { lienLinkedin: "javascript:alert(1)" }],
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
      liens: null,
    });
    expect(schemaEnvoiMembre.safeParse({ ...valide, version: "hier" }).success).toBe(false);
  });
});
