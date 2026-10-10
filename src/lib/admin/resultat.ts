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

type ErreurPostgres = { code: string; constraint?: string };

// Le SQLSTATE est sur l'erreur du driver (Neon, PGlite), que Drizzle enveloppe dans `cause`.
function erreurPostgres(erreur: unknown): ErreurPostgres | null {
  for (let e = erreur, n = 0; e && typeof e === "object" && n < 3; e = (e as { cause?: unknown }).cause, n++) {
    const { code, constraint } = e as { code?: unknown; constraint?: unknown };
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) {
      return { code, constraint: typeof constraint === "string" ? constraint : undefined };
    }
  }
  return null;
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
  // Courses entre deux écritures : la vérification préalable est passée, la contrainte a refusé.
  const pg = erreurPostgres(erreur);
  if (pg?.code === "23505") {
    if (pg.constraint?.includes("slug")) {
      const message = "Ce lien est déjà utilisé.";
      return { ok: false, message, erreurs: { slug: [message] } };
    }
    return { ok: false, message: "Cette valeur est déjà utilisée : modifiez-la puis réessayez." };
  }
  if (pg?.code === "23503") {
    return { ok: false, message: "Une image choisie n'existe plus : retirez-la puis réessayez." };
  }
  return null;
}

// Retire les champs de contrôle du formulaire qui ne sont pas des colonnes.
export function sansMeta<T extends { modifierSlug: boolean; version?: string }>({ modifierSlug, version, ...champs }: T) {
  void modifierSlug;
  void version;
  return champs;
}
