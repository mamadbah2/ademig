"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { activerCompte } from "@/db/operations/invitations";
import {
  type Resultat,
  lireFormulaire,
  resultatDErreur,
} from "@/lib/admin/resultat";
import { auth } from "@/lib/auth";

const schema = z
  .object({
    motDePasse: z
      .string()
      .min(12, "12 caractères minimum.")
      .max(128, "128 caractères maximum."),
    confirmation: z.string(),
  })
  .refine((v) => v.motDePasse === v.confirmation, {
    path: ["confirmation"],
    message: "Les deux mots de passe ne correspondent pas.",
  });

// Action publique : le jeton d'invitation est la seule autorisation. Le jeton est lié par `bind`.
export async function activer(
  jeton: string,
  _etat: Resultat | null,
  donnees: FormData,
): Promise<Resultat> {
  const saisie = lireFormulaire(schema, donnees);
  if (!saisie.ok) return saisie.resultat;

  let connecte = false;
  try {
    const { email } = await activerCompte(db, jeton, saisie.data.motDePasse);
    try {
      // Le plugin nextCookies pose le cookie de session.
      await auth.api.signInEmail({
        body: { email, password: saisie.data.motDePasse },
        headers: await headers(),
      });
      connecte = true;
    } catch {
      // Le compte est activé ; si la connexion automatique échoue, le membre se connecte à la main.
    }
  } catch (erreur) {
    const resultat = resultatDErreur(erreur);
    if (resultat) return resultat;
    throw erreur;
  }
  redirect(connecte ? "/espace-membre?bienvenue=1" : "/connexion");
}
