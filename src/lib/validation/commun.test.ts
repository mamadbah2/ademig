import { describe, expect, it } from "vitest";
import { z } from "zod";
import { caseACocher, champJson, champSlug, extraireIdYoutube, htmlRiche, intention, urlWeb } from "./commun";

describe("champJson", () => {
  const schema = champJson(z.array(z.object({ label: z.string() })));
  it("lit un tableau JSON", () => {
    expect(schema.parse('[{"label":"a"}]')).toEqual([{ label: "a" }]);
  });
  it("vaut une liste vide quand le champ est absent", () => {
    expect(schema.parse(undefined)).toEqual([]);
  });
  it("refuse un JSON illisible sans lever d'exception", () => {
    const r = schema.safeParse("[{");
    expect(r.success).toBe(false);
  });
  it("valide le contenu", () => {
    expect(schema.safeParse('[{"label":1}]').success).toBe(false);
  });
});

describe("champSlug", () => {
  it("accepte minuscules, chiffres et tirets", () => {
    expect(champSlug.parse(" forum-2025 ")).toBe("forum-2025");
  });
  it.each(["Forum", "forum--2025", "-forum", "forum_2025", ""])("refuse « %s »", (v) => {
    expect(champSlug.safeParse(v).success).toBe(false);
  });
});

describe("urlWeb", () => {
  it("accepte http et https", () => {
    expect(urlWeb.parse(" https://ensmg.ucad.sn/ ")).toBe("https://ensmg.ucad.sn/");
  });
  it.each(["javascript:alert(1)", "ftp://exemple.sn", "pas une adresse"])("refuse %s", (v) => {
    expect(urlWeb.safeParse(v).success).toBe(false);
  });
});

describe("htmlRiche", () => {
  const schema = htmlRiche("Écrivez le texte.");
  it("nettoie le HTML", () => {
    expect(schema.parse('<p onclick="x()">Bonjour<script>alert(1)</script></p>')).toBe("<p>Bonjour</p>");
  });
  it("retire les liens javascript:", () => {
    expect(schema.parse('<p><a href="javascript:alert(1)">lien</a></p>')).toBe('<p><a rel="noopener">lien</a></p>');
  });
  it("refuse un texte vide une fois nettoyé", () => {
    const r = schema.safeParse("<p></p><script>alert(1)</script>");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Écrivez le texte.");
  });
});

describe("extraireIdYoutube", () => {
  it.each([
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("lit %s", (texte, id) => {
    expect(extraireIdYoutube(texte)).toBe(id);
  });
  it.each(["", "trop-court", "https://vimeo.com/123", "https://youtube.com/watch?v=xx"])("refuse « %s »", (t) => {
    expect(extraireIdYoutube(t)).toBeNull();
  });
});

describe("intention et caseACocher", () => {
  it("enregistre par défaut", () => {
    expect(intention.parse(undefined)).toBe("enregistrer");
  });
  it("refuse une intention inconnue", () => {
    expect(intention.safeParse("effacer").success).toBe(false);
  });
  it("lit une case HTML", () => {
    expect(caseACocher.parse("on")).toBe(true);
    expect(caseACocher.parse(undefined)).toBe(false);
  });
});
