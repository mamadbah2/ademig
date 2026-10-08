import type { Photo } from "./types";

const A = "/actualites/";

// Photos réutilisées par les actualités et les événements.
export const photos = {
  journeeOfficiels: {
    src: `${A}journee-contenu-local-2026-officiels.jpg`,
    alt: "Le ministre des Mines et de la Géologie, au centre, entouré du bureau de l'ADEMIG et des officiels lors de la Journée sur le contenu local",
    width: 1260,
    height: 650,
    credit: "Seneweb",
  },
  journeePanel: {
    src: `${A}journee-contenu-local-2026-panel.jpg`,
    alt: "Les intervenants d'un panel sur scène, devant le public de la Journée sur le contenu local",
    width: 1800,
    height: 1183,
    credit: "Dakaractu",
  },
  journeeSalle: {
    src: `${A}journee-contenu-local-2026-salle.jpg`,
    alt: "Vue de la salle du Pullman Teranga pendant un panel de la Journée sur le contenu local",
    width: 1280,
    height: 960,
    credit: "Énergie Mine Afrique",
  },
  journeeInterview: {
    src: `${A}journee-contenu-local-2026-interview.jpg`,
    alt: "Le président de l'ADEMIG répond à la presse devant le kakémono de l'amicale",
    width: 1280,
    height: 720,
    credit: "Xalaat TV",
  },
  forumSim: {
    src: `${A}forum-sim-2025.jpg`,
    alt: "Des ingénieurs de l'ADEMIG interviewés sur un stand du SIM Sénégal 2025",
    width: 1280,
    height: 720,
    credit: "Xalaat TV",
  },
  sessionCodes: {
    src: `${A}session-codes-2025.jpg`,
    alt: "Des ingénieures et ingénieurs de l'amicale pendant la session de réflexion sur les codes minier, pétrolier et gazier",
    width: 1280,
    height: 720,
    credit: "Xalaat TV",
  },
  emissionPetrole: {
    src: `${A}emission-petrole-2025.jpg`,
    alt: "Un représentant de l'ADEMIG sur le plateau de Xalaat TV pour l'émission consacrée au pétrole",
    width: 1280,
    height: 720,
    credit: "Xalaat TV",
  },
  dinerDebat: {
    src: `${A}diner-debat-2025.jpg`,
    alt: "Deux intervenants au pupitre lors du dîner-débat ADEMIG/ENSMG de mai 2025",
    width: 1280,
    height: 720,
    credit: "ADEMIG",
  },
  dinerDebatSalle: {
    src: `${A}diner-debat-2025-salle.jpg`,
    alt: "Un intervenant s'adresse à la salle pendant le dîner-débat",
    width: 1280,
    height: 720,
    credit: "ADEMIG",
  },
  visiteNdayane: {
    src: `${A}visite-ndayane-2026.jpg`,
    alt: "La délégation de l'ADEMIG reçue chez David Mbaye, à Ndayane",
    width: 1280,
    height: 720,
    credit: "ADEMIG",
  },
} satisfies Record<string, Photo>;
