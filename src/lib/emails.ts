import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { echapperHtml } from "@/lib/html";

type EmailMotDePasse = { nom: string; url: string; invitation: boolean };

export function contenuEmailMotDePasse({ nom, url, invitation }: EmailMotDePasse) {
  const sujet = invitation
    ? "Votre accès à l'administration du site ADEMIG"
    : "Réinitialisation de votre mot de passe ADEMIG";
  const intro = invitation
    ? "Un compte vient d'être créé pour vous sur l'espace d'administration du site de l'ADEMIG."
    : "Vous avez demandé à changer le mot de passe de votre compte d'administration du site de l'ADEMIG.";
  const bouton = invitation ? "Définir mon mot de passe" : "Choisir un nouveau mot de passe";
  const lien = echapperHtml(url);
  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f3f0e7;color:#333233;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:bold;margin:0 0 24px">ADEMIG</p>
<p>Bonjour ${echapperHtml(nom)},</p>
<p>${intro}</p>
<p style="margin:28px 0"><a href="${lien}" style="background:#5d4433;color:#f3f0e7;padding:12px 20px;text-decoration:none;font-weight:bold">${bouton}</a></p>
<p>Ce lien est valable 24 heures et ne sert qu'une fois. Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${lien}</p>
<p style="font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
</div></body></html>`;
  return { sujet, html };
}

export function contenuInvitationMembre({ prenomNom, url }: { prenomNom: string; url: string }) {
  const lien = echapperHtml(url);
  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f3f0e7;color:#333233;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:bold;margin:0 0 24px">ADEMIG</p>
<p>Bonjour ${echapperHtml(prenomNom)},</p>
<p>L'ADEMIG ouvre son espace membre : mettez à jour votre profil, retrouvez les autres ingénieurs de l'amicale et, bientôt, réglez votre cotisation en ligne.</p>
<p style="margin:28px 0"><a href="${lien}" style="background:#16415D;color:#f3f0e7;padding:12px 20px;text-decoration:none;font-weight:bold">Activer mon compte</a></p>
<p>Ce lien est valable 30 jours et ne sert qu'une fois. Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${lien}</p>
<p style="font-size:13px">Si ce message est arrivé dans vos spams, marquez-le comme « non spam » pour recevoir les prochains.</p>
</div></body></html>`;
  return { sujet: SUJET_INVITATION_MEMBRE, html };
}

export const SUJET_INVITATION_MEMBRE = "Votre espace membre ADEMIG";

export type Email = { a: string; sujet: string; html: string };

const gmailConfigure = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const resendConfigure = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_EXPEDITEUR);

// Gmail (mot de passe d'application) ou Resend (clé ET expéditeur vérifié : l'expéditeur de test
// n'atteint que le propriétaire du compte). Le terminal ne remplace l'envoi qu'en développement local.
export function emailsConfigures(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return gmailConfigure() || resendConfigure();
}

// Panne du service d'envoi (identifiants refusés, serveur injoignable, quota) : rien à voir avec le destinataire.
export class ErreurTransport extends Error {}

const CODES_TRANSPORT = new Set(["EAUTH", "ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "ETLS", "ECONNREFUSED", "ECONNRESET", "ENOTFOUND", "EPROTOCOL"]);
// 421 / 454 : service indisponible ; 530 / 534 / 535 : authentification refusée.
const REPONSES_TRANSPORT = new Set([421, 454, 530, 534, 535]);
// Erreurs Resend qui tiennent au compte ou au service, pas à l'adresse.
const ERREURS_RESEND_TRANSPORT = new Set([
  "missing_api_key", "invalid_api_key", "restricted_api_key", "invalid_access", "invalid_from_address", "rate_limit_exceeded",
  "daily_quota_exceeded", "monthly_quota_exceeded", "internal_server_error", "application_error",
]);

// Une panne du service arrête le passage du cron sans user les 3 tentatives des emails ; une erreur propre
// au destinataire (550 adresse inconnue…) compte une tentative.
export function estErreurTransport(erreur: unknown): boolean {
  if (erreur instanceof ErreurTransport) return true;
  if (typeof erreur !== "object" || erreur === null) return false;
  const { code, responseCode, message } = erreur as { code?: unknown; responseCode?: unknown; message?: unknown };
  if (typeof code === "string" && CODES_TRANSPORT.has(code)) return true;
  if (typeof responseCode === "number" && REPONSES_TRANSPORT.has(responseCode)) return true;
  // Quota quotidien de Gmail atteint (550 5.4.5) : les emails suivants échoueraient tous.
  return typeof message === "string" && /5\.4\.5|sending limit exceeded/i.test(message);
}

let transport: Transporter | null = null;

export async function envoyerEmail({ a, sujet, html }: Email): Promise<void> {
  if (process.env.NODE_ENV === "development" && !gmailConfigure() && !resendConfigure()) {
    console.info(`[email de développement] à ${a} — ${sujet}\n${html}`);
    return;
  }
  if (gmailConfigure()) {
    transport ??= nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transport.sendMail({ from: `ADEMIG <${process.env.GMAIL_USER}>`, to: a, subject: sujet, html });
    return;
  }
  if (!resendConfigure()) throw new ErreurTransport("Aucun service d'email configuré (GMAIL_USER/GMAIL_APP_PASSWORD ou RESEND_API_KEY).");
  // Créé à la demande : le constructeur lève une erreur sans clé.
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.EMAIL_EXPEDITEUR!, to: a, subject: sujet, html });
  if (error) {
    const message = `Envoi de l'email impossible : ${error.message}`;
    throw ERREURS_RESEND_TRANSPORT.has(error.name) ? new ErreurTransport(message) : new Error(message);
  }
}

export async function envoyerEmailMotDePasse(p: EmailMotDePasse & { email: string }) {
  // Jamais de lien (jeton de 24 h) dans les journaux hors développement.
  if (!emailsConfigures()) {
    throw new Error("Envoi d'email impossible : aucun service d'email n'est configuré.");
  }
  const { sujet, html } = contenuEmailMotDePasse(p);
  await envoyerEmail({ a: p.email, sujet, html });
}
