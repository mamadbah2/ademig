import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerMembres, trouverMembre } from "@/db/requetes/membres";
import { apercuAutorise } from "@/lib/apercu";
import { TAGS } from "./tags";
import type { Member } from "./types";

// La fonction d'un membre dépend du bureau en place.
const options = { tags: [TAGS.membres, TAGS.bureau, TAGS.media] };

export const getMembres = unstable_cache(() => listerMembres(db), ["membres"], options);
export const getMembre = unstable_cache((slug: string) => trouverMembre(db, slug), ["membre"], options);

// En aperçu, lecture directe (fiches masquées comprises) ; sinon, version en cache et visible.
export async function getMembrePourPage(slug: string): Promise<Member | undefined> {
  if (await apercuAutorise()) return trouverMembre(db, slug, { masques: true });
  return getMembre(slug);
}
