import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const MEMBRE = "E2E Membre du bureau";
const MANDAT = "E2E Mandat de test";

// Base partagée avec la production : on prépare un mandat, on ne l'active jamais.
test("un éditeur prépare un mandat sans toucher au bureau en place, puis le supprime", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);

  // Membre de test, masqué.
  await page.goto("/admin/membres/nouveau");
  await page.getByLabel("Nom", { exact: true }).fill(MEMBRE);
  await expect(page.getByLabel("Lien de la page")).toHaveValue("e2e-membre-du-bureau");
  await page.getByLabel("Poste actuel").fill("Géologue");
  await page.getByLabel("Spécialité").fill("Géologie");
  await page.getByLabel("Résumé").fill("Membre créé par les tests.");
  await expect(page.getByLabel("Visible sur le site")).not.toBeChecked();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/membres\/[0-9a-f-]{36}\?cree=1$/);
  const fiche = page.url().replace(/\?cree=1$/, "");

  await page.goto("/bureau");
  const bureauAvant = await page.locator("main").innerText();

  // Nouveau mandat, inactif.
  await page.goto("/admin/bureau");
  await page.getByLabel("Libellé").fill(MANDAT);
  await page.getByLabel("Date d'élection").fill("2030-01-15");
  const reprendre = page.getByLabel(/Reprendre les commissions/);
  if ((await reprendre.count()) > 0) await reprendre.uncheck();
  await page.getByRole("button", { name: "Créer le mandat" }).click();
  await expect(page).toHaveURL(/\/admin\/bureau\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Mandat créé." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activer ce mandat" })).toBeVisible();

  const postes = page.getByRole("group", { name: "Postes" });
  const ajouterPoste = postes.getByRole("button", { name: "Ajouter un poste" });
  await ajouterPoste.click();
  await postes.getByLabel("Membre", { exact: true }).selectOption({ label: `${MEMBRE} (masqué)` });
  await postes.getByLabel("Fonction").fill("Trésorier");

  // Le même membre à deux postes : erreur, saisie conservée.
  await ajouterPoste.click();
  await postes.getByLabel("Membre", { exact: true }).nth(1).selectOption({ label: `${MEMBRE} (masqué)` });
  await postes.getByLabel("Fonction").nth(1).fill("Secrétaire");
  await page.getByRole("button", { name: "Enregistrer le mandat" }).click();
  await expect(page.getByText("Un membre n'occupe qu'un poste par mandat.")).toBeVisible();
  await expect(postes.getByLabel("Fonction").nth(1)).toHaveValue("Secrétaire");
  await postes.getByRole("button", { name: "Postes : retirer l'élément 2" }).click();

  const commissions = page.getByRole("group", { name: "Commissions", exact: true });
  await commissions.getByRole("button", { name: "Ajouter une commission" }).click();
  await commissions.getByLabel("Nom de la commission").fill("E2E Commission");
  await commissions.getByLabel("Mission", { exact: true }).fill("Mission de test.");
  const membresCommission = commissions.getByRole("group", { name: "Membres de la commission 1" });
  await membresCommission.getByRole("button", { name: "Ajouter un membre à la commission" }).click();
  await membresCommission.getByLabel("Membre", { exact: true }).selectOption({ label: `${MEMBRE} (masqué)` });

  await page.getByRole("button", { name: "Enregistrer le mandat" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Mandat enregistré." })).toBeVisible();
  await page.reload();
  await expect(postes.getByLabel("Fonction")).toHaveValue("Trésorier");
  await expect(commissions.getByLabel("Nom de la commission")).toHaveValue("E2E Commission");
  await expect(membresCommission.getByLabel("Membre", { exact: true })).toHaveValue(/[0-9a-f-]{36}/);

  // Le bureau public n'a pas changé.
  await page.goto("/bureau");
  expect(await page.locator("main").innerText()).toBe(bureauAvant);

  // Un membre d'un bureau ne se supprime pas.
  await page.goto(fiche);
  await page.getByRole("button", { name: "Supprimer le membre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText(/fait partie d'un bureau/)).toBeVisible();

  // Suppression du mandat de test, puis du membre.
  await page.goto("/admin/bureau");
  await page.getByRole("link", { name: new RegExp(MANDAT) }).click();
  await page.getByRole("button", { name: "Supprimer le mandat" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/bureau$/);
  await expect(page.getByText(MANDAT)).toHaveCount(0);

  await page.goto(fiche);
  await page.getByRole("button", { name: "Supprimer le membre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/membres$/);
});
