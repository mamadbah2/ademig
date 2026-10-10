"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { CONFLIT } from "@/db/operations/commun";
import * as operations from "@/db/operations/partenaires";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaEnvoiPartenaire } from "@/lib/validation/partenaires";

export type ResultatPartenaire = Resultat<{ version: string }>;

const INTROUVABLE = { ok: false, message: "Partenaire introuvable." } as const;

function invalider(id?: string) {
  revalidateTag(TAGS.partenaires, { expire: 0 });
  revalidatePath("/admin/partenaires");
  if (id) revalidatePath(`/admin/partenaires/${id}`);
}

function lire(donnees: FormData) {
  return schemaEnvoiPartenaire.safeParse(Object.fromEntries(donnees));
}

export async function creerPartenaire(_etat: ResultatPartenaire | null, donnees: FormData): Promise<ResultatPartenaire> {
  const resultat = await action<{ id: string }>("editeur", async () => {
    const saisie = lire(donnees);
    if (!saisie.success) return erreursDe(saisie.error);
    const { version, ...champs } = saisie.data;
    void version;
    const { id } = await operations.creerPartenaire(db, champs);
    invalider();
    return { ok: true, donnees: { id } };
  });
  // La redirection se fait hors de `action()` : elle lève une exception propre à Next.
  if (resultat.ok) redirect(`/admin/partenaires/${resultat.donnees!.id}?cree=1`);
  return resultat;
}

export async function enregistrerPartenaire(
  id: string,
  _etat: ResultatPartenaire | null,
  donnees: FormData,
): Promise<ResultatPartenaire> {
  return action<{ version: string }>("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    const saisie = lire(donnees);
    if (!saisie.success) return erreursDe(saisie.error);
    const { version, ...champs } = saisie.data;
    if (!version) return { ok: false, message: CONFLIT };
    const r = await operations.modifierPartenaire(db, id, champs, { version });
    invalider(id);
    return { ok: true, message: "Partenaire enregistré.", donnees: { version: r.version } };
  });
}

export async function supprimerPartenaireAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    await operations.supprimerPartenaire(db, id);
    invalider();
    return { ok: true, message: "Partenaire supprimé." };
  });
}

export async function deplacerPartenaireAction(id: string, sens: -1 | 1): Promise<Resultat> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    if (sens !== -1 && sens !== 1) return { ok: false, message: "Déplacement impossible." };
    await operations.deplacerPartenaire(db, id, sens);
    invalider();
    return { ok: true };
  });
}
