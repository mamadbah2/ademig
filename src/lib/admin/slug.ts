const LONGUEUR_MAX = 80;

// Adresse lisible tirée d'un titre : « Journée du contenu local » → « journee-du-contenu-local ».
export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LONGUEUR_MAX)
    .replace(/-+$/, "");
}
