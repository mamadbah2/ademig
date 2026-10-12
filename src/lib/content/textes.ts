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
  "amicale.histoire.repere1.date": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 1, date",
    forme: "ligne",
    max: 40,
    defaut:
      "1992",
  },
  "amicale.histoire.repere1.texte": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 1, texte",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Une trentaine d'ingénieurs fondent, à l'Institut des sciences de la Terre (IST), l'Amicale des ingénieurs géologues de l'IST (AIGIST). Dr Moussa Sylla, de la première promotion (1986), en est le premier président.",
  },
  "amicale.histoire.repere2.date": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 2, date",
    forme: "ligne",
    max: 40,
    defaut:
      "1995 – 2004",
  },
  "amicale.histoire.repere2.texte": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 2, texte",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Trois présidents se succèdent : Macky Sall (3e promotion), élu en 1995 et réélu en 1998 ; Ousmane Cissé (11e promotion), élu en 2001 lorsque Macky Sall devient ministre des Mines, de l'Énergie et de l'Hydraulique ; puis Ibrahima Diaw (9e promotion), élu en 2004.",
  },
  "amicale.histoire.repere3.date": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 3, date",
    forme: "ligne",
    max: 40,
    defaut:
      "2004 – 2024",
  },
  "amicale.histoire.repere3.texte": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 3, texte",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Avec le Code minier de 2003, les découvertes de pétrole et de gaz en mer et les grands chantiers d'infrastructures, le métier d'ingénieur géologue gagne en reconnaissance. L'IST forme davantage d'ingénieurs : l'amicale en réunit aujourd'hui près de 500, à des postes clés au Sénégal comme à l'étranger.",
  },
  "amicale.histoire.repere4.date": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 4, date",
    forme: "ligne",
    max: 40,
    defaut:
      "Août 2024",
  },
  "amicale.histoire.repere4.texte": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 4, texte",
    forme: "paragraphe",
    max: 600,
    defaut:
      "À l'initiative de membres décidés à relancer l'amicale, un comité ad hoc présidé par Dr Moussa Sylla prépare une assemblée générale de renouvellement. L'amicale se dote de nouveaux statuts et d'un règlement intérieur, qui limitent la durée des mandats et créent un comité des sages chargé du conseil, de la médiation et de la régulation.",
  },
  "amicale.histoire.repere5.date": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 5, date",
    forme: "ligne",
    max: 40,
    defaut:
      "22 septembre 2024",
  },
  "amicale.histoire.repere5.texte": {
    groupe: "L'Amicale",
    libelle: "Notre histoire : repère 5, texte",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Réunie à l'Université Cheikh Anta Diop, l'assemblée générale constitutive transforme l'AIGIST en ADEMIG et élit son premier bureau, présidé par Dr Ibrahima Diao, pour 2024-2027.",
  },
  "amicale.vision": {
    groupe: "L'Amicale",
    libelle: "Notre vision",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Devenir d'ici 2030 un réseau influent et dynamique d'ingénieurs géologues au Sénégal, puis en Afrique et dans le monde, reconnu pour son expertise, son engagement dans le développement durable et son impact sur les industries extractives, l'environnement et les autres domaines des géosciences.",
  },
  "amicale.objectif": {
    groupe: "L'Amicale",
    libelle: "Notre objectif",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Fédérer la communauté issue de l'ENSMG (ex-IST) et constituer une force de proposition sur les questions ayant trait aux géosciences, pour une meilleure gestion des ressources naturelles au service du développement économique et social du Sénégal et de l'Afrique.",
  },
  "amicale.valeurs": {
    groupe: "L'Amicale",
    libelle: "Nos valeurs (une par ligne)",
    forme: "paragraphe",
    max: 400,
    defaut:
      "Intégrité et éthique professionnelle\nExpertise\nSolidarité\nRespect\nTransparence\nVisibilité et ouverture",
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
      "Contribuer au rayonnement de l'école et à un meilleur cadre d'apprentissage pour les élèves-ingénieurs : logiciels, stages, choix des sujets de mémoire.",
  },
  "amicale.mission2.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 2 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Accompagner l'insertion",
  },
  "amicale.mission2.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 2 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Un cadre de suivi et de facilitation de l'insertion des jeunes diplômés, comme lors du forum de recrutement minier du SIM Sénégal 2025.",
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
      "Être une force de proposition pour une meilleure gouvernance des ressources naturelles, avec des prises de position fondées sur la science.",
  },
  "amicale.mission4.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 4 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Servir le développement du pays",
  },
  "amicale.mission4.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 4 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Promouvoir la participation au développement socio-économique du Sénégal et de l'Afrique, notamment par un contenu local qui fasse toute sa place aux compétences sénégalaises.",
  },
  "amicale.mission5.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 5 : titre",
    forme: "ligne",
    max: 80,
    defaut:
      "Unir et représenter les diplômés",
  },
  "amicale.mission5.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 5 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Des liens de solidarité et d'entraide entre diplômés, élèves-ingénieurs et enseignants de l'ENSMG, pour représenter les diplômés et défendre l'image de la profession.",
  },
  "amicale.mission6.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 6 : titre",
    forme: "ligne",
    max: 80,
    defaut:
      "Promouvoir les géosciences",
  },
  "amicale.mission6.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 6 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Vulgariser les géosciences, encourager la recherche et les publications scientifiques, et inciter les jeunes à choisir les filières scientifiques.",
  },
  "amicale.axe1.titre": {
    groupe: "L'Amicale",
    libelle: "Axe 1 : titre",
    forme: "ligne",
    max: 120,
    defaut:
      "Renforcement de la solidarité et du réseautage",
  },
  "amicale.axe1.objectifs": {
    groupe: "L'Amicale",
    libelle: "Axe 1 : objectifs (un par ligne)",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Créer des liens solides entre les diplômés\nCréer une passerelle entre les diplômés et les élèves-ingénieurs",
  },
  "amicale.axe2.titre": {
    groupe: "L'Amicale",
    libelle: "Axe 2 : titre",
    forme: "ligne",
    max: 120,
    defaut:
      "Soutien à l'ENSMG et promotion de ses activités",
  },
  "amicale.axe2.objectifs": {
    groupe: "L'Amicale",
    libelle: "Axe 2 : objectifs (un par ligne)",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Créer un cadre de collaboration fructueuse entre l'ADEMIG et l'ENSMG\nContribuer au renforcement des capacités de l'ENSMG et à son rayonnement scientifique, pédagogique et institutionnel",
  },
  "amicale.axe3.titre": {
    groupe: "L'Amicale",
    libelle: "Axe 3 : titre",
    forme: "ligne",
    max: 120,
    defaut:
      "Appui à l'insertion professionnelle et à la carrière des jeunes diplômés",
  },
  "amicale.axe3.objectifs": {
    groupe: "L'Amicale",
    libelle: "Axe 3 : objectifs (un par ligne)",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Identifier régulièrement les diplômés en recherche de stage ou d'emploi et renforcer leurs capacités\nFaciliter leur insertion professionnelle par le lobbying et les partenariats",
  },
  "amicale.axe4.titre": {
    groupe: "L'Amicale",
    libelle: "Axe 4 : titre",
    forme: "ligne",
    max: 120,
    defaut:
      "Promotion des géosciences et contribution au développement du Sénégal et de l'Afrique",
  },
  "amicale.axe4.objectifs": {
    groupe: "L'Amicale",
    libelle: "Axe 4 : objectifs (un par ligne)",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Vulgariser les géosciences et promouvoir les carrières scientifiques\nPrendre part au débat sur les ressources naturelles et la construction du pays et du continent\nŒuvrer pour la préservation de l'environnement et le développement durable",
  },
  "amicale.axe5.titre": {
    groupe: "L'Amicale",
    libelle: "Axe 5 : titre",
    forme: "ligne",
    max: 120,
    defaut:
      "Gouvernance et mobilisation des partenaires",
  },
  "amicale.axe5.objectifs": {
    groupe: "L'Amicale",
    libelle: "Axe 5 : objectifs (un par ligne)",
    forme: "paragraphe",
    max: 600,
    defaut:
      "Instaurer une gouvernance transparente de l'association et de ses ressources\nNouer des partenariats mutuellement gagnants pour des actions collectives et impactantes",
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
