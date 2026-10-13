import { draftMode } from "next/headers";
import { aLeRole } from "@/lib/roles";
import { lireSession } from "@/lib/session";

// Un brouillon n'est servi qu'avec le cookie d'aperçu ET une session admin valide.
// La session n'est lue qu'en Draft Mode : ailleurs, les pages publiques restent statiques.
export async function apercuAutorise(): Promise<boolean> {
  if (!(await draftMode()).isEnabled) return false;
  const session = await lireSession();
  return session !== null && aLeRole(session.role, "editeur");
}
