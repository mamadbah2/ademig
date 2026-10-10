"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as operations from "@/db/operations/evenements";
import { CONFLIT, type Intention } from "@/db/operations/commun";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat, sansMeta } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaEnvoiEvenement } from "@/lib/validation/evenements";

export type ResultatEvenement = Resultat<{ version: string }>;

const INTROUVABLE = { ok: false, message: "Événement introuvable." } as const;
const MESSAGES: Record<Intention, string> = {
  enregistrer: "Modifications enregistrées.",
  publier: "Événement publié.",
  depublier: "Événement retiré du site.",
};

function invalider(id?: string) {
  revalidateTag(TAGS.evenements, { expire: 0 });
  revalidatePath("/admin/evenements");
  if (id) revalidatePath(`/admin/evenements/${id}`);
}

function lire(donnees: FormData) {
  return schemaEnvoiEvenement.safeParse(Object.fromEntries(donnees));
}

export async function creerEvenement(_etat: ResultatEvenement | null, donnees: FormData): Promise<ResultatEvenement> {
  const resultat = await action<{ id: string }>("editeur", async () => {
    const saisie = lire(donnees);
    if (!saisie.success) return erreursDe(saisie.error);
    const { intention, ...autres } = saisie.data;
    const champs = sansMeta(autres);
    const { id } = await operations.creerEvenement(db, champs, intention);
    invalider();
    return { ok: true, donnees: { id } };
  });
  // La redirection se fait hors de `action()` : elle lève une exception propre à Next.
  if (resultat.ok) redirect(`/admin/evenements/${resultat.donnees!.id}?cree=1`);
  return resultat;
}

export async function enregistrerEvenement(
  id: string,
  _etat: ResultatEvenement | null,
  donnees: FormData,
): Promise<ResultatEvenement> {
  return action<{ version: string }>("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    const saisie = lire(donnees);
    if (!saisie.success) return erreursDe(saisie.error);
    const { intention, modifierSlug, version, ...champs } = saisie.data;
    if (!version) return { ok: false, message: CONFLIT };
    const r = await operations.modifierEvenement(db, id, champs, { version, intention, modifierSlug });
    invalider(id);
    return { ok: true, message: MESSAGES[intention], donnees: { version: r.version } };
  });
}

export async function supprimerEvenementAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    await operations.supprimerEvenement(db, id);
    invalider();
    return { ok: true, message: "Événement supprimé." };
  });
}
