// Tags de cache du site public, invalidés par les actions de l'admin.
export const TAGS = {
  actualites: "actualites",
  evenements: "evenements",
  membres: "membres",
  alumni: "alumni",
  bureau: "bureau",
  partenaires: "partenaires",
  reglages: "reglages",
  media: "media",
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];
