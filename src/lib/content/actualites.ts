import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerActualites, trouverActualite } from "@/db/requetes/actualites";
import { TAGS } from "./tags";

// Les photos viennent de la médiathèque : un texte alternatif modifié doit se voir ici.
const options = { tags: [TAGS.actualites, TAGS.media] };

export const getActualites = unstable_cache(() => listerActualites(db), ["actualites"], options);
export const getActualite = unstable_cache((slug: string) => trouverActualite(db, slug), ["actualite"], options);
