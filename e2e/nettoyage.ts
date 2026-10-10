import { and, eq, like } from "drizzle-orm";
import { db } from "../src/db";
import { actualites, evenements, mandats, membres, partenaires, user } from "../src/db/schema";

// Supprime les comptes de test (la cascade retire sessions et mots de passe).
export default async function nettoyage() {
  // Jamais le mandat en place : seuls des mandats de test inactifs sont supprimés.
  await db.delete(mandats).where(and(like(mandats.libelle, "E2E %"), eq(mandats.actif, false)));
  await db.delete(membres).where(like(membres.slug, "e2e-%"));
  // Contenus créés par les tests : leur lien commence toujours par « e2e- ».
  await db.delete(actualites).where(like(actualites.slug, "e2e-%"));
  await db.delete(evenements).where(like(evenements.slug, "e2e-%"));
  await db.delete(partenaires).where(like(partenaires.nom, "E2E %"));
  await db.delete(user).where(like(user.email, "%@ademig.test"));
}
