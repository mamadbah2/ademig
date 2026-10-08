"use server";

import { del } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db";
import { creerMedia, listerMedias, type Media, modifierMedia, supprimerMedia } from "@/db/operations/media";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { estUrlBlob, schemaMajMedia, schemaNouveauMedia } from "@/lib/validation/media";

// Une image peut apparaître partout sur le site : on invalide tout le contenu public.
function invaliderContenus() {
  for (const tag of Object.values(TAGS)) {
    if (tag !== TAGS.reglages) revalidateTag(tag, { expire: 0 });
  }
}

export async function enregistrerMedia(donnees: unknown): Promise<Resultat<{ id: string }>> {
  return action<{ id: string }>("editeur", async (session) => {
    const saisie = schemaNouveauMedia.safeParse(donnees);
    if (!saisie.success) {
      // Le fichier est déjà dans Blob : on ne le laisse pas orphelin.
      const url = (donnees as { url?: unknown } | null)?.url;
      if (typeof url === "string" && estUrlBlob(url)) await del(url);
      return erreursDe(saisie.error);
    }
    const media = await creerMedia(db, saisie.data, session.userId);
    revalidatePath("/admin/medias");
    return { ok: true, message: "Image ajoutée.", donnees: { id: media.id } };
  });
}

export async function mettreAJourMedia(id: string, _etat: Resultat | null, donnees: FormData): Promise<Resultat> {
  return action("editeur", async () => {
    const saisie = schemaMajMedia.safeParse(Object.fromEntries(donnees));
    if (!saisie.success) return erreursDe(saisie.error);
    await modifierMedia(db, id, saisie.data);
    invaliderContenus();
    revalidatePath(`/admin/medias/${id}`);
    return { ok: true, message: "Description enregistrée." };
  });
}

export async function supprimerMediaAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    const { url, pathname } = await supprimerMedia(db, id);
    // Les fichiers de /public ne sont jamais effacés du disque.
    if (pathname) await del(url);
    invaliderContenus();
    revalidatePath("/admin/medias");
    return { ok: true, message: "Image supprimée." };
  });
}

export async function chercherMedias(recherche: string): Promise<Resultat<Media[]>> {
  return action<Media[]>("editeur", async () => ({ ok: true, donnees: await listerMedias(db, recherche) }));
}
