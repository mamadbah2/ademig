import { z } from "zod";
import { texteFacultatif } from "@/lib/validation/commun";
import { estUrlBlob } from "@/lib/validation/media";
import { VISIBILITES } from "./visibilite";

// Une adresse de profil LinkedIn, ramenée à une seule forme : https, www.linkedin.com, sans paramètres
// (liens de partage mobile « ?utm_source=… »), sans « / » final. Les sous-domaines de pays (sn., fr.)
// pointent vers le même profil. Renvoie null si ce n'est pas un profil LinkedIn.
export function normaliserLinkedin(saisie: string): string | null {
  let url: URL;
  try {
    url = new URL(saisie.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password || url.port) return null;
  const hote = url.hostname.toLowerCase();
  if (hote !== "linkedin.com" && !/^[a-z]{2,3}\.linkedin\.com$/.test(hote)) return null;
  const identifiant = /^\/in\/([^/]+)\/?$/.exec(url.pathname)?.[1];
  return identifiant ? `https://www.linkedin.com/in/${identifiant}` : null;
}
export const MESSAGE_LINKEDIN = "Collez l'adresse de votre profil LinkedIn (https://www.linkedin.com/in/…).";

// Un champ numérique facultatif arrive en texte depuis le formulaire : vide donne null.
function entierFacultatif(min: number, max: number, message: string) {
  return z
    .string()
    .optional()
    .transform((v, ctx) => {
      const t = v?.trim() ?? "";
      if (!t) return null;
      const n = Number(t);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return n;
    });
}

const chaineFacultative = z
  .string()
  .optional()
  .transform((v) => v?.trim() || null);

const linkedin = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const t = v?.trim() ?? "";
    if (!t) return null;
    const normalise = normaliserLinkedin(t);
    if (!normalise) {
      ctx.addIssue({ code: "custom", message: MESSAGE_LINKEDIN });
      return z.NEVER;
    }
    return normalise;
  });

// Règle du téléphone du profil : chiffres, espaces et « + » initial, 7 à 20 caractères.
const estTelephone = (t: string) => t.length >= 7 && t.length <= 20 && /^\+?[\d ]+$/.test(t);

// Pour l'import CSV : points, tirets et barres deviennent des espaces ; null si la règle n'est pas respectée,
// pour que le premier enregistrement du profil par le membre ne bute pas sur un numéro importé.
export function normaliserTelephone(saisie: string): string | null {
  const t = saisie.replace(/[.\-/]/g, " ").replace(/\s+/g, " ").trim();
  return estTelephone(t) ? t : null;
}

const telephone = z
  .string()
  .optional()
  .transform((v, ctx) => {
    const t = v?.trim() ?? "";
    if (!t) return null;
    if (!estTelephone(t)) {
      ctx.addIssue({ code: "custom", message: "Chiffres, espaces et « + » uniquement (7 à 20 caractères)." });
      return z.NEVER;
    }
    return t;
  });

// Texte brut : un « < » suivi d'une lettre ou de « / » ouvre une balise, on refuse.
const resume = z
  .string()
  .trim()
  .min(1, "Écrivez quelques lignes de présentation.")
  .max(500, "500 caractères au maximum.")
  .refine((t) => !/<[a-z/!]/i.test(t), "Texte simple uniquement.");

const dimension = entierFacultatif(1, 10_000, "Dimension de la photo invalide.");

// Les champs de la photo décrivent un fichier déjà envoyé dans Blob par le navigateur : on ne croit
// que ce qui pointe vers le dossier des membres, et dont l'adresse correspond au chemin annoncé.
export const schemaProfil = z
  .object({
    resume,
    linkedin,
    promotion: entierFacultatif(1950, 2100, "Indiquez l'année de la promotion (ex. : 2008)."),
    specialite: z.string().trim().min(1, "Indiquez votre spécialité.").max(120, "120 caractères au plus."),
    organisation: texteFacultatif(120),
    ville: texteFacultatif(100),
    telephone,
    visibilite: z.enum(VISIBILITES, { error: "Choisissez qui voit votre fiche." }),
    photoUrl: chaineFacultative,
    photoPathname: chaineFacultative,
    photoLargeur: dimension,
    photoHauteur: dimension,
  })
  .superRefine((p, ctx) => {
    if (p.photoUrl === null && p.photoPathname === null) return;
    const probleme = (message: string) => ctx.addIssue({ code: "custom", path: ["photoUrl"], message });
    if (!p.photoUrl || !p.photoPathname || !estUrlBlob(p.photoUrl)) return probleme("Adresse de photo inattendue.");
    if (!p.photoPathname.startsWith("membres/") || new URL(p.photoUrl).pathname !== `/${p.photoPathname}`) {
      return probleme("Adresse de photo inattendue.");
    }
    if (p.photoLargeur === null || p.photoHauteur === null) return probleme("Dimensions de la photo manquantes.");
  })
  .transform((p) => ({
    ...p,
    // Sans photo envoyée, les quatre champs valent null ensemble.
    ...(p.photoUrl ? {} : { photoPathname: null, photoLargeur: null, photoHauteur: null }),
  }));

export type SaisieProfil = z.output<typeof schemaProfil>;
