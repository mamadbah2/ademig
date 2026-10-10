import { z } from "zod";
import { categoriePartenaire } from "@/db/schema";
import { caseACocher, idMediaFacultatif, urlWeb } from "./commun";

export const schemaPartenaire = z.object({
  nom: z.string().trim().min(1, "Indiquez le nom du partenaire.").max(120, "120 caractères au plus."),
  description: z.string().trim().min(1, "Décrivez le partenaire en une ou deux phrases.").max(600, "600 caractères au plus."),
  categorie: z.enum(categoriePartenaire.enumValues, { error: "Choisissez une catégorie." }),
  // Facultative : un champ vide donne null.
  url: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(urlWeb.optional())
    .transform((v) => v ?? null),
  logoId: idMediaFacultatif,
  visible: caseACocher,
});

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiPartenaire = schemaPartenaire.extend({ version: z.iso.datetime().optional() });
