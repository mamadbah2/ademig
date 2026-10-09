import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerMembres, trouverMembre } from "@/db/requetes/membres";
import { TAGS } from "./tags";

// La fonction d'un membre dépend du bureau en place.
const options = { tags: [TAGS.membres, TAGS.bureau, TAGS.media] };

export const getMembres = unstable_cache(() => listerMembres(db), ["membres"], options);
export const getMembre = unstable_cache((slug: string) => trouverMembre(db, slug), ["membre"], options);
