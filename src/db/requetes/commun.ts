import type { Photo } from "@/lib/content/types";
import type { media } from "@/db/schema";

type LigneMedia = typeof media.$inferSelect;

export function versPhoto(m: LigneMedia): Photo {
  return { src: m.url, alt: m.alt, width: m.width, height: m.height, credit: m.credit ?? undefined };
}

// Les types du site utilisent des champs facultatifs plutôt que des listes vides.
export function siNonVide<T>(liste: T[]): T[] | undefined {
  return liste.length > 0 ? liste : undefined;
}
