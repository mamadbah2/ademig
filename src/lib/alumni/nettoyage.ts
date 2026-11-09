import { lireCsv } from "@/lib/membres/import-csv";

// Ne garde du fichier des alumni que ce qui peut être publié : l'e-mail, le téléphone, la civilité et
// le pays d'origine ne sont jamais lus, et la situation d'emploi (chômage, recherche d'emploi) est écartée.
export type LigneAlumni = {
  numero: number;
  prenom: string;
  nom: string;
  promotion: number;
  promotionOrdre: string;
  structure: string | null;
  poste: string | null;
  domaines: string[];
  decede: boolean;
};

const COLONNES = {
  numero: "N°_dordre",
  prenom: "PRENOM (S)",
  nom: "NOM",
  ordre: "Promotion ordre",
  annee: "Promotion Année",
  structure: "Structure_actuelle",
  poste: "Poste_occupé",
  domaines: "Domaine_s_dactivité",
} as const;

const MARQUE_DECES = /\s*\(DCD\)\s*/gi;
const STRUCTURES_NON_PUBLIEES = new Set(["chômage", "chomage", "aucune", "néant", "neant"]);
const POSTES_NON_PUBLIES = new Set(["néant", "neant"]);
const DOMAINES_NON_PUBLIES = new Set(["recherched'emploi", "student", "etudiande", "étudiante", "étudiant"]);

const DOMAINES: Record<string, string> = {
  "mines/géologie": "Mines / Géologie",
  "oil&gas": "Oil & Gas",
  "enseignement/recherche": "Enseignement / Recherche",
  hydraulique: "Hydraulique",
  fonctionpublique: "Fonction publique",
  gouvernancepublique: "Gouvernance publique",
  marchéspublics: "Marchés publics",
  "énergies(hydroélectriqueetrenouvelables)": "Énergies hydroélectriques et renouvelables",
};

// Saisies du fichier d'origine sans espaces ou en capitales, corrigées une à une.
const STRUCTURES: Record<string, string> = {
  ABANDOURGEOLINKSARL: "Abandour Geolink SARL",
  AECIMiningExplosives: "AECI Mining Explosives",
  DSPConsultingSARL: "DSP Consulting SARL",
  "DANGOTE Industries-CementBU-Senegal": "Dangote Cement Sénégal",
  "InnovMine.sarl": "InnovMine SARL",
  SaytuGeos: "Saytu Geos",
  ORICA: "Orica",
  EDEGIS: "Edegis",
  Totalenergies: "TotalEnergies",
  "A la retraite": "À la retraite",
  "Commune de sebikotane": "Commune de Sébikotane",
  "Consultant Independant": "Consultant indépendant",
  "Ecole Nationale Supérieure des Mines et de la Géologie (ENSMG, Ex_IST)": "École nationale supérieure des mines et de la géologie (ENSMG)",
  "Ministère des transports du Québec ( Canada)": "Ministère des Transports du Québec (Canada)",
  "GICSA SENEGAL(GROUPE D'INGENIERIE ET DE CONSTRUCTION)": "GICSA Sénégal (Groupe d'ingénierie et de construction)",
};

const POSTES: Record<string, string> = {
  "CHEF DE DEPARTEMENT": "Chef de département",
  "CHEF DE DIVISION": "Chef de division",
  "CHEF DE SERVICE PRODUCTION": "Chef de service production",
  "CHEFDEMISSION/DG": "Chef de mission / DG",
  "CHEFFE DU GLA": "Cheffe du GLA",
  "COORDONNATEUR DE PROJETS": "Coordonnateur de projets",
  Chargédeprojets: "Chargé de projets",
  "Chef de servce": "Chef de service",
  Chefcelluleinspectiontechnique: "Chef de cellule inspection technique",
  ChefdeDivisionEntretienRoutier: "Chef de division entretien routier",
  "Chefdecarrière/Responsableexploitation": "Chef de carrière / Responsable exploitation",
  Chefdedépartement: "Chef de département",
  Chefdelot: "Chef de lot",
  Chefdemission: "Chef de mission",
  "Chefdemission/chefdelot": "Chef de mission / Chef de lot",
  Conducteurdestravaux: "Conducteur des travaux",
  // Texte tronqué dans le fichier : seule la fonction principale est reprise.
  "Coordonnateur National du Projet Régional OUA d’Aménagement du Massif du Fouta Djallon - Expert au Conseil Supérieur des Ressources Naturelles et de l’Environnement - Chargé de projets à la la GTZ (Coopération allemande) - Directeur de l’Environnement et":
    "Coordonnateur national du projet régional OUA d'aménagement du massif du Fouta Djallon",
  "DIRECTEUR GÉNÉRAL": "Directeur général",
  "DIRECTEUR TECHNIQUE": "Directeur technique",
  "Database admin &QAQC": "Database admin & QAQC",
  DirecteurGénéral: "Directeur général",
  DirecteurGénéralAdjoint: "Directeur général adjoint",
  Directricetechniqueaudéveloppement: "Directrice technique au développement",
  "Enseignante Chercheur // Maire de Joal Fadiouth": "Enseignante-chercheuse / Maire de Joal-Fadiouth",
  ExplorationManager: "Exploration Manager",
  "GEOLOGUE SENIOR CHEF DE PROJET": "Géologue senior, chef de projet",
  GÉOLOGUE: "Géologue",
  GÉRANT: "Gérant",
  "Géologued'exploration": "Géologue d'exploration",
  Géologueexploration: "Géologue exploration",
  "INGENIEUR GEOTECHNICIEN": "Ingénieur géotechnicien",
  IngénieurGéologueGéotechnicien: "Ingénieur géologue géotechnicien",
  "IngénieurGéotechnicien/ResponsableducontrôleQualitédelaproduction":
    "Ingénieur géotechnicien / Responsable du contrôle qualité de la production",
  IngénieurMinier: "Ingénieur minier",
  IngénieurResponsabledelaProductionMinières: "Ingénieur responsable de la production minière",
  IngénieurenMinage: "Ingénieur en minage",
  Ingénieurgéologue: "Ingénieur géologue",
  Ingénieurgéotechnicien: "Ingénieur géotechnicien",
  Ingénieurminier: "Ingénieur minier",
  "Ingénieurresponsabledelaproductiondelacentraled'enrobage": "Ingénieur responsable de la production de la centrale d'enrobage",
  "Ingénieurétudesettraitementdesdonnées/ingénieurdeterrain": "Ingénieur études et traitement des données / Ingénieur de terrain",
  JuniorExplorationGeologist: "Junior Exploration Geologist",
  JuniorMiningengineer: "Junior Mining Engineer",
  MineGeologist: "Mine Geologist",
  MineManager: "Mine Manager",
  OffshoreProductionOps: "Offshore Production Ops",
  "PCA / Directeur Environnement, Communaités & Relations Publiques": "PCA / Directeur Environnement, Communautés et Relations publiques",
  "PROJET MANAGER": "Project Manager",
  "RESPONSABLE GEOTECHNIQUE ET GEOPHYSIQUE": "Responsable géotechnique et géophysique",
  ResponsableGéotechnique: "Responsable géotechnique",
  SeniorGeologue: "Senior Géologue",
  "SeniorGeoscientist&HeadofBusiness": "Senior Geoscientist & Head of Business",
  Seniordatabaseadministrator: "Senior Database Administrator",
  Seniorgéologueminier: "Senior géologue minier",
  SeniorproductionEngineer: "Senior Production Engineer",
  SiteSuperintendent: "Site Superintendent",
  geologist: "Geologist",
  ingénieurdestravaux: "Ingénieur des travaux",
};

