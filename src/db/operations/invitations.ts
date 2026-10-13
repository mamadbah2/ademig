import { hashPassword } from "better-auth/crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { account, emailsFile, invitations, membres, session, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { contenuInvitationMembre, type Email, SUJET_INVITATION_MEMBRE } from "@/lib/emails";
import { hacherJeton, nouveauJeton } from "@/lib/membres/jetons";
import { changerActivation } from "./comptes";
import { ErreurMetier } from "./erreurs";

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

const retirerInvitationsEnFile = (db: Db, userId: string) =>
  db
    .delete(emailsFile)
    .where(and(eq(emailsFile.userId, userId), eq(emailsFile.type, "invitation"), eq(emailsFile.statut, "a_envoyer")));

// Met l'invitation en file, sans jeton ni contenu : le cron la construit au moment de l'envoi (envoyerInvitation),
// avec sa propre adresse de site, et les 30 jours de validité partent de là.
// `prioritaire` (« Renvoyer ») : l'email est antidaté d'un an pour partir au prochain passage du cron.
export async function inviterParEmail(db: Db, userId: string, { prioritaire = false }: { prioritaire?: boolean } = {}): Promise<void> {
  await db.transaction(async (tx) => {
    await verifierInvitable(tx, userId);
    const compte = await tx.query.user.findFirst({ where: eq(user.id, userId), columns: { email: true } });
    // Une seule invitation en file par compte.
    await retirerInvitationsEnFile(tx, userId);
    const creeLe = prioritaire ? new Date(Date.now() - 365 * 24 * 3600 * 1000) : undefined;
    await tx.insert(emailsFile).values({ destinataire: compte!.email, sujet: SUJET_INVITATION_MEMBRE, html: "", type: "invitation", userId, creeLe });
  });
}

// Au moment de l'envoi, dans la transaction de l'appelant : nouveau jeton (l'ancien lien inutilisé meurt), email
// construit avec `urlActivation`, puis envoi. Si l'envoi lève une erreur, la transaction annule le jeton.
// ErreurMetier si le compte n'est plus invitable (activé ou désactivé entre-temps).
export async function envoyerInvitation(
  tx: Db,
  userId: string,
  { envoyer, urlActivation }: { envoyer: (e: Email) => Promise<void>; urlActivation: (jeton: string) => string },
): Promise<{ a: string }> {
  await verifierInvitable(tx, userId);
  const compte = await tx.query.user.findFirst({ where: eq(user.id, userId), columns: { email: true, name: true } });
  const fiche = await tx.query.membres.findFirst({ where: eq(membres.userId, userId), columns: { nom: true } });
  const { jeton } = await creerInvitation(tx, userId);
  const { sujet, html } = contenuInvitationMembre({ prenomNom: fiche?.nom ?? compte!.name, url: urlActivation(jeton) });
  await envoyer({ a: compte!.email, sujet, html });
  return { a: compte!.email };
}

// Envoi immédiat, hors file (« Mot de passe oublié » d'un membre pas encore activé) : l'envoi est tracé comme
// envoyé pour le suivi, et un email encore en file (qui tuerait ce lien à son envoi) est retiré.
export async function envoyerInvitationMaintenant(
  db: Db,
  userId: string,
  options: { envoyer: (e: Email) => Promise<void>; urlActivation: (jeton: string) => string },
): Promise<void> {
  await db.transaction(async (tx) => {
    const { a } = await envoyerInvitation(tx, userId, options);
    await retirerInvitationsEnFile(tx, userId);
    await tx.insert(emailsFile).values({
      destinataire: a, sujet: SUJET_INVITATION_MEMBRE, html: "", type: "invitation", userId, statut: "envoye", envoyeLe: new Date(),
    });
  });
}

export type EtatCompte = { actif: boolean; aMotDePasse: boolean; desactive: boolean };

export async function etatCompte(db: Db, userId: string): Promise<EtatCompte | null> {
  const compte = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { actif: true, desactiveLe: true } });
  if (!compte) return null;
  const mdp = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
    columns: { id: true },
  });
  return { actif: compte.actif, aMotDePasse: Boolean(mdp), desactive: compte.desactiveLe !== null };
}

// Une invitation active le compte (et le réactive) : on ne l'envoie qu'à un compte jamais activé ni désactivé.
// Dans une transaction, la ligne du compte est verrouillée : un « Désactiver » simultané attend, puis est vu.
export async function verifierInvitable(db: Db, userId: string): Promise<void> {
  if ("rollback" in db) await db.execute(sql`select 1 from ${user} where ${user.id} = ${userId} for update`);
  const etat = await etatCompte(db, userId);
  if (!etat) throw new ErreurMetier("Compte introuvable.");
  if (etat.desactive || (etat.aMotDePasse && !etat.actif)) {
    throw new ErreurMetier("Ce compte est désactivé : réactivez-le avant de renvoyer une invitation.");
  }
  if (etat.aMotDePasse) throw new ErreurMetier("Ce compte est déjà activé.");
}

// Désactive le compte : même chemin que la page Comptes (changerActivation).
export async function desactiverCompteMembre(db: Db, p: { acteurId: string; cibleId: string }): Promise<void> {
  await db.transaction((tx) => changerActivation(tx, { ...p, actif: false }));
}

