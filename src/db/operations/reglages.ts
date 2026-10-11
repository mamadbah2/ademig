import { and, eq } from "drizzle-orm";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import { reglages } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Reglages } from "@/lib/content/types";
import { CONFLIT, memeVersion } from "./commun";
import { ErreurMetier } from "./erreurs";

// Chaque onglet n'écrit que sa colonne ; la version de l'unique ligne les protège toutes.
export type PartieReglages = Partial<Reglages>;

export async function modifierReglages(db: Db, partie: PartieReglages, o: { version: string | null }): Promise<{ version: string }> {
  const [ligne] = o.version
    ? await db
        .update(reglages)
        .set(partie)
        .where(and(eq(reglages.id, 1), memeVersion(reglages.majLe, o.version)))
        .returning({ majLe: reglages.majLe })
    : // Sans ligne en base (seed jamais lancé), le premier enregistrement la crée à partir des valeurs d'origine.
      await db
        .insert(reglages)
        .values({ id: 1, ...reglagesInitiaux, ...partie })
        .onConflictDoNothing()
        .returning({ majLe: reglages.majLe });
  if (!ligne) throw new ErreurMetier(CONFLIT);
  return { version: ligne.majLe.toISOString() };
}
