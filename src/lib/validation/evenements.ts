import { z } from "zod";
import { depuisDateLocale } from "@/lib/admin/dates";
import { caseACocher, champJson, champSlug, htmlRiche, idMediaFacultatif, intention, listePhotos, listeVideos } from "./commun";

function dateHeure(message: string) {
  return z.string().transform((v, ctx) => {
    const date = depuisDateLocale(v.trim());
    if (!date) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return date;
  });
}

const texteFacultatif = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au plus.`)
    .optional()
    .transform((v) => v || null);

const partenaires = champJson(
  z
    .array(z.object({ nom: z.string().trim().min(1, "Nommez chaque partenaire.").max(120, "120 caractères au plus.") }))
    .max(30, "30 partenaires au plus.")
    .refine((l) => new Set(l.map((p) => p.nom.toLowerCase())).size === l.length, "Un partenaire figure deux fois."),
).transform((l) => l.map((p) => p.nom));

const champs = z.object({
  titre: z.string().trim().min(1, "Indiquez un titre.").max(200, "200 caractères au plus."),
  slug: champSlug,
  debut: dateHeure("Indiquez la date et l'heure de début."),
  fin: z
    .string()
    .optional()
    .transform((v, ctx) => {
      const texte = v?.trim() ?? "";
      if (!texte) return null;
      const date = depuisDateLocale(texte);
      if (!date) {
        ctx.addIssue({ code: "custom", message: "Date de fin invalide." });
        return z.NEVER;
      }
      return date;
    }),
  lieuNom: z.string().trim().min(1, "Indiquez le lieu.").max(200, "200 caractères au plus."),
  lieuVille: z.string().trim().min(1, "Indiquez la ville.").max(100, "100 caractères au plus."),
  theme: texteFacultatif(300),
  resume: z.string().trim().min(1, "Écrivez un résumé.").max(600, "600 caractères au plus."),
  corps: htmlRiche("Écrivez la présentation de l'événement."),
  partenaires,
  videos: listeVideos,
  afficheId: idMediaFacultatif,
  photos: listePhotos,
});

const finApresDebut = (e: { debut: Date; fin: Date | null }, ctx: z.RefinementCtx) => {
  if (e.fin && e.fin <= e.debut) ctx.addIssue({ code: "custom", path: ["fin"], message: "La fin doit être après le début." });
};

export const schemaEvenement = champs.superRefine(finApresDebut);

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiEvenement = champs
  .extend({ intention, modifierSlug: caseACocher, version: z.iso.datetime().optional() })
  .superRefine(finApresDebut);
