"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { CONFLIT } from "@/db/operations/commun";
import * as operations from "@/db/operations/membres";
import { action } from "@/lib/admin/action";
import { lireFormulaire, type Resultat, sansMeta } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaEnvoiMembre } from "@/lib/validation/membres";

export type ResultatMembre = Resultat<{ version: string }>;

const INTROUVABLE = { ok: false, message: "Membre introuvable." } as const;

// Une fiche apparaît dans l'annuaire, sur sa page et sur la page Bureau.
function invalider(id?: string) {
  revalidateTag(TAGS.membres, { expire: 0 });
  revalidateTag(TAGS.bureau, { expire: 0 });
  revalidatePath("/admin/membres");
  revalidatePath("/admin/bureau");
  if (id) revalidatePath(`/admin/membres/${id}`);
}

export async function creerMembre(_etat: ResultatMembre | null, donnees: FormData): Promise<ResultatMembre> {
  const resultat = await action<{ id: string }>("editeur", async () => {
    const saisie = lireFormulaire(schemaEnvoiMembre, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { id } = await operations.creerMembre(db, sansMeta(saisie.data));
    invalider();
    return { ok: true, donnees: { id } };
  });
  // La redirection se fait hors de `action()` : elle lève une exception propre à Next.
  if (resultat.ok) redirect(`/admin/membres/${resultat.donnees!.id}?cree=1`);
  return resultat;
}

export async function enregistrerMembre(id: string, _etat: ResultatMembre | null, donnees: FormData): Promise<ResultatMembre> {
  return action<{ version: string }>("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    const saisie = lireFormulaire(schemaEnvoiMembre, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { modifierSlug, version, ...champs } = saisie.data;
    if (!version) return { ok: false, message: CONFLIT };
    const r = await operations.modifierMembre(db, id, champs, { version, modifierSlug });
    invalider(id);
    return { ok: true, message: "Fiche enregistrée.", donnees: { version: r.version } };
  });
}

export async function supprimerMembreAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    await operations.supprimerMembre(db, id);
    invalider();
    return { ok: true, message: "Membre supprimé." };
  });
}
