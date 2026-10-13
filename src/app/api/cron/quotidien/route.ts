import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { viderFile } from "@/db/operations/emails-file";
import { emailsConfigures, envoyerEmail } from "@/lib/emails";
import { urlActivation } from "@/lib/membres/url";

export const maxDuration = 300;

function autorise(recu: string | null, attendu: string): boolean {
  if (!recu) return false;
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Appelé une fois par jour par Vercel Cron (vercel.json). Vercel envoie `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || !autorise(request.headers.get("authorization"), `Bearer ${secret}`)) {
    return new Response("Non autorisé", { status: 401 });
  }
  // Sans service d'email, la file n'est pas touchée : aucune tentative n'est consommée.
  if (!emailsConfigures()) return new Response("Aucun service d'email n'est configuré.", { status: 503 });
  const max = Number(process.env.EMAILS_PAR_JOUR) || 150;
  // Les invitations sont construites à l'envoi, avec l'adresse de ce déploiement (seule la production a un cron).
  const emails = await viderFile(db, { max, envoyer: envoyerEmail, pauseMs: 1000, budgetMs: 240_000, urlActivation });
  return Response.json({ emails });
}
