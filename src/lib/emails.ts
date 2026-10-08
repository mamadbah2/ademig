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

// En production, il faut la clé Resend ET un expéditeur vérifié (l'expéditeur de test n'atteint que le propriétaire du compte).
// Le terminal ne remplace l'envoi qu'en développement local.
export function emailsConfigures(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.EMAIL_EXPEDITEUR);
}

export async function envoyerEmailMotDePasse(p: EmailMotDePasse & { email: string }) {
  const { sujet, html } = contenuEmailMotDePasse(p);
  const cle = process.env.RESEND_API_KEY;
  // Jamais de lien (jeton de 24 h) dans les journaux hors développement.
  if (!emailsConfigures()) {
    throw new Error("Envoi d'email impossible : RESEND_API_KEY n'est pas configurée.");
  }
  if (!cle) {
    console.info(`[email non envoyé : RESEND_API_KEY absente] ${p.email} → ${p.url}`);
    return;
  }
  // Créé à la demande : le constructeur lève une erreur sans clé.
  const resend = new Resend(cle);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_EXPEDITEUR || "ADEMIG <onboarding@resend.dev>",
    to: p.email,
    subject: sujet,
    html,
  });
  if (error) throw new Error(`Envoi de l'email impossible : ${error.message}`);
}
