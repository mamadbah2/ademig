import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { AccesRefuse, aLeRole, type Role } from "@/lib/roles";

export type SessionAdmin = { userId: string; nom: string; email: string; role: Role };

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
