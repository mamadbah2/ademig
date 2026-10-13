import { and, eq } from "drizzle-orm";
import { account, membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { contenuEmailMotDePasse, type Email } from "@/lib/emails";
import { ErreurMetier } from "./erreurs";
import { envoyerInvitationMaintenant, inviterParEmail } from "./invitations";

export type IssueReinitialisation = "reinitialisation" | "invitation" | "invitation_en_file" | "ignore";

// Page où un membre choisit son nouveau mot de passe : ses liens ramènent vers les pages des membres.
export const RETOUR_MEMBRE = "/admin/reinitialiser?espace=membre";

// « Mot de passe oublié » (sendResetPassword de Better Auth) :
// - compte désactivé : rien ;
// - membre (ou compte lié à une fiche) sans mot de passe, donc jamais activé : un lien de réinitialisation créerait
//   un mot de passe sans activer le compte (ni numéro de membre) ; on lui envoie son invitation à la place ;
// - sinon, le lien de Better Auth, rédigé pour l'espace membre ou l'administration selon le rôle.
export async function demanderReinitialisation(
  db: Db,
  { userId, url }: { userId: string; url: string },
  options: { envoyer: (e: Email) => Promise<void>; urlActivation: (jeton: string) => string },
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
    try {
      await envoyerInvitationMaintenant(db, userId, options);
      return "invitation";
    } catch (e) {
      if (e instanceof ErreurMetier) return "ignore";
      // Service d'email en panne : l'invitation partira en tête du prochain passage du cron.
      await inviterParEmail(db, userId, { prioritaire: true });
      return "invitation_en_file";
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
