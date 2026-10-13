import { asc, count, eq } from "drizzle-orm";
import { emailsFile } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Email } from "@/lib/emails";

const TENTATIVES_MAX = 3;

type EmailEnFile = {
  destinataire: string;
  sujet: string;
  html: string;
  type: "invitation" | "rappel" | "systeme";
  userId?: string;
};

export async function mettreEnFile(db: Db, e: EmailEnFile): Promise<void> {
  await db.insert(emailsFile).values(e);
}

export async function viderFile(
  db: Db,
  { max, envoyer, pauseMs, budgetMs }: { max: number; envoyer: (e: Email) => Promise<void>; pauseMs: number; budgetMs?: number },
): Promise<{ envoyes: number; echecs: number; restants: number }> {
  const aTraiter = await db
    .select()
    .from(emailsFile)
    .where(eq(emailsFile.statut, "a_envoyer"))
    .orderBy(asc(emailsFile.creeLe))
    .limit(max);

  const debut = Date.now();
  let envoyes = 0;
  let echecs = 0;
  for (const [i, ligne] of aTraiter.entries()) {
    // Budget de temps (fonction serverless) : les emails restants partiront au prochain passage.
    if (budgetMs !== undefined && Date.now() - debut > budgetMs) break;
    if (i > 0) await new Promise((r) => setTimeout(r, pauseMs));
    try {
      await envoyer({ a: ligne.destinataire, sujet: ligne.sujet, html: ligne.html });
      await db.update(emailsFile).set({ statut: "envoye", envoyeLe: new Date() }).where(eq(emailsFile.id, ligne.id));
      envoyes++;
    } catch (erreur) {
      const tentatives = ligne.tentatives + 1;
      const message = (erreur instanceof Error ? erreur.message : String(erreur)).slice(0, 500);
      await db
        .update(emailsFile)
        .set({ tentatives, erreur: message, statut: tentatives >= TENTATIVES_MAX ? "echec" : "a_envoyer" })
        .where(eq(emailsFile.id, ligne.id));
      echecs++;
    }
  }

  const [{ restants }] = await db
    .select({ restants: count() })
    .from(emailsFile)
    .where(eq(emailsFile.statut, "a_envoyer"));
  return { envoyes, echecs, restants };
}
