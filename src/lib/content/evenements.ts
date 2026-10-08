import { photos } from "./photos";
import type { Evenement } from "./types";

const evenements: Evenement[] = [
  {
    slug: "journee-nationale-contenu-local-2026",
    titre: "Journée nationale de réflexion sur le contenu local",
    debut: "2026-09-12T09:00:00+00:00",
    lieu: { nom: "Hôtel Pullman Teranga", ville: "Dakar" },
    theme: "Le contenu local comme moteur de transformation durable : promotion, défis et enjeux",
    resume:
      "Une journée d'échanges entre l'État, les entreprises et les experts du secteur extractif, conclue par des recommandations remises aux autorités.",
    photos: [photos.journeeOfficiels, photos.journeePanel, photos.journeeSalle, photos.journeeInterview],
    corps: [
      "Sous le haut patronage du ministre des Mines et de la Géologie, M. Cheikhou Oumar Seck, et en présence du secrétaire technique du CNSCL, M. Mor Bakhoum.",
      "Au programme : emploi, formation et transfert de compétences, financement des PME, normes HSE, sous-traitance et transparence. Les mines, le pétrole et le gaz, la construction et les industries connexes étaient représentés.",
    ],
    partenaires: ["CORICA", "ST-CNSCL", "ACBEP", "MODEC"],
    affiche: {
      src: "/evenements/affiche-journee-contenu-local-2026.jpg",
      alt: "Affiche de la Journée de réflexion sur le contenu local : thèmes, date, lieu et sponsors",
      width: 1280,
      height: 720,
    },
    videos: [
      { id: "L3bpTCQiOfw", titre: "La Journée de réflexion sur le contenu local, par Xalaat TV" },
      { id: "lrLGStvKcko", titre: "Ressources naturelles : l'heure des ingénieurs locaux, par Xalaat TV" },
    ],
  },
  {
    slug: "visite-sage-david-mbaye-ndayane-2026",
    titre: "Visite au sage Mouhamed David Mbaye, à Ndayane",
    debut: "2026-04-04T10:00:00+00:00",
    lieu: { nom: "Chez Mouhamed David Mbaye", ville: "Ndayane" },
    resume:
      "Une délégation de l'amicale est allée à la rencontre de Mouhamed David Mbaye, ingénieur de la 8e promotion et ancien directeur général de Barrick Gold Sénégal.",
    photos: [photos.visiteNdayane],
    corps: [
      "Le 4 avril 2026, une délégation de l'ADEMIG s'est rendue à Ndayane pour rendre visite à Mouhamed David Mbaye, diplômé de la 8e promotion (1993) et ancien directeur général de Barrick Gold Sénégal. L'amicale tient à garder le lien avec ses sages et ses aînés, comme le président l'a rappelé dès son élection.",
    ],
    videos: [{ id: "q-zWa6l2kzo", titre: "La visite à Ndayane, sur la chaîne de l'ADEMIG" }],
  },
  {
    slug: "forum-recrutement-sim-senegal-2025",
    titre: "Forum de recrutement minier, SIM Sénégal 2025",
    debut: "2025-11-04T09:00:00+00:00",
    fin: "2025-11-06T18:00:00+00:00",
    lieu: { nom: "Salon international des mines", ville: "Dakar" },
    resume:
      "Une centaine de jeunes diplômés, retenus parmi plus de 1 000 candidats, ont rencontré 16 entreprises qui proposaient 188 postes.",
    photos: [photos.forumSim],
    corps: [
      "Coorganisé avec AME Trade Sénégal, avec le soutien de SOMISEN SA, pour rapprocher les entreprises minières des jeunes diplômés en mines, géologie, génie civil, électromécanique, environnement, HSE et SIG.",
    ],
    partenaires: ["AME Trade Sénégal", "SOMISEN SA"],
    videos: [{ id: "-4N8Xkgxr4Y", titre: "Le secteur minier avec Ngagne Demba Touré, par Xalaat TV" }],
  },
  {
    slug: "diner-debat-ademig-ensmg-2025",
    titre: "Dîner-débat ADEMIG/ENSMG",
    debut: "2025-05-24T19:00:00+00:00",
    lieu: { nom: "Hôtel Noom (ex-Radisson)", ville: "Dakar" },
    theme:
      "L'ingénieur ENSMG, acteur clé du développement africain par la valorisation des ressources naturelles",
    resume:
      "Une soirée d'échanges entre ingénieurs, enseignants et entreprises sur la place de l'ingénieur ENSMG dans le développement du continent.",
    photos: [photos.dinerDebat, photos.dinerDebatSalle],
    corps: [
      "L'édition de mai 2025 du dîner-débat ADEMIG/ENSMG a réuni les diplômés, l'école et ses partenaires autour d'un thème : le rôle de l'ingénieur ENSMG dans la valorisation des ressources naturelles africaines.",
      "La soirée a été diffusée en direct par Xalaat TV. L'amicale en a publié l'intégralité en trois parties sur sa chaîne YouTube.",
    ],
    videos: [
      { id: "0znWMwQMr60", titre: "Dîner-débat, première partie" },
      { id: "6dG1jJy1_yQ", titre: "Dîner-débat, deuxième partie" },
      { id: "8095nXj_NBM", titre: "Dîner-débat, troisième partie" },
    ],
  },
];

export async function getEvenements() {
  return [...evenements].sort((a, b) => b.debut.localeCompare(a.debut));
}

export async function getEvenement(slug: string) {
  return evenements.find((e) => e.slug === slug);
}
