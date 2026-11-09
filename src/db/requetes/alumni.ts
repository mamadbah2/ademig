import { asc, desc, eq, notExists, sql } from "drizzle-orm";
import { alumni, membres } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Alumni } from "@/lib/content/types";

// Les personnes qui ont déjà une fiche membre (bureau compris) n'apparaissent pas ici : le numéro de
// diplôme fait le lien, si bien qu'un alumni qui devient membre quitte cette liste de lui-même.
export async function listerAlumni(db: Db): Promise<Alumni[]> {
  const lignes = await db
    .select()
    .from(alumni)
    .where(
      notExists(
        db
          .select({ un: sql`1` })
          .from(membres)
          .where(eq(membres.numero, alumni.numero)),
      ),
    )
    .orderBy(desc(alumni.promotion), asc(alumni.nom), asc(alumni.prenom));
  return lignes.map((l) => ({
    numero: l.numero,
    nom: `${l.prenom} ${l.nom}`,
    promotion: l.promotion,
    promotionOrdre: l.promotionOrdre,
    structure: l.structure ?? undefined,
    poste: l.poste ?? undefined,
    domaines: l.domaines,
    decede: l.decede,
  }));
}
