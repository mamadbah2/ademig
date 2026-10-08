export type Etape = {
  periode: string;
  poste: string;
  organisation: string;
  description?: string;
};

export type Member = {
  slug: string;
  nom: string;
  titre: string;
  specialite: string;
  promotion?: number;
  // Numéro d'ordre du diplômé dans l'annuaire de l'école.
  numero?: number;
  // Fonction au sein du bureau de l'amicale.
  fonction?: string;
  organisation?: string;
  ville?: string;
  resume: string;
  bio?: string[];
  parcours: Etape[];
  competences: string[];
  realisations?: { titre: string; annee?: string; description: string }[];
  liens?: { linkedin?: string; email?: string; site?: string };
  photo?: string;
};

export type Photo = { src: string; alt: string; width: number; height: number; credit?: string };

export type Actualite = {
  slug: string;
  titre: string;
  date: string; // ISO 8601
  resume: string;
  corps: string[];
  sources?: { label: string; url: string }[];
  videos?: { id: string; titre: string }[];
  // La première photo illustre l'article dans les listes.
  photos?: Photo[];
};

export type Evenement = {
  slug: string;
  titre: string;
  debut: string; // ISO 8601
  fin?: string;
  lieu: { nom: string; ville: string };
  theme?: string;
  resume: string;
  corps: string[];
  partenaires?: string[];
  // Identifiants YouTube des vidéos de l'événement.
  videos?: { id: string; titre: string }[];
  affiche?: { src: string; alt: string; width: number; height: number };
  photos?: Photo[];
};

export type Partenaire = {
  nom: string;
  description: string;
  categorie: "Institution" | "Entreprise" | "Événement";
  url?: string;
  logo?: { src: string; width: number; height: number };
};

export type Commission = {
  nom: string;
  mission: string;
};
