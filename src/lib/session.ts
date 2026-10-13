import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { ficheDuCompte } from "@/db/requetes/fiche-du-compte";
import { AccesRefuse, aLeRole, estRoleAdmin, type Role } from "@/lib/roles";

export { destinationApresConnexion } from "@/lib/roles";
export { estRouteMembrePublique } from "@/lib/admin/routes";

export type SessionAdmin = { userId: string; nom: string; email: string; role: Role };
export type SessionMembre = SessionAdmin & { membreId: string };

// Une seule lecture par requête, même si plusieurs composants la demandent.
export const lireSession = cache(async (): Promise<SessionAdmin | null> => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s || !s.user.actif) return null;
  return { userId: s.user.id, nom: s.user.name, email: s.user.email, role: s.user.role as Role };
});

export async function exigerSession(): Promise<SessionAdmin> {
  const s = await lireSession();
  if (!s) redirect("/admin/connexion");
  return s;
}

export async function exigerRole(role: Role): Promise<SessionAdmin> {
  const s = await exigerSession();
  if (!aLeRole(s.role, role)) throw new AccesRefuse();
  return s;
}

// Réservé aux rôles d'administration : un membre est renvoyé vers son espace.
export async function exigerAdmin(): Promise<SessionAdmin> {
  const s = await exigerSession();
  if (!estRoleAdmin(s.role)) redirect("/espace-membre");
  return s;
}

// Espace membre : tout compte connecté y entre ; sans fiche rattachée, la page explique la situation.
export async function exigerMembre(): Promise<SessionMembre | { sansFiche: true; session: SessionAdmin }> {
  const s = await lireSession();
  if (!s) redirect("/connexion");
  const fiche = await ficheDuCompte(db, s.userId);
  if (!fiche) return { sansFiche: true, session: s };
  return { ...s, membreId: fiche.id };
}
