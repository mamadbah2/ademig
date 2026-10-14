import { z } from "zod";
import type { Liens } from "@/lib/content/types";
import { MESSAGE_LINKEDIN, normaliserLinkedin } from "@/lib/membres/profil";
import { caseACocher, champSlug, idMediaFacultatif, texteFacultatif } from "./commun";

const texte = (message: string, max: number) => z.string().trim().min(1, message).max(max, `${max} caractères au plus.`);

// Nombre entier facultatif saisi dans un champ texte : vide donne null.
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

const vide = (v: string | undefined) => v?.trim() || undefined;
// Même règle que le profil du membre : une seule adresse LinkedIn valide, vide autorisé.
const linkedinFacultatif = z
  .string()
  .optional()
  .transform(vide)
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    const normalise = normaliserLinkedin(v);
    if (!normalise) {
      ctx.addIssue({ code: "custom", message: MESSAGE_LINKEDIN });
      return z.NEVER;
    }
    return normalise;
  });
// Texte facultatif d'une colonne NOT NULL : vide donne "" (la carte du site masque alors la ligne).
const texteVide = (max: number) => z.string().trim().max(max, `${max} caractères au plus.`).optional().transform((v) => v ?? "");

// Champs du formulaire de l'admin. Il n'y a plus de page par membre : résumé, biographie, parcours,
// compétences, réalisations, numéro, ville, email et site ne sont plus saisis (colonnes conservées).
const champs = z.object({
  nom: texte("Indiquez le nom.", 120),
  slug: champSlug,
  titre: texteVide(120),
  specialite: texteVide(120),
  promotion: entierFacultatif(1950, 2100, "Indiquez l'année de la promotion (ex. : 2008)."),
  organisation: texteFacultatif(120),
  lienLinkedin: linkedinFacultatif,
  photoId: idMediaFacultatif,
  visible: caseACocher,
});

// Le lien LinkedIn arrive à plat (une erreur sur son champ) et est rangé comme en base.
function avecLiens<T extends { lienLinkedin?: string }>({ lienLinkedin, ...reste }: T) {
  const liens: Liens | null = lienLinkedin ? { linkedin: lienLinkedin } : null;
  return { ...reste, liens };
}

export const schemaMembre = champs.transform(avecLiens);

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiMembre = champs
  .extend({ modifierSlug: caseACocher, version: z.iso.datetime().optional() })
  .transform(avecLiens);
