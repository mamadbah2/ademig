"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { ErreurMetier } from "@/db/operations/erreurs";
import { desactiverCompteMembre, genererLienInvitation, inviterLesNonInvites, inviterParEmail, reactiverCompteMembre, verifierInvitable } from "@/db/operations/invitations";
import { action } from "@/lib/admin/action";
import type { Resultat } from "@/lib/admin/resultat";
import { urlActivation } from "@/lib/membres/url";

const idCompte = z.string().min(1).max(100);

function lireId(id: string): string {
  const lu = idCompte.safeParse(id);
  if (!lu.success) throw new ErreurMetier("Compte introuvable.");
  return lu.data;
}

export async function renvoyerInvitationMembre(userId: string): Promise<Resultat> {
  return action("superadmin", async () => {
    const id = lireId(userId);
    await verifierInvitable(db, id);
    await inviterParEmail(db, id, { prioritaire: true });
    revalidatePath("/admin/membres");
    return { ok: true, message: "Invitation mise en file : elle partira en premier au prochain envoi." };
  });
}

// Le lien contient un jeton : il n'est jamais journalisé ni répété dans un message.
export async function copierLienInvitation(userId: string): Promise<Resultat<{ url: string }>> {
  return action("superadmin", async () => {
    const id = lireId(userId);
    await verifierInvitable(db, id);
    const { jeton } = await genererLienInvitation(db, id);
    revalidatePath("/admin/membres");
    return { ok: true, donnees: { url: urlActivation(jeton) } };
  });
}

export async function inviterTousLesNonInvites(): Promise<Resultat<{ invites: number }>> {
  return action("superadmin", async () => {
    const invites = await inviterLesNonInvites(db);
    revalidatePath("/admin/membres");
    return {
      ok: true,
      message: invites === 0 ? "Tous les membres ont déjà été invités." : `${invites} invitation${invites > 1 ? "s" : ""} mise${invites > 1 ? "s" : ""} en file.`,
      donnees: { invites },
    };
  });
}

export async function desactiverMembre(userId: string): Promise<Resultat> {
  return action("superadmin", async (session) => {
    await desactiverCompteMembre(db, { acteurId: session.userId, cibleId: lireId(userId) });
    revalidatePath("/admin/membres");
    return { ok: true, message: "Compte désactivé : ses sessions sont fermées et ses liens d'invitation ne fonctionnent plus." };
  });
}

export async function reactiverMembre(userId: string): Promise<Resultat> {
  return action("superadmin", async () => {
    await reactiverCompteMembre(db, lireId(userId));
    revalidatePath("/admin/membres");
    return { ok: true, message: "Compte réactivé." };
  });
}
