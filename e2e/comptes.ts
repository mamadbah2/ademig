import { type Page, expect } from "@playwright/test";

export const COMPTES = {
  superadmin: { email: "e2e-superadmin@ademig.test", nom: "E2E Super-admin", role: "superadmin" },
  editeur: { email: "e2e-editeur@ademig.test", nom: "E2E Éditeur", role: "editeur" },
  inactif: { email: "e2e-inactif@ademig.test", nom: "E2E Inactif", role: "editeur" },
  aDesactiver: { email: "e2e-a-desactiver@ademig.test", nom: "E2E À désactiver", role: "editeur" },
} as const;

// Mot de passe aléatoire généré à chaque lancement par e2e/preparation.ts (jamais écrit dans le code).
export function motDePasseE2E(): string {
  const mdp = process.env.E2E_MOT_DE_PASSE;
  if (!mdp) throw new Error("E2E_MOT_DE_PASSE absent : lancez les tests via `E2E_AUTORISE=1 npm run test:e2e`.");
  return mdp;
}

export async function seConnecter(page: Page, email: string, motDePasse = motDePasseE2E()) {
  await page.goto("/admin/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

// Attend la fin de la connexion avant toute navigation (sinon le goto interrompt la requête).
export async function seConnecterEtAttendre(page: Page, email: string) {
  await seConnecter(page, email);
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
}
