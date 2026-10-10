"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as operations from "@/db/operations/actualites";
import { CONFLIT, type Intention } from "@/db/operations/commun";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaEnvoiActualite } from "@/lib/validation/actualites";

export type ResultatActualite = Resultat<{ version: string }>;

const INTROUVABLE = { ok: false, message: "Actualité introuvable." } as const;
const MESSAGES: Record<Intention, string> = {
  enregistrer: "Modifications enregistrées.",
  publier: "Actualité publiée.",
  depublier: "Actualité retirée du site.",
};

function invalider(id?: string) {
  revalidateTag(TAGS.actualites, { expire: 0 });
  revalidatePath("/admin/actualites");
  if (id) revalidatePath(`/admin/actualites/${id}`);
}

function lire(donnees: FormData) {
  return schemaEnvoiActualite.safeParse(Object.fromEntries(donnees));
}

// Retire les champs de contrôle du formulaire qui ne sont pas des colonnes.
function sansMeta<T extends { modifierSlug: boolean; version?: string }>({ modifierSlug, version, ...champs }: T) {
  void modifierSlug;
  void version;
  return champs;
}

export async function creerActualite(_etat: ResultatActualite | null, donnees: FormData): Promise<ResultatActualite> {
  const resultat = await action<{ id: string }>("editeur", async () => {
    const saisie = lire(donnees);
    if (!saisie.success) return erreursDe(saisie.error);
    const { intention, ...autres } = saisie.data;
    const champs = sansMeta(autres);
    const { id } = await operations.creerActualite(db, champs, intention);
    invalider();
    return { ok: true, donnees: { id } };
  });
  // La redirection se fait hors de `action()` : elle lève une exception propre à Next.
  if (resultat.ok) redirect(`/admin/actualites/${resultat.donnees!.id}?cree=1`);
  return resultat;
}

export async function enregistrerActualite(
  id: string,
  _etat: ResultatActualite | null,
  donnees: FormData,
): Promise<ResultatActualite> {
  return action<{ version: string }>("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    const saisie = lire(donnees);
    if (!saisie.success) return erreursDe(saisie.error);
    const { intention, modifierSlug, version, ...champs } = saisie.data;
    if (!version) return { ok: false, message: CONFLIT };
    const r = await operations.modifierActualite(db, id, champs, { version, intention, modifierSlug });
    invalider(id);
    return { ok: true, message: MESSAGES[intention], donnees: { version: r.version } };
  });
}

export async function supprimerActualiteAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    await operations.supprimerActualite(db, id);
    invalider();
    return { ok: true, message: "Actualité supprimée." };
  });
}