const reduireEspaces = (s: string) => s.replace(/\s+/g, " ").trim();

// « M'BAYE » → « M'Baye », « EL-KAMOUNI » → « El-Kamouni » ; ne touche pas à un mot déjà en casse mixte.
function casseNom(texte: string) {
  return texte
    .split(" ")
    .map((mot) =>
      mot === mot.toUpperCase()
        ? mot.toLowerCase().replace(/(^|['’\-])(\p{L})/gu, (_, avant: string, lettre: string) => avant + lettre.toUpperCase())
        : mot,
    )
    .join(" ");
}

function nettoyerDomaines(brut: string) {
  const domaines = new Set<string>();
  for (const morceau of brut.split(",")) {
    const propre = reduireEspaces(morceau);
    if (!propre) continue;
    const cle = propre.replace(/\s+/g, "").toLowerCase();
    if (DOMAINES_NON_PUBLIES.has(cle)) continue;
    domaines.add(DOMAINES[cle] ?? propre);
  }
  return [...domaines];
}

function nettoyerStructure(brut: string, poste: string | null) {
  const propre = reduireEspaces(brut);
  if (!propre || STRUCTURES_NON_PUBLIEES.has(propre.toLowerCase())) return null;
  // « Retraité » saisi à la fois comme structure et comme poste : affiché une seule fois.
  if (poste && propre.toLowerCase() === poste.toLowerCase()) return null;
  return STRUCTURES[propre] ?? propre;
}

function nettoyerPoste(brut: string) {
  const propre = reduireEspaces(brut);
  if (!propre || POSTES_NON_PUBLIES.has(propre.toLowerCase())) return null;
  return POSTES[propre] ?? propre;
}

// « 1ère » → « 1re », « 30ème » → « 30e ».
function nettoyerOrdre(brut: string) {
  const rang = Number.parseInt(brut, 10);
  if (!Number.isInteger(rang)) throw new Error(`Ordre de promotion illisible : « ${brut} »`);
  return rang === 1 ? "1re" : `${rang}e`;
}

export function analyserFichierAlumni(texte: string): LigneAlumni[] {
  const [entete, ...lignes] = lireCsv(texte.replace(/^﻿/, ""), ",").filter((l) => l.cellules.some((c) => c.trim()));
  if (!entete) throw new Error("Fichier vide");
  const position = Object.fromEntries(
    Object.entries(COLONNES).map(([cle, colonne]) => {
      const index = entete.cellules.findIndex((c) => c.trim() === colonne);
      if (index < 0) throw new Error(`Colonne manquante : « ${colonne} »`);
      return [cle, index];
    }),
  ) as Record<keyof typeof COLONNES, number>;

  return lignes.map(({ ligne, cellules }) => {
    const lire = (cle: keyof typeof COLONNES) => cellules[position[cle]] ?? "";
    const numero = Number(lire("numero"));
    const promotion = Number(lire("annee"));
    if (!Number.isInteger(numero) || !Number.isInteger(promotion)) {
      throw new Error(`Ligne ${ligne} : numéro ou promotion illisible`);
    }
    const prenomBrut = lire("prenom");
    const nomBrut = lire("nom");
    const poste = nettoyerPoste(lire("poste"));
    return {
      numero,
      prenom: casseNom(reduireEspaces(prenomBrut.replace(MARQUE_DECES, " "))),
      nom: casseNom(reduireEspaces(nomBrut.replace(MARQUE_DECES, " "))),
      promotion,
      promotionOrdre: nettoyerOrdre(lire("ordre")),
      structure: nettoyerStructure(lire("structure"), poste),
      poste,
      domaines: nettoyerDomaines(lire("domaines")),
      decede: /\(DCD\)/i.test(prenomBrut + nomBrut),
    };
  });
}
