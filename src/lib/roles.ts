export const ROLES = ["superadmin", "editeur", "tresorier", "membre"] as const;
export type Role = (typeof ROLES)[number];
// Rôles qui donnent accès à l'administration ; `membre` ne se donne que par l'import.
export const ROLES_ADMIN = ["superadmin", "editeur", "tresorier"] as const satisfies readonly Role[];

export const LIBELLES_ROLES: Record<Role, string> = {
  superadmin: "Super-admin",
  editeur: "Éditeur",
  tresorier: "Trésorier",
  membre: "Membre",
};

// Le super-admin a tous les droits ; les autres rôles n'ont que le leur.
export function aLeRole(role: Role, requis: Role): boolean {
  return role === "superadmin" || role === requis;
}

export function estRoleAdmin(role: Role): boolean {
  return (ROLES_ADMIN as readonly Role[]).includes(role);
}

export class AccesRefuse extends Error {
  constructor() {
    super("Accès refusé.");
    this.name = "AccesRefuse";
  }
}

// Où l'on arrive après la connexion : les rôles d'administration vont à l'admin, le membre à son espace.
export function destinationApresConnexion(role: Role): "/admin" | "/espace-membre" {
  return estRoleAdmin(role) ? "/admin" : "/espace-membre";
}
