export type Source = { label: string; url: string };
export type Video = { id: string; titre: string };
export type Realisation = { titre: string; annee?: string; description: string };
export type Liens = { linkedin?: string; email?: string; site?: string };

// Coordonnées de l'amicale, éditables dans l'admin (même forme que l'ancien `site.contact`).
export type Contact = {
  email: string;
  phone: string | null;
  press: { name: string; phone: string };
  address: { street: string; postalBox: string; city: string; country: string };
};
export type Reseau = { label: string; url: string };
export type Reglages = { contact: Contact; reseaux: Reseau[]; textes: Record<string, string> };

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
  realisations?: Realisation[];
  liens?: Liens;
  photo?: string;
};

export type Photo = { src: string; alt: string; width: number; height: number; credit?: string };

export type Actualite = {
  slug: string;
  titre: string;
  date: string; // ISO 8601
  resume: string;
  corps: string[];
  sources?: Source[];
  videos?: Video[];
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
  videos?: Video[];
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
