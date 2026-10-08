export const MOT_DE_PASSE = "MotDePasse-E2E-2026";

export const COMPTES = {
  superadmin: { email: "e2e-superadmin@ademig.test", nom: "E2E Super-admin", role: "superadmin" },
  editeur: { email: "e2e-editeur@ademig.test", nom: "E2E Éditeur", role: "editeur" },
  inactif: { email: "e2e-inactif@ademig.test", nom: "E2E Inactif", role: "editeur" },
  aDesactiver: { email: "e2e-a-desactiver@ademig.test", nom: "E2E À désactiver", role: "editeur" },
} as const;
