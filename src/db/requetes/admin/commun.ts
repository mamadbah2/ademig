import type { media } from "@/db/schema";

export const PAR_PAGE = 25;

// Image telle que les formulaires de l'admin l'affichent et la renvoient.
export type MediaChoisi = { id: string; url: string; alt: string; width: number; height: number; mime: string };

export function versMediaChoisi(m: typeof media.$inferSelect): MediaChoisi {
  return { id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height, mime: m.mime };
}

// Échappe %, _ et \ pour une recherche littérale avec ILIKE.
export function motifRecherche(texte: string): string {
  return `%${texte.replace(/[\\%_]/g, "\\$&")}%`;
}
