import sanitizeHtml from "sanitize-html";

export function echapperHtml(texte: string): string {
  return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Convertit l'ancien format (un paragraphe par entrée) en HTML.
export function paragraphesEnHtml(paragraphes: string[]): string {
  return paragraphes.map((p) => `<p>${echapperHtml(p)}</p>`).join("");
}

// Tout HTML enregistré passe par ici : seule la mise en forme éditoriale survit.
export function nettoyerHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "strong", "em", "b", "i", "ul", "ol", "li", "a", "blockquote", "br"],
    allowedAttributes: { a: ["href", "title", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener" } }),
    },
  });
}

// Texte visible d'un HTML : sert à refuser un contenu qui n'a que des balises vides.
export function texteDe(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
