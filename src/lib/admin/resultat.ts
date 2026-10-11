import { z } from "zod";
import { ErreurMetier } from "@/db/operations/erreurs";
import { AccesRefuse } from "@/lib/roles";

// Réponse de toute Server Action de l'admin, lue par `useActionState`.
export type Resultat<T = void> =
  | { ok: true; message?: string; donnees?: T }
  | { ok: false; message?: string; erreurs?: Record<string, string[] | undefined> };

export function erreursDe(erreur: z.ZodError): Resultat<never> {
  const erreurs: Record<string, string[]> = {};
  for (const probleme of erreur.issues) {
    const [champ, rang] = probleme.path;
    if (champ === undefined) continue;
    // Élément d'une liste envoyée en JSON : on dit lequel corriger, numéroté comme dans ListeEditable.
    const message = typeof rang === "number" ? `Élément ${rang + 1} : ${probleme.message}` : probleme.message;
    (erreurs[String(champ)] ??= []).push(message);
  }
  return { ok: false, message: "Corrigez les champs signalés.", erreurs };
}

// Valide un formulaire ; une saisie invalide devient le Resultat à renvoyer tel quel.
export function lireFormulaire<S extends z.ZodType>(
  schema: S,
  donnees: FormData,
): { ok: true; data: z.output<S> } | { ok: false; resultat: Resultat<never> } {
  const saisie = schema.safeParse(Object.fromEntries(donnees));
  return saisie.success ? { ok: true, data: saisie.data } : { ok: false, resultat: erreursDe(saisie.error) };
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
    if (pg.constraint === "partenaires_nom_unique") {
      const message = "Ce nom est déjà utilisé.";
      return { ok: false, message, erreurs: { nom: [message] } };
    }
    if (pg.constraint === "postes_bureau_mandat_membre") {
      const message = "Un membre n'occupe qu'un poste par mandat.";
      return { ok: false, message, erreurs: { postes: [message] } };
    }
    if (pg.constraint === "mandats_un_seul_actif") {
      return { ok: false, message: "Un autre mandat vient d'être activé : rechargez la page." };
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
