export const ROLES = ["superadmin", "editeur"] as const;
export type Role = (typeof ROLES)[number];

export const LIBELLES_ROLES: Record<Role, string> = {
  superadmin: "Super-admin",
  editeur: "Éditeur",
};

// Le super-admin a tous les droits de l'éditeur.
export function aLeRole(role: Role, requis: Role): boolean {
  return role === "superadmin" || role === requis;
}

export class AccesRefuse extends Error {
  constructor() {
    super("Accès refusé.");
    this.name = "AccesRefuse";
  }
}
