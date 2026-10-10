import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerEvenements, trouverEvenement } from "@/db/requetes/evenements";
import { apercuAutorise } from "@/lib/apercu";
import { TAGS } from "./tags";
import type { Evenement } from "./types";

const options = { tags: [TAGS.evenements, TAGS.media] };

export const getEvenements = unstable_cache(() => listerEvenements(db), ["evenements"], options);
export const getEvenement = unstable_cache((slug: string) => trouverEvenement(db, slug), ["evenement"], options);

// En aperçu, lecture directe (brouillons compris) ; sinon, version en cache et publiée.
export async function getEvenementPourPage(slug: string): Promise<Evenement | undefined> {
  if (await apercuAutorise()) return trouverEvenement(db, slug, { brouillons: true });
  return getEvenement(slug);
}
