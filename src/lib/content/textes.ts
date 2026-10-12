// Textes clés de l'accueil et de L'Amicale, modifiables dans Réglages > Textes du site.
// Le texte d'origine s'affiche tant que la clé est absente ou vide en base.

export type DefinitionTexte = {
  groupe: "Accueil" | "L'Amicale";
  libelle: string;
  forme: "ligne" | "paragraphe";
  max: number;
  defaut: string;
};

// L'ordre est celui de l'écran des réglages : page par page, de haut en bas.
export const TEXTES = {
  "accueil.accroche": {
    groupe: "Accueil",
    libelle: "Titre principal",
    forme: "ligne",
    max: 120,
    defaut:
      "Amicale des ingénieurs diplômés de l'École nationale supérieure des mines et de la géologie (ex-IST)",
  },
  "accueil.devise.reflechir": {
    groupe: "Accueil",
    libelle: "Devise : Réfléchir",
    forme: "paragraphe",
    max: 240,
    defaut:
      "Des journées de réflexion sur le contenu local, la souveraineté sur les ressources et le transfert de compétences.",
  },
  "accueil.devise.proposer": {
    groupe: "Accueil",
    libelle: "Devise : Proposer",
    forme: "paragraphe",
    max: 240,
    defaut: "Des recommandations remises aux autorités et une parole d'experts dans le débat public.",
  },
  "accueil.devise.agir": {
    groupe: "Accueil",
    libelle: "Devise : Agir",
    forme: "paragraphe",
    max: 240,
    defaut: "L'encadrement des stagiaires de l'ENSMG, l'appui à l'école et l'emploi des jeunes diplômés.",
  },
  "accueil.forum.titre": {
    groupe: "Accueil",
    libelle: "Forum : titre de la section",
    forme: "ligne",
    max: 100,
    defaut: "Le forum de recrutement 2025 en chiffres",
  },
  "accueil.forum.candidatures": {
    groupe: "Accueil",
    libelle: "Forum : légende du chiffre 1 000",
    forme: "ligne",
    max: 80,
    defaut: "candidatures reçues, et plus",
  },
  "accueil.forum.postes": {
    groupe: "Accueil",
    libelle: "Forum : légende du chiffre 188",
    forme: "ligne",
    max: 80,
    defaut: "postes proposés",
  },
  "accueil.forum.entreprises": {
    groupe: "Accueil",
    libelle: "Forum : légende du chiffre 16",
    forme: "ligne",
    max: 80,
    defaut: "entreprises présentes",
  },
  "accueil.valeur.titre": {
    groupe: "Accueil",
    libelle: "Contenu local : titre de la section",
    forme: "ligne",
    max: 100,
    defaut: "Contenu local : où va la valeur extraite ?",
  },
  "accueil.valeur.achats.titre": {
    groupe: "Accueil",
    libelle: "Contenu local : titre de la barre à 50 %",
    forme: "ligne",
    max: 60,
    defaut: "Achats locaux",
  },
  "accueil.valeur.achats.texte": {
    groupe: "Accueil",
    libelle: "Contenu local : texte de la barre à 50 %",
    forme: "paragraphe",
    max: 240,
    defaut:
      "Plus de la moitié des volumes d'achats du secteur vont à des fournisseurs sénégalais, soit 1 100 milliards de FCFA.",
  },
  "accueil.valeur.candidats.titre": {
    groupe: "Accueil",
    libelle: "Contenu local : titre de la barre à 10 %",
    forme: "ligne",
    max: 60,
    defaut: "Candidats retenus",
  },
  "accueil.valeur.candidats.texte": {
    groupe: "Accueil",
    libelle: "Contenu local : texte de la barre à 10 %",
    forme: "paragraphe",
    max: 240,
    defaut:
      "Une centaine de jeunes diplômés, sur plus de 1 000 candidats, ont rencontré les recruteurs au SIM Sénégal 2025.",
  },
  "accueil.valeur.source": {
    groupe: "Accueil",
    libelle: "Contenu local : source des chiffres",
    forme: "paragraphe",
    max: 240,
    defaut: "Chiffres présentés lors de la Journée nationale sur le contenu local, le 12 septembre 2026.",
  },
  "amicale.intro": {
    groupe: "L'Amicale",
    libelle: "En-tête : introduction",
    forme: "ligne",
    max: 160,
    defaut: "Les ingénieurs formés à Dakar aux métiers des mines et de la géologie",
  },
  "amicale.ecole.paragraphe1": {
    groupe: "L'Amicale",
    libelle: "Une école, un réseau : premier paragraphe",
    forme: "paragraphe",
    max: 900,
    defaut:
      "L'École nationale supérieure des mines et de la géologie (ENSMG) de l'Université Cheikh Anta Diop forme depuis des décennies les cadres du Sénégal et de la sous-région dans l'ingénierie et la géologie. Elle est l'héritière de l'Institut des sciences de la Terre (IST), devenu école nationale supérieure par décrets en 2021 et 2022.",
  },
  "amicale.ecole.paragraphe2": {
    groupe: "L'Amicale",
    libelle: "Une école, un réseau : second paragraphe",
    forme: "paragraphe",
    max: 900,
    defaut:
      "Ses diplômés travaillent dans l'exploration et l'exploitation minière, le pétrole et le gaz, l'hydrogéologie, le génie civil, l'environnement et l'administration. L'ADEMIG les réunit pour entretenir la solidarité entre promotions, soutenir l'école et peser, par l'expertise, sur l'avenir du secteur extractif sénégalais.",
  },
  "amicale.mission1.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 1 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Soutenir l'ENSMG",
  },
  "amicale.mission1.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 1 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Encadrement des stagiaires, cours et séminaires donnés par des ingénieurs en activité, aides matérielles et financières à l'école.",
  },
  "amicale.mission2.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 2 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Ouvrir les portes de l'emploi",
  },
  "amicale.mission2.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 2 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Mise en relation des jeunes diplômés avec les entreprises, comme lors du forum de recrutement minier du SIM Sénégal 2025.",
  },
  "amicale.mission3.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 3 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Éclairer le débat public",
  },
  "amicale.mission3.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 3 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Des prises de position fondées sur la science, pour que les décisions sur les ressources naturelles reposent sur des faits géologiques exacts.",
  },
  "amicale.mission4.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 4 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Faire vivre le contenu local",
  },
  "amicale.mission4.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 4 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Des propositions pour que les compétences, les entreprises et le financement sénégalais prennent toute leur place dans le secteur extractif.",
  },
} as const satisfies Record<string, DefinitionTexte>;

