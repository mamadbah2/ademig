import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import type { Db } from "@/db/types";
import type { Reglages } from "@/lib/content/types";

// Version null : la ligne n'existe pas encore, le premier enregistrement la créera.
export type ReglagesAdmin = Reglages & { version: string | null };

export async function lireReglagesAdmin(db: Db): Promise<ReglagesAdmin> {
  const ligne = await db.query.reglages.findFirst();
  if (!ligne) return { ...reglagesInitiaux, version: null };
  return { contact: ligne.contact, reseaux: ligne.reseaux, textes: ligne.textes, version: ligne.majLe.toISOString() };
}
