import { hashPassword } from "better-auth/crypto";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { account, emailsFile, invitations, membres, session, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { contenuInvitationMembre } from "@/lib/emails";
import { hacherJeton, nouveauJeton } from "@/lib/membres/jetons";
import { ErreurMetier } from "./erreurs";
import { mettreEnFile } from "./emails-file";

export const DUREE_INVITATION_JOURS = 30;

// Crée une invitation ; les invitations non utilisées précédentes de ce compte sont supprimées.
export async function creerInvitation(db: Db, userId: string, maintenant = new Date()): Promise<{ jeton: string }> {
  const { jeton, hash } = nouveauJeton();
  const expireLe = new Date(maintenant.getTime() + DUREE_INVITATION_JOURS * 24 * 3600 * 1000);
  const ecrire = async (tx: Db) => {
    await tx.delete(invitations).where(and(eq(invitations.userId, userId), isNull(invitations.utiliseeLe)));
    await tx.insert(invitations).values({ userId, jetonHash: hash, expireLe, creeLe: maintenant });
  };
  // Déjà dans une transaction (`Tx` est un `Db`) : on écrit directement, sinon on en ouvre une.
  if ("rollback" in db) await ecrire(db);
  else await db.transaction(ecrire);
  return { jeton };
}

// Crée l'invitation et met l'email dans la file d'envoi (le cron quotidien l'enverra).
// `prioritaire` (« Renvoyer ») : l'email est antidaté d'un an pour partir au prochain passage du cron.
export async function inviterParEmail(
  db: Db,
  userId: string,
  urlActivation: (jeton: string) => string,
  { prioritaire = false }: { prioritaire?: boolean } = {},
): Promise<void> {
  const compte = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { email: true, name: true } });
  if (!compte) throw new ErreurMetier("Compte introuvable.");
  const fiche = await db.query.membres.findFirst({ where: eq(membres.userId, userId), columns: { nom: true } });
  await db.transaction(async (tx) => {
    // « Renvoyer » : l'ancien email encore en file porterait un lien désormais mort.
    await tx
      .delete(emailsFile)
      .where(and(eq(emailsFile.userId, userId), eq(emailsFile.type, "invitation"), eq(emailsFile.statut, "a_envoyer")));
    const { jeton } = await creerInvitation(tx, userId);
    const { sujet, html } = contenuInvitationMembre({ prenomNom: fiche?.nom ?? compte.name, url: urlActivation(jeton) });
    const creeLe = prioritaire ? new Date(Date.now() - 365 * 24 * 3600 * 1000) : undefined;
    await mettreEnFile(tx, { destinataire: compte.email, sujet, html, type: "invitation", userId, creeLe });
  });
}

// Une invitation active le compte (et le réactive) : on ne l'envoie qu'à un compte qui n'a jamais défini son mot de passe.
export async function verifierInvitable(db: Db, userId: string): Promise<void> {
  const compte = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { actif: true } });
  if (!compte) throw new ErreurMetier("Compte introuvable.");
  const mdp = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
    columns: { id: true },
  });
  if (!mdp) return;
  throw new ErreurMetier(
    compte.actif
      ? "Ce compte est déjà activé."
      : "Ce compte est désactivé : réactivez-le dans la rubrique Comptes plutôt que de renvoyer une invitation.",
  );
}

// Nouveau lien à transmettre à la main : l'ancien lien meurt et l'email encore en file, qui le porterait, est retiré.
export async function genererLienInvitation(db: Db, userId: string): Promise<{ jeton: string }> {
  const compte = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { id: true } });
  if (!compte) throw new ErreurMetier("Compte introuvable.");
  return db.transaction(async (tx) => {
    await tx
      .delete(emailsFile)
      .where(and(eq(emailsFile.userId, userId), eq(emailsFile.type, "invitation"), eq(emailsFile.statut, "a_envoyer")));
    return creerInvitation(tx, userId);
  });
}

