import { hashPassword } from "better-auth/crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { account, session, user } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Role } from "@/lib/roles";
import { ErreurMetier } from "./erreurs";

export type Compte = {
  id: string;
  nom: string;
  email: string;
  role: Role;
  actif: boolean;
  // Faux tant que l'invité n'a pas défini son mot de passe.
  aMotDePasse: boolean;
  creeLe: Date;
};

export const normaliserEmail = (email: string) => email.trim().toLowerCase();

export async function listerComptes(db: Db): Promise<Compte[]> {
  const lignes = await db.query.user.findMany({
    with: { accounts: { columns: { providerId: true } } },
    orderBy: (u, { asc }) => [asc(u.name)],
  });
  return lignes.map((u) => ({
    id: u.id,
    nom: u.name,
    email: u.email,
    role: u.role as Role,
    actif: u.actif,
    aMotDePasse: u.accounts.some((a) => a.providerId === "credential"),
    creeLe: u.createdAt,
  }));
}

export async function trouverCompte(db: Db, id: string): Promise<Compte | undefined> {
  return (await listerComptes(db)).find((c) => c.id === id);
}

export async function creerCompte(db: Db, donnees: { nom: string; email: string; role: Role }): Promise<{ id: string }> {
  const email = normaliserEmail(donnees.email);
  const existant = await db.query.user.findFirst({ where: eq(user.email, email), columns: { id: true } });
  if (existant) throw new ErreurMetier("Un compte existe déjà avec cette adresse email.", "email");
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name: donnees.nom.trim(), email, role: donnees.role, emailVerified: true });
  return { id };
}

// Pour le premier super-admin et les tests de bout en bout.
export async function creerCompteAvecMotDePasse(
  db: Db,
  donnees: { nom: string; email: string; role: Role; motDePasse: string },
): Promise<{ id: string }> {
  const { id } = await creerCompte(db, donnees);
  // Même forme que Better Auth : accountId = id de l'utilisateur, fournisseur « credential ».
  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(donnees.motDePasse),
  });
  return { id };
}

async function lireUtilisateur(db: Db, id: string) {
  const u = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!u) throw new ErreurMetier("Compte introuvable.");
  return u;
}

async function verifierQuIlResteUnSuperadmin(db: Db, cible: { id: string; role: string; actif: boolean }) {
  if (cible.role !== "superadmin" || !cible.actif) return;
  const [{ n }] = await db
    .select({ n: count() })
    .from(user)
    .where(and(eq(user.role, "superadmin"), eq(user.actif, true), ne(user.id, cible.id)));
  if (n === 0) throw new ErreurMetier("Il doit rester au moins un super-admin actif.");
}

export async function changerRole(db: Db, p: { acteurId: string; cibleId: string; role: Role }) {
  const cible = await lireUtilisateur(db, p.cibleId);
  if (cible.role === p.role) return;
  if (p.acteurId === p.cibleId) throw new ErreurMetier("Vous ne pouvez pas modifier votre propre rôle.");
  if (p.role !== "superadmin") await verifierQuIlResteUnSuperadmin(db, cible);
  await db.update(user).set({ role: p.role }).where(eq(user.id, p.cibleId));
}

export async function changerActivation(db: Db, p: { acteurId: string; cibleId: string; actif: boolean }) {
  const cible = await lireUtilisateur(db, p.cibleId);
  if (cible.actif === p.actif) return;
  if (p.acteurId === p.cibleId) throw new ErreurMetier("Vous ne pouvez pas désactiver votre propre compte.");
  if (!p.actif) await verifierQuIlResteUnSuperadmin(db, cible);
  await db.update(user).set({ actif: p.actif }).where(eq(user.id, p.cibleId));
  // Un compte désactivé perd l'accès tout de suite, pas à l'expiration de sa session.
  if (!p.actif) await db.delete(session).where(eq(session.userId, p.cibleId));
}
