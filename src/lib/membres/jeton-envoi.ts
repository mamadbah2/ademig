import { aLeRole, type Role } from "@/lib/roles";
import { TAILLE_MAX, TYPES_IMAGES } from "@/lib/validation/media";

export type ReglesJeton = { allowedContentTypes: string[]; maximumSizeInBytes: number };

// Qui peut obtenir un jeton d'envoi direct vers Blob, et sous quelles limites. null = refus.
// Un éditeur envoie des images de la médiathèque ; un membre avec fiche n'envoie que son portrait,
// dans le dossier `membres/`.
export function decisionJetonEnvoi(
  session: { role: Role } | null,
  aUneFiche: boolean,
  pathname: string,
): ReglesJeton | null {
  if (!session) return null;
  if (aLeRole(session.role, "editeur")) return { allowedContentTypes: [...TYPES_IMAGES], maximumSizeInBytes: TAILLE_MAX };
  if (aUneFiche && pathname.startsWith("membres/")) {
    return { allowedContentTypes: ["image/jpeg", "image/png", "image/webp"], maximumSizeInBytes: 5 * 1024 * 1024 };
  }
  return null;
}
