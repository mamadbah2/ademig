const ROUTES_PUBLIQUES = ["/admin/connexion", "/admin/mot-de-passe-oublie", "/admin/reinitialiser"];

export function estRouteAdminPublique(chemin: string): boolean {
  return ROUTES_PUBLIQUES.some((r) => chemin === r || chemin.startsWith(`${r}/`));
}

const ROUTES_MEMBRE_PUBLIQUES = ["/espace-membre/activer"];

export function estRouteMembrePublique(chemin: string): boolean {
  return ROUTES_MEMBRE_PUBLIQUES.some((r) => chemin === r || chemin.startsWith(`${r}/`));
}

// Décision du proxy, sans dépendance à Next : `null` laisse passer, sinon l'adresse de redirection.
export function decisionProxy(chemin: string, aCookie: boolean): string | null {
  if (aCookie) return null;
  if (chemin === "/admin" || chemin.startsWith("/admin/")) {
    return estRouteAdminPublique(chemin) ? null : "/admin/connexion";
  }
  if (chemin === "/espace-membre" || chemin.startsWith("/espace-membre/")) {
    return estRouteMembrePublique(chemin) ? null : `/connexion?retour=${encodeURIComponent(chemin)}`;
  }
  return null;
}
