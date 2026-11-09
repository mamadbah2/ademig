import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerAlumni } from "@/db/requetes/alumni";
import { TAGS } from "./tags";

// La liste exclut les membres : elle dépend aussi de leurs fiches.
export const getAlumni = unstable_cache(() => listerAlumni(db), ["alumni"], { tags: [TAGS.alumni, TAGS.membres] });
