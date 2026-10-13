import { db } from "@/db";
import { viderFile } from "@/db/operations/emails-file";
import { envoyerEmail } from "@/lib/emails";

export const maxDuration = 300;

// Appelé une fois par jour par Vercel Cron (vercel.json). Vercel envoie `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const max = Number(process.env.EMAILS_PAR_JOUR) || 150;
  const emails = await viderFile(db, { max, envoyer: envoyerEmail, pauseMs: 1000 });
  return Response.json({ emails });
}
