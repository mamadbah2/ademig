import { like } from "drizzle-orm";
import { db } from "../src/db";
import { user } from "../src/db/schema";

// Supprime les comptes de test (la cascade retire sessions et mots de passe).
export default async function nettoyage() {
  await db.delete(user).where(like(user.email, "%@ademig.test"));
}
