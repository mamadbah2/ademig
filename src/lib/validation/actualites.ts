import { z } from "zod";
import { caseACocher, champJson, champSlug, htmlRiche, intention, listePhotos, listeVideos, urlWeb } from "./commun";

const source = z.object({ label: z.string().trim().min(1, "Nommez chaque source."), url: urlWeb });

export const schemaActualite = z.object({
  titre: z.string().trim().min(1, "Indiquez un titre.").max(200, "200 caractères au plus."),
  slug: champSlug,
  date: z.iso.date({ error: "Indiquez une date valide." }),
  resume: z.string().trim().min(1, "Écrivez un résumé.").max(600, "600 caractères au plus."),
  corps: htmlRiche("Écrivez le texte de l'actualité."),
  sources: champJson(z.array(source).max(20, "20 sources au plus.")),
  videos: listeVideos,
  photos: listePhotos,
});

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiActualite = schemaActualite.extend({
  intention,
  modifierSlug: caseACocher,
  version: z.iso.datetime().optional(),
});
