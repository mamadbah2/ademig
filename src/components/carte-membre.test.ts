import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CarteMembre, versCarte } from "./carte-membre";

const rendu = (props: Parameters<typeof CarteMembre>[0]) => renderToStaticMarkup(createElement(CarteMembre, props));

describe("CarteMembre", () => {
  it("mène au profil LinkedIn dans un nouvel onglet, avec un libellé accessible", () => {
    const html = rendu({ membre: { nom: "Khardiata Ka", titre: "", liens: { linkedin: "https://www.linkedin.com/in/ka" } } });
    expect(html).toContain('href="https://www.linkedin.com/in/ka"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('aria-label="Khardiata Ka — profil LinkedIn (nouvel onglet)"');
  });

  it("n'est pas un lien sans LinkedIn, et masque un titre vide", () => {
    const html = rendu({ membre: { nom: "Pape Emile Ndiaye", titre: "", fonction: "Secrétaire général adjoint" }, avecFonction: true });
    expect(html).not.toContain("<a");
    expect(html).toContain("Secrétaire général adjoint");
    expect(html).not.toMatch(/<span class="mt-1 block ?(text-sm)?"><\/span>/);
  });

  it("n'affiche la fonction que si on la demande", () => {
    const membre = { nom: "Daouda Mane", titre: "Ingénieur chef de projets", fonction: "Président de la commission" };
    expect(rendu({ membre })).not.toContain("Président de la commission");
    expect(rendu({ membre, avecFonction: true })).toContain("Président de la commission");
  });

  it("n'envoie au navigateur que les champs affichés", () => {
    const carte = versCarte({
      slug: "awa",
      nom: "Awa",
      titre: "Géologue",
      specialite: "Mines",
      resume: "secret",
      parcours: [],
      competences: ["x"],
      liens: { email: "awa@example.org", linkedin: "https://www.linkedin.com/in/awa" },
    });
    expect(carte).not.toHaveProperty("resume");
    expect(carte.liens).toEqual({ linkedin: "https://www.linkedin.com/in/awa" });
    expect(versCarte({ slug: "b", nom: "B", titre: "", specialite: "", resume: "", parcours: [], competences: [], liens: { email: "b@x.sn" } }).liens).toBeUndefined();
  });
});
