import type { Role } from "@/lib/roles";
import { exigerRole, type SessionAdmin } from "@/lib/session";
import { type Resultat, resultatDErreur } from "./resultat";

// Toute Server Action de l'admin passe par ici : contrôle du rôle, puis erreurs attendues traduites.
export async function action<T = void>(
  role: Role,
  fn: (session: SessionAdmin) => Promise<Resultat<T>>,
): Promise<Resultat<T>> {
  try {
    return await fn(await exigerRole(role));
  } catch (erreur) {
    const resultat = resultatDErreur(erreur);
    if (resultat) return resultat;
    // Les redirections de Next (sans session) et les vraies pannes remontent.
    throw erreur;
  }
}
