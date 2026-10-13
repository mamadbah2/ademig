import { eq } from "drizzle-orm";
import { membres } from "@/db/schema";
import type { Db } from "@/db/types";

// Fiche membre rattachée à un compte de connexion (au plus une).
export async function ficheDuCompte(db: Db, userId: string): Promise<{ id: string } | undefined> {
  const [fiche] = await db.select({ id: membres.id }).from(membres).where(eq(membres.userId, userId)).limit(1);
  return fiche;
}
