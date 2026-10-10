import { z } from "zod";
import { caseACocher, champJson, champSlug, htmlRiche, idYoutube, intention, urlWeb } from "./commun";

const source = z.object({ label: z.string().trim().min(1, "Nommez chaque source."), url: urlWeb });
const video = z.object({ id: idYoutube, titre: z.string().trim().min(1, "Donnez un titre à chaque vidéo.") });

export const schemaActualite = z.object({
  titre: z.string().trim().min(1, "Indiquez un titre.").max(200, "200 caractères au plus."),
  slug: champSlug,
  date: z.iso.date({ error: "Indiquez une date valide." }),
  resume: z.string().trim().min(1, "Écrivez un résumé.").max(600, "600 caractères au plus."),
  corps: htmlRiche("Écrivez le texte de l'actualité."),
  sources: champJson(z.array(source).max(20, "20 sources au plus.")),
  videos: champJson(z.array(video).max(10, "10 vidéos au plus.")),
  photos: champJson(
    z
      .array(z.uuid())
      .max(30, "30 photos au plus.")
      .refine((ids) => new Set(ids).size === ids.length, "Une photo figure deux fois."),
  ),
});

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiActualite = schemaActualite.extend({
  intention,
  modifierSlug: caseACocher,
  version: z.iso.datetime().optional(),
});
