import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { lireBureau, listerPartenaires } from "@/db/requetes/organisation";
import { TAGS } from "./tags";

export type { Bureau } from "@/db/requetes/organisation";

export const getBureau = unstable_cache(() => lireBureau(db), ["bureau"], {
  tags: [TAGS.bureau, TAGS.membres, TAGS.media],
});
export const getPartenaires = unstable_cache(() => listerPartenaires(db), ["partenaires"], {
  tags: [TAGS.partenaires, TAGS.media],
});
