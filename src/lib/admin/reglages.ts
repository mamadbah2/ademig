"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { z } from "zod";
import { db } from "@/db";
import { modifierReglages, type PartieReglages } from "@/db/operations/reglages";
import { action } from "@/lib/admin/action";
import { lireFormulaire, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaCoordonnees, schemaReseaux, schemaTextes } from "@/lib/validation/reglages";

export type ResultatReglages = Resultat<{ version: string }>;

// Les trois onglets suivent le même chemin : validation, écriture de leur seule partie, invalidation.
function enregistrer(schema: z.ZodType<PartieReglages & { version?: string }>, donnees: FormData, message: string) {
  return action<{ version: string }>("editeur", async () => {
    const saisie = lireFormulaire(schema, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { version, ...partie } = saisie.data;
    // Sans version, la ligne n'existait pas à l'affichage : l'opération la crée, ou signale le conflit.
    const r = await modifierReglages(db, partie, { version: version ?? null });
    revalidateTag(TAGS.reglages, { expire: 0 });
    revalidatePath("/admin/reglages");
    return { ok: true, message, donnees: { version: r.version } };
  });
}

export async function enregistrerCoordonnees(_etat: ResultatReglages | null, donnees: FormData): Promise<ResultatReglages> {
  return enregistrer(schemaCoordonnees, donnees, "Coordonnées enregistrées.");
}

export async function enregistrerReseaux(_etat: ResultatReglages | null, donnees: FormData): Promise<ResultatReglages> {
  return enregistrer(schemaReseaux, donnees, "Réseaux enregistrés.");
}

export async function enregistrerTextes(_etat: ResultatReglages | null, donnees: FormData): Promise<ResultatReglages> {
  return enregistrer(schemaTextes, donnees, "Textes enregistrés.");
}
