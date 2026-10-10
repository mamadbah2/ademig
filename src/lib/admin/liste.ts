// Déplacement par les boutons ↑ / ↓ : utilisables au clavier et sur mobile, contrairement au glisser-déposer.
export function deplacer<T>(liste: T[], index: number, sens: -1 | 1): T[] {
  const cible = index + sens;
  if (cible < 0 || cible >= liste.length) return liste;
  const copie = [...liste];
  [copie[index], copie[cible]] = [copie[cible], copie[index]];
  return copie;
}

export function retirer<T>(liste: T[], index: number): T[] {
  return liste.filter((_, i) => i !== index);
}

export type CibleFocus = { index: number; bouton: "haut" | "bas" | "retirer" } | "ajout";

// Où remettre le focus clavier après une action : jamais sur un bouton disparu ou désactivé.
export function cibleFocusApres(action: "monter" | "descendre" | "retirer", index: number, longueur: number): CibleFocus {
  if (action === "monter") return { index: index - 1, bouton: index - 1 === 0 ? "bas" : "haut" };
  if (action === "descendre") return { index: index + 1, bouton: index + 1 === longueur - 1 ? "haut" : "bas" };
  if (longueur === 1) return "ajout";
  return { index: Math.min(index, longueur - 2), bouton: "retirer" };
}
