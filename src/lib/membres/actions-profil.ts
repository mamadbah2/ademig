"use server";

import { del } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db";
import { mediaExiste } from "@/db/operations/media";
import { modifierProfil } from "@/db/operations/profil";
import { lireFormulaire, type Resultat, resultatDErreur } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { exigerMembre } from "@/lib/session";
import { estUrlBlob } from "@/lib/validation/media";
import { schemaProfil } from "./profil";

const SANS_FICHE = "Aucune fiche membre n'est liée à votre compte : contactez le bureau.";

// Efface de Blob un portrait envoyé mais jamais enregistré (saisie refusée, panne, abandon).
async function nettoyerEnvoiOrphelin(url: unknown) {
  try {
    if (typeof url !== "string" || !estUrlBlob(url) || !new URL(url).pathname.startsWith("/membres/")) return;
    if (await mediaExiste(db, url)) return;
    await del(url);
  } catch (erreur) {
    console.error("Nettoyage du fichier orphelin impossible :", erreur);
  }
}

// La fiche modifiée est celle du compte connecté : aucun identifiant n'est lu dans le formulaire.
export async function enregistrerProfil(_etat: Resultat | null, donnees: FormData): Promise<Resultat> {
  const m = await exigerMembre();
  if ("sansFiche" in m) return { ok: false, message: SANS_FICHE };

  const saisie = lireFormulaire(schemaProfil, donnees);
  if (!saisie.ok) {
    await nettoyerEnvoiOrphelin(donnees.get("photoUrl"));
    return saisie.resultat;
  }

  try {
    const r = await modifierProfil(db, m.userId, saisie.data);
    // Une panne d'effacement ne doit pas faire échouer un profil déjà enregistré.
    if (r?.photoRemplacee) {
      try {
        await del(r.photoRemplacee.url);
      } catch (erreur) {
        console.error("Effacement de l'ancien portrait impossible :", erreur);
      }
    }
  } catch (erreur) {
    await nettoyerEnvoiOrphelin(saisie.data.photoUrl);
    const resultat = resultatDErreur(erreur);
    if (resultat) return resultat;
    throw erreur;
  }

  revalidateTag(TAGS.membres, { expire: 0 });
  revalidateTag(TAGS.bureau, { expire: 0 });
  revalidatePath("/espace-membre");
  revalidatePath("/espace-membre/profil");
  return { ok: true, message: "Profil enregistré." };
}