// Rattrapage : met en file une invitation pour chaque compte de fiche sans mot de passe et jamais invité.
export async function inviterLesNonInvites(db: Db, urlActivation: (jeton: string) => string): Promise<number> {
  const fiches = await db.select({ userId: membres.userId }).from(membres).where(isNotNull(membres.userId));
  const suivi = await suiviInvitations(db, fiches.map((f) => f.userId!));
  // Un compte avec mot de passe mais désactivé relève de « Comptes », pas d'une invitation.
  const avecMotDePasse = new Set(
    (await db.select({ userId: account.userId }).from(account).where(eq(account.providerId, "credential"))).map((a) => a.userId),
  );
  const cibles = [...suivi.values()].filter((s) => s.statut === "a_inviter" && !avecMotDePasse.has(s.userId));
  for (const { userId } of cibles) await inviterParEmail(db, userId, urlActivation);
  return cibles.length;
}

export type EtatJeton =
  | { ok: true; userId: string; email: string; nom: string }
  | { ok: false; raison: "inconnu" | "expire" | "utilise" };

export async function verifierJeton(db: Db, jeton: string, maintenant = new Date()): Promise<EtatJeton> {
  const inv = await db.query.invitations.findFirst({ where: eq(invitations.jetonHash, hacherJeton(jeton)) });
  if (!inv) return { ok: false, raison: "inconnu" };
  if (inv.utiliseeLe) return { ok: false, raison: "utilise" };
  if (inv.expireLe < maintenant) return { ok: false, raison: "expire" };
  const u = await db.query.user.findFirst({ where: eq(user.id, inv.userId), columns: { email: true, name: true } });
  if (!u) return { ok: false, raison: "inconnu" };
  const fiche = await db.query.membres.findFirst({ where: eq(membres.userId, inv.userId), columns: { nom: true } });
  return { ok: true, userId: inv.userId, email: u.email, nom: fiche?.nom ?? u.name };
}

const DEJA_SERVI = "Ce lien a déjà servi : connectez-vous ou demandez un nouveau lien.";

