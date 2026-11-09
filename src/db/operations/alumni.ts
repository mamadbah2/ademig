import { notInArray, sql } from "drizzle-orm";
import { alumni } from "@/db/schema";
import type { Db } from "@/db/types";
import type { LigneAlumni } from "@/lib/alumni/nettoyage";

// Aligne la table sur le fichier importé : les lignes sont mises à jour par numéro de diplôme
// et celles qui ont disparu du fichier sont retirées.
export async function remplacerAlumni(db: Db, lignes: LigneAlumni[]) {
  if (lignes.length === 0) throw new Error("Import refusé : aucune ligne à importer.");
  await db.transaction(async (tx) => {
    await tx
      .insert(alumni)
      .values(lignes)
      .onConflictDoUpdate({
        target: alumni.numero,
        set: {
          prenom: sql`excluded.prenom`,
          nom: sql`excluded.nom`,
          promotion: sql`excluded.promotion`,
          promotionOrdre: sql`excluded.promotion_ordre`,
          structure: sql`excluded.structure`,
          poste: sql`excluded.poste`,
          domaines: sql`excluded.domaines`,
          decede: sql`excluded.decede`,
          majLe: new Date(),
        },
      });
    await tx.delete(alumni).where(
      notInArray(
        alumni.numero,
        lignes.map((l) => l.numero),
      ),
    );
  });
}
