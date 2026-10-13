import { and, eq, like, sql } from "drizzle-orm";
import { db } from "../src/db";
import { actualites, evenements, emailsFile, mandats, membres, partenaires, reglages, user } from "../src/db/schema";

// Textes de test (« E2E … ») retirés des réglages : le site garde ses textes réels, même après un échec.
export async function retirerTextesDeTest() {
  await db
    .update(reglages)
    .set({
      textes: sql`(select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from jsonb_each(${reglages.textes}) where value #>> '{}' not like 'E2E %')`,
    })
    .where(sql`${reglages.textes}::text like '%"E2E %'`);
}

// Supprime les comptes de test (la cascade retire sessions et mots de passe).
export default async function nettoyage() {
  // Jamais le mandat en place : seuls des mandats de test inactifs sont supprimés.
  await db.delete(mandats).where(and(like(mandats.libelle, "E2E %"), eq(mandats.actif, false)));
  await db.delete(membres).where(like(membres.slug, "e2e-%"));
  // Contenus créés par les tests : leur lien commence toujours par « e2e- ».
  await db.delete(actualites).where(like(actualites.slug, "e2e-%"));
  await db.delete(evenements).where(like(evenements.slug, "e2e-%"));
  await db.delete(partenaires).where(like(partenaires.nom, "E2E %"));
  await retirerTextesDeTest();
  // Emails mis en file par l'import de test (les invitations partent en cascade avec `user`).
  await db.delete(emailsFile).where(like(emailsFile.destinataire, "%@ademig.test"));
  await db.delete(user).where(like(user.email, "%@ademig.test"));
}