export async function activerCompte(
  db: Db,
  jeton: string,
  motDePasse: string,
  maintenant = new Date(),
): Promise<{ email: string }> {
  return db.transaction(async (tx) => {
    const inv = await tx.query.invitations.findFirst({ where: eq(invitations.jetonHash, hacherJeton(jeton)) });
    if (!inv) throw new ErreurMetier("Ce lien n'est plus valable : demandez-en un nouveau au bureau.");
    if (inv.utiliseeLe) throw new ErreurMetier(DEJA_SERVI);
    if (inv.expireLe < maintenant) throw new ErreurMetier("Ce lien a expiré : demandez-en un nouveau au bureau.");
    if (motDePasse.length < 12) throw new ErreurMetier("12 caractères au minimum.", "motDePasse");
    if (motDePasse.length > 128) throw new ErreurMetier("128 caractères au maximum.", "motDePasse");
    // Verrou : deux clics simultanés ne consomment pas deux fois le jeton.
    const [pris] = await tx
      .update(invitations)
      .set({ utiliseeLe: maintenant })
      .where(and(eq(invitations.id, inv.id), isNull(invitations.utiliseeLe)))
      .returning({ id: invitations.id });
    if (!pris) throw new ErreurMetier(DEJA_SERVI);
    const hash = await hashPassword(motDePasse);
    const existant = await tx.query.account.findFirst({
      where: and(eq(account.userId, inv.userId), eq(account.providerId, "credential")),
    });
    if (existant) {
      await tx.update(account).set({ password: hash }).where(eq(account.id, existant.id));
      // Un mot de passe remplacé coupe les sessions ouvertes avec l'ancien.
      await tx.delete(session).where(eq(session.userId, inv.userId));
    } else {
      // Même forme que creerCompteAvecMotDePasse (comptes.ts).
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: inv.userId,
        providerId: "credential",
        userId: inv.userId,
        password: hash,
      });
    }
    const [u] = await tx.update(user).set({ actif: true }).where(eq(user.id, inv.userId)).returning({ email: user.email });
    // Numéro de membre séquentiel ; verrou de table pour deux activations simultanées.
    await tx.execute(sql`lock table ${membres} in share row exclusive mode`);
    const fiche = await tx.query.membres.findFirst({
      where: eq(membres.userId, inv.userId),
      columns: { id: true, activeLe: true, numeroMembre: true },
    });
    if (fiche && !fiche.activeLe) {
      const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${membres.numeroMembre}), 0)` }).from(membres);
      await tx
        .update(membres)
        .set({ activeLe: maintenant, numeroMembre: fiche.numeroMembre ?? Number(max) + 1 })
        .where(eq(membres.id, fiche.id));
    }
    return { email: u.email };
  });
}

export type SuiviInvitation = {
  userId: string;
  statut: "a_inviter" | "en_file" | "invite" | "echec" | "active";
  le: Date | null;
  erreur: string | null;
};

export async function suiviInvitations(db: Db, userIds: string[]): Promise<Map<string, SuiviInvitation>> {
  const suivi = new Map<string, SuiviInvitation>();
  if (userIds.length === 0) return suivi;

  const [comptes, credentials, emails, invs] = await Promise.all([
    db.select({ id: user.id, actif: user.actif }).from(user).where(inArray(user.id, userIds)),
    db
      .select({ userId: account.userId })
      .from(account)
      .where(and(inArray(account.userId, userIds), eq(account.providerId, "credential"))),
    db
      .select()
      .from(emailsFile)
      .where(and(inArray(emailsFile.userId, userIds), eq(emailsFile.type, "invitation")))
      .orderBy(desc(emailsFile.creeLe)),
    db.select({ userId: invitations.userId, creeLe: invitations.creeLe }).from(invitations).where(inArray(invitations.userId, userIds)),
  ]);
  const actifs = new Set(comptes.filter((c) => c.actif).map((c) => c.id));
  const avecMotDePasse = new Set(credentials.map((c) => c.userId));
  // Triés du plus récent au plus ancien : le premier email rencontré par compte est le dernier envoyé.
  const dernierEmail = new Map<string, (typeof emails)[number]>();
  // Un email en file l'emporte : « Renvoyer » l'antidate, il peut donc sembler plus ancien qu'un envoi passé.
  for (const e of emails) {
    if (!e.userId) continue;
    const retenu = dernierEmail.get(e.userId);
    if (!retenu || (e.statut === "a_envoyer" && retenu.statut !== "a_envoyer")) dernierEmail.set(e.userId, e);
  }
  const derniereInvitation = new Map<string, Date>();
  for (const i of invs) {
    const precedente = derniereInvitation.get(i.userId);
    if (!precedente || i.creeLe > precedente) derniereInvitation.set(i.userId, i.creeLe);
  }

  for (const userId of userIds) {
    const email = dernierEmail.get(userId);
    const invitation = derniereInvitation.get(userId);
    let s: SuiviInvitation = { userId, statut: "a_inviter", le: null, erreur: null };
    if (avecMotDePasse.has(userId) && actifs.has(userId)) s = { userId, statut: "active", le: null, erreur: null };
    else if (email?.statut === "a_envoyer") s = { userId, statut: "en_file", le: email.creeLe, erreur: email.erreur };
    else if (email?.statut === "envoye") s = { userId, statut: "invite", le: email.envoyeLe, erreur: null };
    else if (email?.statut === "echec") s = { userId, statut: "echec", le: email.creeLe, erreur: email.erreur };
    // Lien copié à la main, sans email : l'invitation existe quand même.
    else if (invitation) s = { userId, statut: "invite", le: invitation, erreur: null };
    suivi.set(userId, s);
  }
  return suivi;
}
