import { and, eq, ne, type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Tx } from "@/db/types";
import { ErreurMetier } from "./erreurs";

export type Intention = "enregistrer" | "publier" | "depublier";
export type Statut = "brouillon" | "publie";

export const CONFLIT = "Ce contenu a été modifié entre-temps. Rechargez la page pour voir la dernière version.";

// `maj_le` peut être stocké à la microseconde ; le formulaire ne renvoie que la milliseconde.
export function memeVersion(colonne: AnyPgColumn, version: string): SQL {
  return sql`date_trunc('milliseconds', ${colonne}) = ${version}::timestamptz`;
}

// Publier fixe la date de première publication ; dépublier la garde (le lien a pu être partagé).
export function publication(
  intention: Intention,
  actuel: { statut: Statut; publieLe: Date | null } | null,
): { statut: Statut; publieLe: Date | null } {
  const statut = intention === "publier" ? "publie" : intention === "depublier" ? "brouillon" : (actuel?.statut ?? "brouillon");
  return { statut, publieLe: actuel?.publieLe ?? (statut === "publie" ? new Date() : null) };
}

// Un lien déjà publié ne change que sur demande explicite. Renvoie vrai si le lien change.
export function exigerSlugModifiable(
  actuel: { slug: string; publieLe: Date | null },
  slug: string,
  modifierSlug: boolean,
  message: string,
): boolean {
  if (slug === actuel.slug) return false;
  if (actuel.publieLe && !modifierSlug) throw new ErreurMetier(message, "slug");
  return true;
}

export async function verifierSlugLibre(
  tx: Tx,
  colonnes: { table: PgTable; id: AnyPgColumn; slug: AnyPgColumn },
  slug: string,
  message: string,
  saufId?: string,
) {
  const memeSlug = eq(colonnes.slug, slug);
  const [autre] = await tx
    .select({ id: colonnes.id })
    .from(colonnes.table)
    .where(saufId ? and(memeSlug, ne(colonnes.id, saufId)) : memeSlug)
    .limit(1);
  if (autre) throw new ErreurMetier(message, "slug");
}
