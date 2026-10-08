import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import type { Db } from "@/db/types";
import type { Reglages } from "@/lib/content/types";

// Sans ligne en base (seed pas encore lancé), le site garde ses coordonnées d'origine.
export async function lireReglages(db: Db): Promise<Reglages> {
  const ligne = await db.query.reglages.findFirst();
  if (!ligne) return reglagesInitiaux;
  return { contact: ligne.contact, reseaux: ligne.reseaux, textes: ligne.textes };
}
