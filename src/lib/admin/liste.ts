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
