import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerEvenements, trouverEvenement } from "@/db/requetes/evenements";
import { TAGS } from "./tags";

const options = { tags: [TAGS.evenements, TAGS.media] };

export const getEvenements = unstable_cache(() => listerEvenements(db), ["evenements"], options);
export const getEvenement = unstable_cache((slug: string) => trouverEvenement(db, slug), ["evenement"], options);
