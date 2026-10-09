import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { envoyerEmailMotDePasse } from "@/lib/emails";

const https = (hote?: string) => (hote ? `https://${hote}` : undefined);

// Adresse publique du site : variable explicite, sinon celle fournie par Vercel.
function urlDuSite() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production") return https(process.env.VERCEL_PROJECT_PRODUCTION_URL)!;
  return https(process.env.VERCEL_URL) ?? "http://localhost:3000";
}

export const auth = betterAuth({
  baseURL: urlDuSite(),
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
    sendResetPassword: async ({ user, url }) => {
      const credential = await db.query.account.findFirst({
        where: and(eq(schema.account.userId, user.id), eq(schema.account.providerId, "credential")),
        columns: { id: true },
      });
      await envoyerEmailMotDePasse({ email: user.email, nom: user.name, url, invitation: !credential });
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
