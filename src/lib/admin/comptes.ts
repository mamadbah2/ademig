"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { changerActivation, changerRole, creerCompte, trouverCompte } from "@/db/operations/comptes";
import { ErreurMetier } from "@/db/operations/erreurs";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat } from "@/lib/admin/resultat";
import { auth } from "@/lib/auth";
import { emailsConfigures } from "@/lib/emails";
import { schemaInvitation, schemaRole } from "@/lib/validation/comptes";

const EMAILS_NON_CONFIGURES: Resultat = {
  ok: false,
  message: "Les emails ne sont pas configurés sur ce site : l'invitation ne peut pas être envoyée. Contactez l'équipe technique.",
};

// Limite connue : Better Auth envoie l'email dans une tâche de fond et en avale les erreurs,
// donc une panne de Resend n'est pas visible ici (d'où le contrôle préalable emailsConfigures).
// Renvoie false si l'envoi échoue (journalisé sans lien ni jeton).
async function envoyerLien(email: string): Promise<boolean> {
  try {
    await auth.api.requestPasswordReset({ body: { email, redirectTo: "/admin/reinitialiser" } });
    return true;
  } catch (erreur) {
    console.error("Envoi du lien d'invitation impossible :", erreur instanceof Error ? erreur.message : "erreur inconnue");
    return false;
  }
}

export async function inviterCompte(_etat: Resultat | null, donnees: FormData): Promise<Resultat> {
  return action("superadmin", async () => {
    const saisie = schemaInvitation.safeParse(Object.fromEntries(donnees));
    if (!saisie.success) return erreursDe(saisie.error);
    if (!emailsConfigures()) return EMAILS_NON_CONFIGURES;
    await creerCompte(db, saisie.data);
    const envoye = await envoyerLien(saisie.data.email);
    revalidatePath("/admin/comptes");
    if (!envoye) {
      return {
        ok: false,
        message: "Compte créé, mais l'email d'invitation n'a pas pu être envoyé. Utilisez « Renvoyer l'invitation » sur sa ligne.",
      };
    }
    return { ok: true, message: `Invitation envoyée à ${saisie.data.email}.` };
  });
}

export async function renvoyerInvitation(id: string): Promise<Resultat> {
  return action("superadmin", async () => {
    const compte = await trouverCompte(db, id);
    if (!compte) throw new ErreurMetier("Compte introuvable.");
    if (compte.aMotDePasse) throw new ErreurMetier("Ce compte a déjà défini son mot de passe.");
    if (!emailsConfigures()) return EMAILS_NON_CONFIGURES;
    if (!(await envoyerLien(compte.email))) {
      return { ok: false, message: "L'email d'invitation n'a pas pu être envoyé. Réessayez plus tard." };
    }
    return { ok: true, message: `Invitation renvoyée à ${compte.email}.` };
  });
}

export async function modifierRole(id: string, role: string): Promise<Resultat> {
  return action("superadmin", async (session) => {
    const nouveauRole = schemaRole.safeParse(role);
    if (!nouveauRole.success) throw new ErreurMetier("Rôle inconnu.");
    await changerRole(db, { acteurId: session.userId, cibleId: id, role: nouveauRole.data });
    revalidatePath("/admin/comptes");
    return { ok: true, message: "Rôle mis à jour." };
  });
}

export async function modifierActivation(id: string, actif: boolean): Promise<Resultat> {
  return action("superadmin", async (session) => {
    await changerActivation(db, { acteurId: session.userId, cibleId: id, actif });
    revalidatePath("/admin/comptes");
    return { ok: true, message: actif ? "Compte réactivé." : "Compte désactivé : ses sessions sont fermées." };
  });
}