export type CleTexte = keyof typeof TEXTES;

export const CLES_TEXTES = Object.keys(TEXTES) as CleTexte[];

// Espaces de bord retirés ; une ligne (titre, légende) ne garde aucun retour à la ligne.
export function normaliserTexte(cle: CleTexte, valeur: string): string {
  const texte = valeur.replace(/\r\n?/g, "\n").trim();
  return TEXTES[cle].forme === "ligne" ? texte.replace(/\s+/g, " ") : texte;
}

// Textes affichés : la valeur enregistrée si elle a du contenu, sinon le texte d'origine.
export function fusionnerTextes(enregistres: Record<string, string>): Record<CleTexte, string> {
  return Object.fromEntries(
    CLES_TEXTES.map((cle) => {
      const valeur = enregistres[cle];
      const texte = typeof valeur === "string" ? valeur.trim() : "";
      return [cle, texte || TEXTES[cle].defaut];
    }),
  ) as Record<CleTexte, string>;
}

// Ne stocke que les textes qui diffèrent de l'origine : rétablir un texte vide sa clé.
export function textesAEnregistrer(saisie: Partial<Record<CleTexte, string>>): Record<string, string> {
  const textes: Record<string, string> = {};
  for (const cle of CLES_TEXTES) {
    const texte = normaliserTexte(cle, saisie[cle] ?? "");
    if (texte && texte !== TEXTES[cle].defaut) textes[cle] = texte;
  }
  return textes;
}
