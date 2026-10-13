// Questions fréquentes de l'accueil, modifiables dans Réglages > FAQ.
// Tant que le bureau n'a rien enregistré (colonne vide), le site affiche ces réponses d'origine.
// À FAIRE VALIDER PAR LE BUREAU : toutes les réponses ci-dessous (adhésion, cotisation, partenariats).

export type QuestionFaq = { question: string; reponse: string };

export const FAQ_MAX_QUESTIONS = 12;
export const FAQ_MAX_QUESTION = 160;
export const FAQ_MAX_REPONSE = 900;

export const FAQ_DEFAUT: QuestionFaq[] = [
  {
    question: "Qui peut adhérer à l'ADEMIG ?",
    reponse:
      "L'amicale réunit les ingénieurs diplômés de l'École nationale supérieure des mines et de la géologie (ENSMG) de l'Université Cheikh Anta Diop, y compris ceux formés lorsque l'école s'appelait encore Institut des sciences de la Terre (IST). Les conditions précises d'adhésion sont fixées par les statuts et le règlement intérieur.",
  },
  {
    question: "Comment adhérer ?",
    reponse:
      "Écrivez au bureau à l'adresse indiquée sur la page Contact, en précisant votre nom, votre promotion et votre spécialité. Le bureau vous indiquera les pièces à fournir et les étapes à suivre.",
  },
  {
    question: "Quel est le montant de la cotisation ?",
    reponse:
      "Le montant et la périodicité de la cotisation sont fixés par l'assemblée générale. Le bureau les communique aux membres et à toute personne qui souhaite adhérer.",
  },
  {
    question: "Comment contacter le bureau ?",
    reponse:
      "Par email, à l'adresse indiquée sur la page Contact et en bas de chaque page. Pour les demandes de la presse, un contact dédié figure aussi sur la page Contact.",
  },
  {
    question: "Mon entreprise ou mon institution peut-elle devenir partenaire ?",
    reponse:
      "Oui. L'amicale noue des partenariats pour ses journées de réflexion, l'insertion des jeunes diplômés et l'appui à l'ENSMG. Présentez votre projet au bureau par email : il vous répondra pour en discuter.",
  },
  {
    question: "Comment suivre les activités de l'amicale ?",
    reponse:
      "Les pages Actualités et Événements du site sont mises à jour par le bureau. L'amicale publie aussi ses vidéos et ses annonces sur ses réseaux sociaux, dont les liens figurent en bas de chaque page.",
  },
];

// FAQ affichée : celle enregistrée par le bureau (même vide, pour masquer la section), sinon celle d'origine.
export function faqAffichee(enregistree: QuestionFaq[] | null | undefined): QuestionFaq[] {
  return enregistree ?? FAQ_DEFAUT;
}

// Balisage schema.org FAQPage (résultats enrichis des moteurs de recherche).
export function jsonLdFaq(questions: QuestionFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.reponse },
    })),
  };
}
