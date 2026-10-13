import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { demanderReinitialisation } from "@/db/operations/reinitialisation";
import { envoyerEmailVerifie } from "@/lib/emails";
import { urlActivation, urlSite } from "@/lib/membres/url";

const https = (hote?: string) => (hote ? `https://${hote}` : undefined);

export const auth = betterAuth({
  baseURL: urlSite(),
  trustedOrigins: [https(process.env.VERCEL_URL), https(process.env.VERCEL_BRANCH_URL)].filter(
    (o): o is string => !!o,
  ),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Pas d'inscription publique : les comptes sont créés par un super-admin.
    disableSignUp: true,
    minPasswordLength: 12,
    // Le même lien sert à l'invitation et à la réinitialisation.
    resetPasswordTokenExpiresIn: 60 * 60 * 24,
    revokeSessionsOnPasswordReset: true,
    // Membre jamais activé : son invitation remplace le lien ; membre activé : email et retour de l'espace membre
    // (voir demanderReinitialisation).
    sendResetPassword: async ({ user, url }) => {
      await demanderReinitialisation(db, { userId: user.id, url }, { envoyer: envoyerEmailVerifie, urlActivation });
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "editeur", input: false },
      actif: { type: "boolean", required: true, defaultValue: true, input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  databaseHooks: {
    session: {
      create: {
        // Bloque la connexion d'un compte désactivé (les sessions existantes sont supprimées à la désactivation).
        before: async (session) => {
          const u = await db.query.user.findFirst({
            where: eq(schema.user.id, session.userId),
            columns: { actif: true },
          });
          if (!u?.actif) throw new APIError("FORBIDDEN", { message: "Ce compte est désactivé." });
        },
      },
    },
  },
  // nextCookies doit rester le dernier plugin.
  plugins: [nextCookies()],
});
