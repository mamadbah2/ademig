import { describe, expect, it } from "vitest";
import { FAQ_DEFAUT, faqAffichee, jsonLdFaq } from "./faq";

describe("faqAffichee", () => {
  it("affiche la FAQ d'origine tant que rien n'est enregistré", () => {
    expect(faqAffichee(null)).toBe(FAQ_DEFAUT);
    expect(faqAffichee(undefined)).toBe(FAQ_DEFAUT);
  });

  it("affiche la FAQ enregistrée, même vide", () => {
    const faq = [{ question: "Q ?", reponse: "R." }];
    expect(faqAffichee(faq)).toBe(faq);
    expect(faqAffichee([])).toEqual([]);
  });

  it("ne publie aucun montant de cotisation par défaut", () => {
    expect(FAQ_DEFAUT.map((q) => q.reponse).join(" ")).not.toMatch(/\d+\s*(F\s*CFA|FCFA|XOF|francs?)/i);
  });
});

describe("jsonLdFaq", () => {
  it("produit un balisage FAQPage schema.org", () => {
    expect(jsonLdFaq([{ question: "Comment adhérer ?", reponse: "Écrivez au bureau." }])).toEqual({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Comment adhérer ?", acceptedAnswer: { "@type": "Answer", text: "Écrivez au bureau." } },
      ],
    });
  });
});
