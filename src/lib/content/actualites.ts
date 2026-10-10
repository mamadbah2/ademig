import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerActualites, trouverActualite } from "@/db/requetes/actualites";
import { apercuAutorise } from "@/lib/apercu";
import { TAGS } from "./tags";
import type { Actualite } from "./types";

// Les photos viennent de la médiathèque : un texte alternatif modifié doit se voir ici.
const options = { tags: [TAGS.actualites, TAGS.media] };

export const getActualites = unstable_cache(() => listerActualites(db), ["actualites"], options);
export const getActualite = unstable_cache((slug: string) => trouverActualite(db, slug), ["actualite"], options);

// En aperçu, lecture directe (brouillons compris) ; sinon, version en cache et publiée.
export async function getActualitePourPage(slug: string): Promise<Actualite | undefined> {
  if (await apercuAutorise()) return trouverActualite(db, slug, { brouillons: true });
  return getActualite(slug);
}
