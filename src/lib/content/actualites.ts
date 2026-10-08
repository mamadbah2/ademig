import { actualites } from "@/db/donnees-initiales/actualites";
import type { ActualiteInitiale } from "@/db/donnees-initiales/types";
import { paragraphesEnHtml } from "@/lib/html";
import type { Actualite } from "./types";

const versActualite = (a: ActualiteInitiale): Actualite => ({ ...a, corps: paragraphesEnHtml(a.corps) });

export async function getActualites() {
  return actualites.map(versActualite).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getActualite(slug: string) {
  const a = actualites.find((x) => x.slug === slug);
  return a && versActualite(a);
}
