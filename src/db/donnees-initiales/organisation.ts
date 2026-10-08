import type { Commission, Partenaire } from "@/lib/content/types";

// Le bureau est composé à partir des fiches des membres (champ `fonction`).
export const ordreBureau = [
  "ibrahima-diao",
  "sokhna-khadidjatou-thioye",
  "bineta-gueye-fall",
  "zackaria-diaw",
];

export const commissions: (Commission & { membres: string[] })[] = [
  {
    nom: "Finances",
    mission: "Gestion des cotisations, du budget et de la recherche de financements, avec un devoir de transparence.",
    membres: ["moustapha-diaw-kamby", "mariama-sow"],
  },
  {
    nom: "Communication et relations publiques",
    mission: "Information des membres, relations avec la presse et présence en ligne de l'amicale.",
    membres: ["birama-ndoye", "aloise-ngor-mak-diagne"],
  },
  {
    nom: "Insertion et partenariats",
    mission: "Stages, emploi des jeunes diplômés et relations avec les entreprises et les institutions.",
    membres: ["daouda-mane"],
  },
  {
    nom: "Sociale",
    mission: "Solidarité entre les membres et accompagnement dans les moments importants.",
    membres: ["mahamat-tourki-nouri", "oumar-niang"],
  },
];

export const partenaires: Partenaire[] = [
  {
    nom: "ENSMG – Université Cheikh Anta Diop",
    logo: { src: "/partenaires/ensmg.png", width: 334, height: 228 },
    categorie: "Institution",
    description:
      "L'école qui forme les ingénieurs membres de l'amicale. L'ADEMIG y encadre des stagiaires, y donne des cours et y apporte des aides.",
    url: "https://ensmg.ucad.sn/",
  },
  {
    nom: "Ministère des Mines et de la Géologie",
    logo: { src: "/partenaires/ministere-mines-geologie.png", width: 297, height: 114 },
    categorie: "Institution",
    description: "A accordé son haut patronage à la Journée nationale sur le contenu local de 2026.",
    url: "https://minesgeologie.gouv.sn/",
  },
  {
    nom: "ST-CNSCL",
    logo: { src: "/partenaires/st-cnscl.svg", width: 180, height: 95 },
    categorie: "Institution",
    description: "Secrétariat technique du Comité national de suivi du contenu local.",
    url: "https://www.cnsclmines.sn/",
  },
  {
    nom: "ACBEP",
    logo: { src: "/partenaires/acbep.png", width: 264, height: 192 },
    categorie: "Institution",
    description:
      "Agence de construction des bâtiments et édifices publics. Partenaire de la Journée nationale sur le contenu local 2026.",
    url: "https://acbep.gouv.sn/",
  },
  {
    nom: "CORICA",
    logo: { src: "/partenaires/corica.png", width: 338, height: 135 },
    categorie: "Entreprise",
    description:
      "Société africaine de services miniers. Partenaire principal de la Journée nationale sur le contenu local 2026.",
  },
  {
    nom: "MODEC",
    logo: { src: "/partenaires/modec.png", width: 360, height: 86 },
    categorie: "Entreprise",
    description:
      "Spécialiste des unités flottantes de production pétrolière. Partenaire de la Journée nationale sur le contenu local 2026.",
    url: "https://www.modec.com/",
  },
  {
    nom: "SOMISEN SA",
    logo: { src: "/partenaires/somisen.png", width: 212, height: 80 },
    categorie: "Entreprise",
    description: "Société des mines du Sénégal. Soutien du forum de recrutement minier au SIM Sénégal 2025.",
    url: "https://somisen.sn/",
  },
  {
    nom: "AME Trade Sénégal",
    logo: { src: "/partenaires/ame-trade.png", width: 452, height: 241 },
    categorie: "Événement",
    description: "Organisateur du SIM Sénégal, avec qui l'ADEMIG a coorganisé le forum de recrutement 2025.",
    url: "https://simsenegal.com/",
  },
];
