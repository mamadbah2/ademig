import { eq } from "drizzle-orm";
import { actualites } from "@/db/schema";
import type { Db } from "@/db/types";

export type TypeApercu = "actualite";

// Le chemin vient de la base, jamais de la requête : pas de redirection ouverte.
export async function cheminApercu(db: Db, type: TypeApercu, id: string): Promise<string | null> {
  if (type === "actualite") {
    const a = await db.query.actualites.findFirst({ where: eq(actualites.id, id), columns: { slug: true } });
    return a ? `/actualites/${a.slug}` : null;
  }
  return null;
}
