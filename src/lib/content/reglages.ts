import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { lireReglages } from "@/db/requetes/reglages";
import { TAGS } from "./tags";

export const getReglages = unstable_cache(() => lireReglages(db), ["reglages"], { tags: [TAGS.reglages] });
