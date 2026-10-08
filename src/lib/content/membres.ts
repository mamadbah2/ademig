import { membres } from "@/db/donnees-initiales/membres";
import type { MembreInitial } from "@/db/donnees-initiales/types";
import { paragraphesEnHtml } from "@/lib/html";
import type { Member } from "./types";

const versMembre = (m: MembreInitial): Member => ({ ...m, bio: m.bio && paragraphesEnHtml(m.bio) });

export async function getMembres() {
  return membres.map(versMembre);
}

export async function getMembre(slug: string) {
  const m = membres.find((x) => x.slug === slug);
  return m && versMembre(m);
}
