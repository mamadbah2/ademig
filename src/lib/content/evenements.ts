import { evenements } from "@/db/donnees-initiales/evenements";
import type { EvenementInitial } from "@/db/donnees-initiales/types";
import { paragraphesEnHtml } from "@/lib/html";
import type { Evenement } from "./types";

const versEvenement = (e: EvenementInitial): Evenement => ({ ...e, corps: paragraphesEnHtml(e.corps) });

export async function getEvenements() {
  return evenements.map(versEvenement).sort((a, b) => b.debut.localeCompare(a.debut));
}

export async function getEvenement(slug: string) {
  const e = evenements.find((x) => x.slug === slug);
  return e && versEvenement(e);
}
