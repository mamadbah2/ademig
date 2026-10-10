import { like } from "drizzle-orm";
import { db } from "../src/db";
import { actualites, evenements, partenaires, user } from "../src/db/schema";

// Supprime les comptes de test (la cascade retire sessions et mots de passe).
export default async function nettoyage() {
  // Contenus créés par les tests : leur lien commence toujours par « e2e- ».
  await db.delete(actualites).where(like(actualites.slug, "e2e-%"));
  await db.delete(evenements).where(like(evenements.slug, "e2e-%"));
  await db.delete(partenaires).where(like(partenaires.nom, "E2E %"));
  await db.delete(user).where(like(user.email, "%@ademig.test"));
}
