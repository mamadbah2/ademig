import { z } from "zod";
import { ErreurMetier } from "@/db/operations/erreurs";

export const COLONNES_IMPORT = ["nom", "prenom", "email", "telephone", "promotion", "specialite"] as const;

export type LigneImport = {
  ligne: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string | null;
  promotion: number | null;
  specialite: string | null;
};
export type ProblemeImport = { ligne: number; message: string };
export type AnalyseCsv = { valides: LigneImport[]; problemes: ProblemeImport[] };

const LIGNES_MAX = 2000;
const PROMOTION_MIN = 1960;

const ALIAS: Record<string, string> = { mail: "email", tel: "telephone", promo: "promotion" };

// Même règle que normaliserEmail (src/db/operations/comptes.ts), recopiée pour
// garder ce module pur : comptes.ts importe la base et better-auth.
const normaliserEmail = (email: string) => email.trim().toLowerCase();

const normaliserEntete = (brut: string) => {
  const nom = brut.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, "");
  return ALIAS[nom] ?? nom;
};

// Compte les séparateurs `;` et `,` hors guillemets dans la ligne d'en-tête.
function detecterSeparateur(entete: string): string {
  let pointsVirgules = 0;
  let virgules = 0;
  let entreGuillemets = false;
  for (const c of entete) {
    if (c === '"') entreGuillemets = !entreGuillemets;
    else if (!entreGuillemets && c === ";") pointsVirgules++;
    else if (!entreGuillemets && c === ",") virgules++;
  }
  return virgules > pointsVirgules ? "," : ";";
}

type Enregistrement = { ligne: number; cellules: string[] };

// Lecteur CSV conforme à la RFC 4180 : guillemets doublés, séparateur ou saut de ligne entre guillemets, CRLF et LF.
function lireCsv(texte: string, separateur: string): Enregistrement[] {
  const resultat: Enregistrement[] = [];
  let cellules: string[] = [];
  let cellule = "";
  let entreGuillemets = false;
  let ligne = 1;
  let ligneDebut = 1;

  const finCellule = () => {
    cellules.push(cellule);
    cellule = "";
  };
  const finEnregistrement = () => {
    finCellule();
    resultat.push({ ligne: ligneDebut, cellules });
    cellules = [];
  };

  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"') {
        if (texte[i + 1] === '"') {
          cellule += '"';
          i++;
        } else entreGuillemets = false;
      } else {
        if (c === "\n") ligne++;
        cellule += c;
      }
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === separateur) {
      finCellule();
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      finEnregistrement();
      ligne++;
      ligneDebut = ligne;
    } else {
      cellule += c;
    }
  }
  if (cellule !== "" || cellules.length > 0) finEnregistrement();
  return resultat;
}

const courriel = z.email();

export function analyserCsv(texte: string): AnalyseCsv {
  if (texte.includes("�")) {
    throw new ErreurMetier("Le fichier contient des caractères illisibles : enregistrez-le en « CSV UTF-8 » depuis Excel.");
  }
  const contenu = texte.replace(/^﻿/, "");
  const separateur = detecterSeparateur(contenu.split(/\r\n|\n|\r/, 1)[0] ?? "");
  const enregistrements = lireCsv(contenu, separateur);

  const entetes = (enregistrements[0]?.cellules ?? []).map(normaliserEntete);
  if (!["nom", "prenom", "email"].every((c) => entetes.includes(c))) {
    throw new ErreurMetier("Colonnes obligatoires manquantes : nom, prenom, email. Téléchargez le modèle.");
  }

  const lignes = enregistrements.slice(1).filter((e) => e.cellules.some((c) => c.trim() !== ""));
  if (lignes.length > LIGNES_MAX) {
    throw new ErreurMetier(`Fichier trop long : ${LIGNES_MAX} lignes au maximum.`);
  }

  const anneeMax = new Date().getFullYear() + 1;
  const valides: LigneImport[] = [];
  const problemes: ProblemeImport[] = [];
  const vus = new Map<string, number>();

  for (const { ligne, cellules } of lignes) {
    const lire = (colonne: string) => {
      const i = entetes.indexOf(colonne);
      return i === -1 ? "" : (cellules[i] ?? "").trim();
    };
    const nom = lire("nom");
    const prenom = lire("prenom");
    const emailBrut = lire("email");
    const email = normaliserEmail(emailBrut);
    const promotionBrute = lire("promotion");
    const promotion = /^\d+$/.test(promotionBrute) ? Number(promotionBrute) : NaN;

    let message: string | null = null;
    if (!nom) message = "Nom manquant.";
    else if (!prenom) message = "Prénom manquant.";
    else if (!courriel.safeParse(email).success) message = `Email invalide : « ${emailBrut} ».`;
    else if (promotionBrute && !(promotion >= PROMOTION_MIN && promotion <= anneeMax)) {
      message = `Promotion invalide : « ${promotionBrute} ».`;
    } else if (vus.has(email)) message = `Email en double dans le fichier (déjà ligne ${vus.get(email)}).`;

    if (message) {
      problemes.push({ ligne, message });
      continue;
    }
    vus.set(email, ligne);
    valides.push({
      ligne,
      nom,
      prenom,
      email,
      telephone: lire("telephone") || null,
      promotion: promotionBrute ? promotion : null,
      specialite: lire("specialite") || null,
    });
  }
  return { valides, problemes };
}
