// Adresse où renvoyer le membre après sa connexion. Seules les pages de l'espace membre sont
// acceptées : tout le reste (autre site, `//hôte`, schéma, `..`, antislash) est une redirection ouverte.
export function retourValide(
  retour: string | string[] | undefined,
): string | null {
  if (typeof retour !== "string") return null;
  if (!/^\/espace-membre(?:[/?#]|$)/.test(retour)) return null;
  if (
    retour.startsWith("//") ||
    retour.includes("\\") ||
    /(?:^|\/)(?:\.|%2e){2}(?:\/|$)/i.test(retour)
  )
    return null;
  return retour;
}
