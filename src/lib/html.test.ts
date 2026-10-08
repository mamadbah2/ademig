import { describe, expect, it } from "vitest";
import { echapperHtml, nettoyerHtml, paragraphesEnHtml } from "./html";

describe("echapperHtml", () => {
  it("échappe les caractères spéciaux sans toucher aux guillemets français", () => {
    expect(echapperHtml(`Mines & pétrole <b> "x" « y » l'amicale`)).toBe(
      "Mines &amp; pétrole &lt;b&gt; &quot;x&quot; « y » l'amicale",
    );
  });
});

describe("paragraphesEnHtml", () => {
  it("entoure chaque paragraphe d'un <p>", () => {
    expect(paragraphesEnHtml(["Un", "Deux & trois"])).toBe("<p>Un</p><p>Deux &amp; trois</p>");
  });

  it("renvoie une chaîne vide pour une liste vide", () => {
    expect(paragraphesEnHtml([])).toBe("");
  });
});

describe("nettoyerHtml", () => {
  it("garde la mise en forme autorisée", () => {
    const html = "<h2>Titre</h2><p><strong>Gras</strong> et <em>italique</em></p><ul><li>Un</li></ul><blockquote>Citation</blockquote>";
    expect(nettoyerHtml(html)).toBe(html);
  });

  it("supprime les scripts, les styles et les gestionnaires d'événements", () => {
    expect(nettoyerHtml(`<p onclick="vol()" style="color:red">Texte</p><script>alert(1)</script>`)).toBe("<p>Texte</p>");
  });

  it("retire les balises non autorisées mais garde leur texte", () => {
    expect(nettoyerHtml("<h1>Grand titre</h1><div>Bloc</div>")).toBe("Grand titreBloc");
  });

  it("n'accepte que les liens http, https et mailto, avec rel=noopener", () => {
    expect(nettoyerHtml(`<a href="https://ensmg.ucad.sn/">ENSMG</a>`)).toBe(
      `<a href="https://ensmg.ucad.sn/" rel="noopener">ENSMG</a>`,
    );
    expect(nettoyerHtml(`<a href="mailto:contact@ademig.sn">Écrire</a>`)).toBe(
      `<a href="mailto:contact@ademig.sn" rel="noopener">Écrire</a>`,
    );
    expect(nettoyerHtml(`<a href="javascript:vol()">Piège</a>`)).toBe(`<a rel="noopener">Piège</a>`);
  });

  it("laisse intact le HTML produit par paragraphesEnHtml", () => {
    const html = paragraphesEnHtml(["« Je commencerai par adresser mes remerciements » & merci."]);
    expect(nettoyerHtml(html)).toBe(html);
  });
});
