const https = (hote?: string) => (hote ? `https://${hote}` : undefined);

// Adresse publique du site : variable explicite, sinon celle fournie par Vercel.
export function urlSite(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production") return https(process.env.VERCEL_PROJECT_PRODUCTION_URL)!;
  return https(process.env.VERCEL_URL) ?? "http://localhost:3000";
}

export const urlActivation = (jeton: string) => `${urlSite()}/espace-membre/activer?jeton=${jeton}`;
