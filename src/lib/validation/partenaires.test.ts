import { describe, expect, it } from "vitest";
import { partenaires as partenairesInitiaux } from "@/db/donnees-initiales/organisation";
import { schemaEnvoiPartenaire, schemaPartenaire } from "./partenaires";

const valide = { nom: " CORICA ", description: "Comité.", categorie: "Institution", url: "", logoId: "", visible: "on" };

describe("schemaPartenaire", () => {
  it("lit un formulaire complet", () => {
    expect(schemaPartenaire.parse(valide)).toEqual({
      nom: "CORICA",
      description: "Comité.",
      categorie: "Institution",
      url: null,
      logoId: null,
      visible: true,
    });
  });
  it("accepte les partenaires actuels du site", () => {
    for (const p of partenairesInitiaux) {
      const r = schemaPartenaire.safeParse({ nom: p.nom, description: p.description, categorie: p.categorie, url: p.url ?? "", logoId: "" });
      expect(r.success, `${p.nom} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });
  it("une case décochée rend le partenaire invisible", () => {
    expect(schemaPartenaire.parse({ ...valide, visible: undefined }).visible).toBe(false);
  });
  it.each([
    ["nom", { nom: "" }],
    ["description", { description: " " }],
    ["categorie", { categorie: "Association" }],
    ["url", { url: "javascript:alert(1)" }],
    ["logoId", { logoId: "x" }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaPartenaire.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });
  it("refuse une version malformée", () => {
    expect(schemaEnvoiPartenaire.safeParse({ ...valide, version: "hier" }).success).toBe(false);
  });
});
