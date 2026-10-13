import { asc, count, eq } from "drizzle-orm";
import { emailsFile } from "@/db/schema";
import type { Db } from "@/db/types";
import { type Email, estErreurTransport } from "@/lib/emails";
import { ErreurMetier } from "./erreurs";
import { envoyerInvitation } from "./invitations";

const TENTATIVES_MAX = 3;
// Données de test (e2e, imports d'essai) : la base est partagée avec la production, dont le cron vide la file.
const ADRESSE_DE_TEST = /@ademig\.test$/i;

type EmailEnFile = {
  destinataire: string;
  sujet: string;
  html: string;
  type: "invitation" | "rappel" | "systeme";
  userId?: string;
  // Pour passer devant les autres dans la file (le cron traite du plus ancien au plus récent).
  creeLe?: Date;
};

export async function mettreEnFile(db: Db, e: EmailEnFile): Promise<void> {
  await db.insert(emailsFile).values(e);
}

export type BilanFile = { envoyes: number; echecs: number; restants: number; interrompu?: string };

const messageDe = (erreur: unknown) => (erreur instanceof Error ? erreur.message : String(erreur)).slice(0, 500);

export async function viderFile(
  db: Db,
  {
    max,
    envoyer,
    pauseMs,
    budgetMs,
    urlActivation,
  }: {
    max: number;
    envoyer: (e: Email) => Promise<void>;
    pauseMs: number;
    budgetMs?: number;
    // Adresse du site qui envoie : une invitation n'est construite (jeton compris) qu'au moment de l'envoi.
    urlActivation: (jeton: string) => string;
  },
): Promise<BilanFile> {
  const aTraiter = await db
    .select()
    .from(emailsFile)
    .where(eq(emailsFile.statut, "a_envoyer"))
    .orderBy(asc(emailsFile.creeLe))
    .limit(max);

  const debut = Date.now();
  let envoyes = 0;
  let echecs = 0;
  let interrompu: string | undefined;
  let premier = true;
  for (const ligne of aTraiter) {
    // Budget de temps (fonction serverless) : les emails restants partiront au prochain passage.
    if (budgetMs !== undefined && Date.now() - debut > budgetMs) break;
    const abandonner = (erreur: string) =>
      db.update(emailsFile).set({ statut: "echec", erreur }).where(eq(emailsFile.id, ligne.id));
    if (ADRESSE_DE_TEST.test(ligne.destinataire)) {
      await abandonner("Adresse de test : jamais envoyée.");
      continue;
    }
    // Une invitation se construit à partir du compte : sans compte, il n'y a rien à envoyer.
    if (ligne.type === "invitation" && !ligne.userId) {
      await abandonner("Invitation sans compte : jamais envoyée.");
      continue;
    }
    if (!premier) await new Promise((r) => setTimeout(r, pauseMs));
    premier = false;
    const marquerEnvoye = (tx: Db) =>
      tx.update(emailsFile).set({ statut: "envoye", envoyeLe: new Date() }).where(eq(emailsFile.id, ligne.id));
    try {
      if (ligne.type === "invitation" && ligne.userId) {
        // Une transaction par invitation : si l'envoi échoue, le jeton créé disparaît et l'ancien lien reste valable.
        const userId = ligne.userId;
        await db.transaction(async (tx) => {
          await envoyerInvitation(tx, userId, { envoyer, urlActivation });
          await marquerEnvoye(tx);
        });
      } else {
        await envoyer({ a: ligne.destinataire, sujet: ligne.sujet, html: ligne.html });
        await marquerEnvoye(db);
      }
      envoyes++;
    } catch (erreur) {
      // Compte activé ou désactivé depuis la mise en file : l'invitation n'a plus lieu d'être.
      if (erreur instanceof ErreurMetier) {
        await abandonner(`Non envoyée : ${erreur.message}`);
        continue;
      }
      const message = messageDe(erreur);
      // Panne du service (identifiants, réseau, quota) : on s'arrête sans user les tentatives ; reprise au prochain passage.
      if (estErreurTransport(erreur)) {
        await db.update(emailsFile).set({ erreur: message }).where(eq(emailsFile.id, ligne.id));
        interrompu = message;
        break;
      }
      const tentatives = ligne.tentatives + 1;
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
  return interrompu === undefined ? { envoyes, echecs, restants } : { envoyes, echecs, restants, interrompu };
}
