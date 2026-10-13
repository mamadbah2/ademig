import { and, count, eq, gt } from "drizzle-orm";
import { account, emailsFile, invitations, membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { contenuEmailMotDePasse, type Email } from "@/lib/emails";
import { ErreurMetier } from "./erreurs";
import { envoyerInvitationMaintenant, inviterParEmail } from "./invitations";

const DELAI_ENTRE_INVITATIONS_MS = 15 * 60 * 1000;
const INVITATIONS_PAR_JOUR = 3;

// Anti-abus (le formulaire est public) : pas de nouvelle invitation moins de 15 minutes après la dernière
// (envoyée ou lien copié), ni plus de 3 envoyées en 24 heures.
async function invitationTropRecente(db: Db, userId: string, maintenant: Date): Promise<boolean> {
  const [{ recentes }] = await db
    .select({ recentes: count() })
    .from(invitations)
    .where(and(eq(invitations.userId, userId), gt(invitations.creeLe, new Date(maintenant.getTime() - DELAI_ENTRE_INVITATIONS_MS))));
  if (recentes > 0) return true;
  const [{ envoyees }] = await db
    .select({ envoyees: count() })
    .from(emailsFile)
    .where(
      and(
        eq(emailsFile.userId, userId),
        eq(emailsFile.type, "invitation"),
        eq(emailsFile.statut, "envoye"),
        gt(emailsFile.envoyeLe, new Date(maintenant.getTime() - 24 * 3600 * 1000)),
      ),
    );
  return envoyees >= INVITATIONS_PAR_JOUR;
}

export type IssueReinitialisation = "reinitialisation" | "invitation" | "invitation_en_file" | "ignore";

// Page où un membre choisit son nouveau mot de passe : ses liens ramènent vers les pages des membres.
export const RETOUR_MEMBRE = "/admin/reinitialiser?espace=membre";

// « Mot de passe oublié » (sendResetPassword de Better Auth) :
// - compte désactivé : rien ;
// - membre (ou compte lié à une fiche) sans mot de passe, donc jamais activé : un lien de réinitialisation créerait
//   un mot de passe sans activer le compte (ni numéro de membre) ; on lui envoie son invitation à la place,
//   tout de suite en production, sinon en tête de file (le cron de production l'enverra avec sa propre adresse),
//   et jamais plus d'une fois par quart d'heure ni plus de 3 fois par jour ;
// - sinon, le lien de Better Auth, rédigé pour l'espace membre ou l'administration selon le rôle.
export async function demanderReinitialisation(
  db: Db,
  { userId, url }: { userId: string; url: string },
  options: { envoyer: (e: Email) => Promise<void>; urlActivation: (jeton: string) => string },
  maintenant = new Date(),
): Promise<IssueReinitialisation> {
  const compte = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { email: true, name: true, role: true, desactiveLe: true },
  });
  if (!compte || compte.desactiveLe) return "ignore";
  const credential = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
    columns: { id: true },
  });
  const fiche = await db.query.membres.findFirst({ where: eq(membres.userId, userId), columns: { id: true } });
  const membre = compte.role === "membre";

  if (!credential && (membre || fiche)) {
    // Même réponse neutre côté client dans tous les cas : Better Auth ne dit jamais si un email est parti.
    if (await invitationTropRecente(db, userId, maintenant)) return "ignore";
    const enFile = async () => {
      try {
        await inviterParEmail(db, userId, { prioritaire: true });
        return "invitation_en_file" as const;
      } catch (e) {
        if (e instanceof ErreurMetier) return "ignore" as const;
        throw e;
      }
    };
    if (process.env.VERCEL_ENV !== "production") return enFile();
    try {
      await envoyerInvitationMaintenant(db, userId, options);
      return "invitation";
    } catch (e) {
      if (e instanceof ErreurMetier) return "ignore";
      // Service d'email en panne : l'invitation partira en tête du prochain passage du cron.
      return enFile();
    }
  }

  let lien = url;
  if (membre) {
    const u = new URL(url);
    u.searchParams.set("callbackURL", RETOUR_MEMBRE);
    lien = u.href;
  }
  const { sujet, html } = contenuEmailMotDePasse({
    nom: compte.name,
    url: lien,
    invitation: !credential,
    espace: membre ? "membre" : "admin",
  });
  await options.envoyer({ a: compte.email, sujet, html });
  return "reinitialisation";
}