// Un compte jamais activé (sans mot de passe) redevient inactif et « à inviter » : il n'entre ni dans
// l'annuaire ni dans les comptes actifs, et son historique d'envoi est effacé.
export async function reactiverCompteMembre(db: Db, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await verifierExiste(tx, userId);
    const mdp = await tx.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
      columns: { id: true },
    });
    await tx.update(user).set({ desactiveLe: null, actif: Boolean(mdp) }).where(eq(user.id, userId));
    if (!mdp) {
      await tx.delete(emailsFile).where(and(eq(emailsFile.userId, userId), eq(emailsFile.type, "invitation")));
      await tx.delete(invitations).where(and(eq(invitations.userId, userId), isNull(invitations.utiliseeLe)));
    }
  });
}

async function verifierExiste(db: Db, userId: string) {
  const compte = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { id: true } });
  if (!compte) throw new ErreurMetier("Compte introuvable.");
}

// Nouveau lien à transmettre à la main : l'ancien lien meurt et l'email d'invitation encore en file est retiré.
export async function genererLienInvitation(db: Db, userId: string): Promise<{ jeton: string }> {
  return db.transaction(async (tx) => {
    await verifierInvitable(tx, userId);
    // L'email en file créerait à son envoi un jeton qui tuerait ce lien.
    await retirerInvitationsEnFile(tx, userId);
    return creerInvitation(tx, userId);
  });
}

// Rattrapage : met en file une invitation pour chaque compte de fiche non désactivé, sans mot de passe, et
// jamais invité, dont l'invitation a échoué, ou dont le lien a expiré.
const A_RATTRAPER = new Set<SuiviInvitation["statut"]>(["a_inviter", "echec", "expire"]);

export async function inviterLesNonInvites(db: Db): Promise<number> {
  const fiches = await db
    .select({ userId: membres.userId })
    .from(membres)
    .innerJoin(user, eq(user.id, membres.userId))
    .where(isNull(user.desactiveLe));
  const suivi = await suiviInvitations(db, fiches.map((f) => f.userId!));
  const cibles = [...suivi.values()].filter((s) => A_RATTRAPER.has(s.statut));
  let invites = 0;
  for (const { userId } of cibles) {
    try {
      await inviterParEmail(db, userId);
      invites++;
    } catch (e) {
      // Désactivé ou activé entre-temps : ignoré.
      if (!(e instanceof ErreurMetier)) throw e;
    }
  }
  return invites;
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
    // Verrou sur le compte : un « Désactiver » simultané attend la fin de l'activation, ou est vu ici.
    await tx.execute(sql`select 1 from ${user} where ${user.id} = ${inv.userId} for update`);
    const cible = await tx.query.user.findFirst({ where: eq(user.id, inv.userId), columns: { desactiveLe: true } });
    if (cible?.desactiveLe) throw new ErreurMetier("Ce compte a été désactivé : contactez le bureau.");
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
  statut: "a_inviter" | "en_file" | "invite" | "expire" | "echec" | "active" | "desactive";
  le: Date | null;
  erreur: string | null;
};

export async function suiviInvitations(db: Db, userIds: string[], maintenant = new Date()): Promise<Map<string, SuiviInvitation>> {
  const suivi = new Map<string, SuiviInvitation>();
  if (userIds.length === 0) return suivi;

  const [comptes, credentials, emails, invs] = await Promise.all([
    db.select({ id: user.id, actif: user.actif, desactiveLe: user.desactiveLe }).from(user).where(inArray(user.id, userIds)),
    db
      .select({ userId: account.userId })
      .from(account)
      .where(and(inArray(account.userId, userIds), eq(account.providerId, "credential"))),
    db
      .select()
      .from(emailsFile)
      .where(and(inArray(emailsFile.userId, userIds), eq(emailsFile.type, "invitation")))
      .orderBy(desc(emailsFile.creeLe)),
    // Invitations consommées ou révoquées exclues : seul un lien encore en cours compte comme « invité ».
    db
      .select({ userId: invitations.userId, creeLe: invitations.creeLe, expireLe: invitations.expireLe })
      .from(invitations)
      .where(and(inArray(invitations.userId, userIds), isNull(invitations.utiliseeLe))),
  ]);
  const desactives = new Map(comptes.filter((c) => c.desactiveLe).map((c) => [c.id, c.desactiveLe!]));
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
  const derniereInvitation = new Map<string, (typeof invs)[number]>();
  for (const i of invs) {
    const precedente = derniereInvitation.get(i.userId);
    if (!precedente || i.creeLe > precedente.creeLe) derniereInvitation.set(i.userId, i);
  }

  for (const userId of userIds) {
    const email = dernierEmail.get(userId);
    const invitation = derniereInvitation.get(userId);
    let s: SuiviInvitation = { userId, statut: "a_inviter", le: null, erreur: null };
    if (desactives.has(userId)) s = { userId, statut: "desactive", le: desactives.get(userId)!, erreur: null };
    else if (avecMotDePasse.has(userId) && actifs.has(userId)) s = { userId, statut: "active", le: null, erreur: null };
    else if (email?.statut === "a_envoyer") s = { userId, statut: "en_file", le: email.creeLe, erreur: email.erreur };
    else if (email?.statut === "echec") s = { userId, statut: "echec", le: email.creeLe, erreur: email.erreur };
    // Le dernier lien (envoyé ou copié) n'a pas servi et ne sert plus : à renvoyer.
    else if (invitation && invitation.expireLe < maintenant) s = { userId, statut: "expire", le: invitation.expireLe, erreur: null };
    else if (email?.statut === "envoye") s = { userId, statut: "invite", le: email.envoyeLe, erreur: null };
    // Lien copié à la main, sans email : l'invitation existe quand même.
    else if (invitation) s = { userId, statut: "invite", le: invitation.creeLe, erreur: null };
    suivi.set(userId, s);
  }
  return suivi;
}
