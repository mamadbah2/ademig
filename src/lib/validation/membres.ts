import { z } from "zod";
import type { Liens } from "@/lib/content/types";
import { LINKEDIN, MESSAGE_LINKEDIN } from "@/lib/membres/profil";
import { caseACocher, champJson, champSlug, htmlRicheFacultatif, idMediaFacultatif, texteFacultatif, urlWeb } from "./commun";

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
const urlFacultative = z.string().optional().transform(vide).pipe(urlWeb.optional());
// Même règle que le profil du membre : une seule adresse LinkedIn valide, vide autorisé.
const linkedinFacultatif = z
  .string()
  .optional()
  .transform(vide)
  .pipe(z.string().regex(LINKEDIN, MESSAGE_LINKEDIN).optional());
const emailFacultatif = z
  .string()
  .optional()
  .transform(vide)
  .pipe(z.email({ error: "Adresse email invalide." }).optional());

const etape = z.object({
  periode: texte("Indiquez la période.", 60),
  poste: texte("Indiquez le poste.", 200),
  organisation: texte("Indiquez l'employeur ou l'école.", 200),
  description: z.string().trim().max(600, "600 caractères au plus.").optional().transform((v) => v || undefined),
});

const realisation = z.object({
  titre: texte("Donnez un titre à chaque réalisation.", 200),
  annee: z.string().trim().max(20, "20 caractères au plus.").optional().transform((v) => v || undefined),
  description: texte("Décrivez chaque réalisation.", 600),
});

const competences = champJson(
  z
    .array(z.object({ nom: texte("Écrivez chaque compétence.", 60) }))
    .max(30, "30 compétences au plus.")
    .refine((l) => new Set(l.map((c) => c.nom.toLowerCase())).size === l.length, "Une compétence figure deux fois."),
).transform((l) => l.map((c) => c.nom));

const champs = z.object({
  nom: texte("Indiquez le nom.", 120),
  slug: champSlug,
  titre: texte("Indiquez le poste actuel.", 120),
  specialite: texte("Indiquez la spécialité.", 120),
  promotion: entierFacultatif(1950, 2100, "Indiquez l'année de la promotion (ex. : 2008)."),
  numero: entierFacultatif(1, 99_999, "Le numéro est un nombre entier positif."),
  organisation: texteFacultatif(120),
  ville: texteFacultatif(100),
  resume: texte("Écrivez un résumé.", 600),
  bio: htmlRicheFacultatif,
  parcours: champJson(z.array(etape).max(30, "30 étapes au plus.")),
  competences,
  realisations: champJson(z.array(realisation).max(20, "20 réalisations au plus.")),
  lienLinkedin: linkedinFacultatif,
  lienEmail: emailFacultatif,
  lienSite: urlFacultative,
  photoId: idMediaFacultatif,
  visible: caseACocher,
});

// Les trois liens arrivent à plat (une erreur par champ) et sont rangés comme en base.
function avecLiens<T extends { lienLinkedin?: string; lienEmail?: string; lienSite?: string }>({
  lienLinkedin,
  lienEmail,
  lienSite,
  ...reste
}: T) {
  const liens: Liens = {};
  if (lienLinkedin) liens.linkedin = lienLinkedin;
  if (lienEmail) liens.email = lienEmail;
  if (lienSite) liens.site = lienSite;
  return { ...reste, liens: Object.keys(liens).length > 0 ? liens : null };
}

export const schemaMembre = champs.transform(avecLiens);

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiMembre = champs
  .extend({ modifierSlug: caseACocher, version: z.iso.datetime().optional() })
  .transform(avecLiens);
