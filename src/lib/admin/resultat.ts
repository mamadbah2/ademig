import { z } from "zod";
import { ErreurMetier } from "@/db/operations/erreurs";
import { AccesRefuse } from "@/lib/roles";

// Réponse de toute Server Action de l'admin, lue par `useActionState`.
export type Resultat<T = void> =
  | { ok: true; message?: string; donnees?: T }
  | { ok: false; message?: string; erreurs?: Record<string, string[] | undefined> };

export function erreursDe(erreur: z.ZodError): Resultat<never> {
  return {
    ok: false,
    message: "Corrigez les champs signalés.",
    erreurs: z.flattenError(erreur).fieldErrors as Record<string, string[] | undefined>,
  };
}

// Erreurs attendues → message pour l'utilisateur ; les autres remontent (null).
export function resultatDErreur(erreur: unknown): Resultat<never> | null {
  if (erreur instanceof AccesRefuse) return { ok: false, message: erreur.message };
  if (erreur instanceof ErreurMetier) {
    return {
      ok: false,
      message: erreur.message,
      ...(erreur.champ ? { erreurs: { [erreur.champ]: [erreur.message] } } : {}),
    };
  }
  return null;
}
