import { eq, like } from "drizzle-orm";
import { db } from "../src/db";
import { creerCompteAvecMotDePasse } from "../src/db/operations/comptes";
import { user } from "../src/db/schema";
import { COMPTES, MOT_DE_PASSE } from "./comptes";

// Repart de comptes de test neufs à chaque lancement (la cascade supprime sessions et mots de passe).
export default async function preparation() {
  await db.delete(user).where(like(user.email, "%@ademig.test"));
  for (const compte of Object.values(COMPTES)) {
    await creerCompteAvecMotDePasse(db, { ...compte, motDePasse: MOT_DE_PASSE });
  }
  await db.update(user).set({ actif: false }).where(eq(user.email, COMPTES.inactif.email));
}
