export function messageConnexion(status: number): string {
  if (status === 403) return "Ce compte est désactivé. Contactez un super-admin.";
  if (status === 429) return "Trop de tentatives. Patientez une minute puis réessayez.";
  return "Email ou mot de passe incorrect.";
}

export function messageChangementMotDePasse(code: string | undefined): string {
  if (code === "INVALID_PASSWORD") return "Le mot de passe actuel est incorrect.";
  if (code === "PASSWORD_TOO_SHORT") return "Le nouveau mot de passe doit faire au moins 12 caractères.";
  return "Le mot de passe n'a pas pu être changé. Réessayez.";
}
