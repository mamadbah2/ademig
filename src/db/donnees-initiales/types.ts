import type { Actualite, Evenement, Member } from "@/lib/content/types";

// Format historique des contenus écrits en dur : un paragraphe par entrée.
export type ActualiteInitiale = Omit<Actualite, "corps"> & { corps: string[] };
export type EvenementInitial = Omit<Evenement, "corps"> & { corps: string[] };
export type MembreInitial = Omit<Member, "bio"> & { bio?: string[] };
