import { randomBytes } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { db } from "../src/db";
import { creerCompteAvecMotDePasse } from "../src/db/operations/comptes";
import { user } from "../src/db/schema";
import { COMPTES } from "./comptes";

// Repart de comptes de test neufs à chaque lancement (la cascade supprime sessions et mots de passe).
export default async function preparation() {
  if (process.env.E2E_AUTORISE !== "1") {
    throw new Error(
      "Tests e2e refusés : ils créent un super-administrateur dans la base de DATABASE_URL. " +
        "Lancez `E2E_AUTORISE=1 npm run test:e2e`, uniquement contre une base de développement.",
    );
  }
  // Mot de passe propre à ce lancement, transmis aux tests par l'environnement.
  const motDePasse = randomBytes(18).toString("base64url");
  process.env.E2E_MOT_DE_PASSE = motDePasse;
  await db.delete(user).where(like(user.email, "%@ademig.test"));
  for (const compte of Object.values(COMPTES)) {
    await creerCompteAvecMotDePasse(db, { ...compte, motDePasse });
  }
  await db.update(user).set({ actif: false }).where(eq(user.email, COMPTES.inactif.email));
}
