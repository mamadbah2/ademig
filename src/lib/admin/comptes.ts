"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { changerActivation, changerRole, creerCompte, trouverCompte } from "@/db/operations/comptes";
import { ErreurMetier } from "@/db/operations/erreurs";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat } from "@/lib/admin/resultat";
import { auth } from "@/lib/auth";
import { schemaInvitation, schemaRole } from "@/lib/validation/comptes";

async function envoyerLien(email: string) {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: "/admin/reinitialiser" } });
}

export async function inviterCompte(_etat: Resultat | null, donnees: FormData): Promise<Resultat> {
  return action("superadmin", async () => {
    const saisie = schemaInvitation.safeParse(Object.fromEntries(donnees));
    if (!saisie.success) return erreursDe(saisie.error);
    await creerCompte(db, saisie.data);
    await envoyerLien(saisie.data.email);
    revalidatePath("/admin/comptes");
    return { ok: true, message: `Invitation envoyée à ${saisie.data.email}.` };
  });
}

export async function renvoyerInvitation(id: string): Promise<Resultat> {
  return action("superadmin", async () => {
    const compte = await trouverCompte(db, id);
    if (!compte) throw new ErreurMetier("Compte introuvable.");
    if (compte.aMotDePasse) throw new ErreurMetier("Ce compte a déjà défini son mot de passe.");
    await envoyerLien(compte.email);
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
