import { type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export type Intention = "enregistrer" | "publier" | "depublier";

export const CONFLIT = "Ce contenu a été modifié entre-temps. Rechargez la page pour voir la dernière version.";

// `maj_le` peut être stocké à la microseconde ; le formulaire ne renvoie que la milliseconde.
export function memeVersion(colonne: AnyPgColumn, version: string): SQL {
  return sql`date_trunc('milliseconds', ${colonne}) = ${version}::timestamptz`;
}
