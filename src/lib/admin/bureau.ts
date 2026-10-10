"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as operations from "@/db/operations/bureau";
import { CONFLIT } from "@/db/operations/commun";
import { action } from "@/lib/admin/action";
import { lireFormulaire, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaEnvoiMandat, schemaNouveauMandat } from "@/lib/validation/bureau";

export type ResultatMandat = Resultat<{ version: string }>;

const INTROUVABLE = { ok: false, message: "Mandat introuvable." } as const;
const idValide = (id: string) => z.uuid().safeParse(id).success;

// Le bureau en place donne aussi la fonction affichée sur les fiches des membres.
function invalider(id?: string) {
  revalidateTag(TAGS.bureau, { expire: 0 });
  revalidateTag(TAGS.membres, { expire: 0 });
  revalidatePath("/admin/bureau");
  revalidatePath("/admin/membres");
  if (id) revalidatePath(`/admin/bureau/${id}`);
}

export async function creerMandatAction(_etat: Resultat | null, donnees: FormData): Promise<Resultat> {
  const resultat = await action<{ id: string }>("editeur", async () => {
    const saisie = lireFormulaire(schemaNouveauMandat, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { reprendreCommissions, ...champs } = saisie.data;
    const { id } = await operations.creerMandat(db, champs, { reprendreCommissions });
    invalider();
    return { ok: true, donnees: { id } };
  });
  // La redirection se fait hors de `action()` : elle lève une exception propre à Next.
  if (resultat.ok) redirect(`/admin/bureau/${resultat.donnees!.id}?cree=1`);
  return resultat;
}

export async function enregistrerMandatAction(id: string, _etat: ResultatMandat | null, donnees: FormData): Promise<ResultatMandat> {
  return action<{ version: string }>("editeur", async () => {
    if (!idValide(id)) return INTROUVABLE;
    const saisie = lireFormulaire(schemaEnvoiMandat, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { version, ...champs } = saisie.data;
    if (!version) return { ok: false, message: CONFLIT };
    const r = await operations.enregistrerMandat(db, id, champs, { version });
    invalider(id);
    return { ok: true, message: "Mandat enregistré.", donnees: { version: r.version } };
  });
}

export async function activerMandatAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!idValide(id)) return INTROUVABLE;
    await operations.activerMandat(db, id);
    invalider(id);
    return { ok: true, message: "Mandat activé : il est désormais affiché sur le site." };
  });
}

export async function supprimerMandatAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!idValide(id)) return INTROUVABLE;
    await operations.supprimerMandat(db, id);
    invalider();
    return { ok: true, message: "Mandat supprimé." };
  });
}
