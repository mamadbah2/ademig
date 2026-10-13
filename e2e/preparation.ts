import { randomBytes } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { db } from "../src/db";
import { creerCompteAvecMotDePasse } from "../src/db/operations/comptes";
import { actualites, emailsFile, evenements, mandats, membres, partenaires, user } from "../src/db/schema";
import { COMPTES } from "./comptes";
import { retirerTextesDeTest } from "./nettoyage";

// Repart de comptes de test neufs à chaque lancement (la cascade supprime sessions et mots de passe).
export default async function preparation() {
  if (process.env.E2E_AUTORISE !== "1") {
    throw new Error(
      "Tests e2e refusés : ils créent un super-administrateur dans la base de DATABASE_URL. " +
        "Lancez `E2E_AUTORISE=1 npm run test:e2e`, uniquement contre une base de développement.",
    );
  }
  // Jamais le mandat en place : seuls des mandats de test inactifs sont supprimés.
  await db.delete(mandats).where(and(like(mandats.libelle, "E2E %"), eq(mandats.actif, false)));
  await db.delete(membres).where(like(membres.slug, "e2e-%"));
  // Contenus créés par les tests : leur lien commence toujours par « e2e- ».
  await db.delete(actualites).where(like(actualites.slug, "e2e-%"));
  await db.delete(evenements).where(like(evenements.slug, "e2e-%"));
  await db.delete(partenaires).where(like(partenaires.nom, "E2E %"));
  await retirerTextesDeTest();
  // Mot de passe propre à ce lancement, transmis aux tests par l'environnement.
  const motDePasse = randomBytes(18).toString("base64url");
  process.env.E2E_MOT_DE_PASSE = motDePasse;
  await db.delete(emailsFile).where(like(emailsFile.destinataire, "%@ademig.test"));
  await db.delete(user).where(like(user.email, "%@ademig.test"));
  for (const compte of Object.values(COMPTES)) {
    await creerCompteAvecMotDePasse(db, { ...compte, motDePasse });
  }
  await db.update(user).set({ actif: false }).where(eq(user.email, COMPTES.inactif.email));
}
