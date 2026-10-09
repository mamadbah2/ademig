const ROUTES_PUBLIQUES = ["/admin/connexion", "/admin/mot-de-passe-oublie", "/admin/reinitialiser"];

export function estRouteAdminPublique(chemin: string): boolean {
  return ROUTES_PUBLIQUES.some((r) => chemin === r || chemin.startsWith(`${r}/`));
}
