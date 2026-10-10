import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const NOM = "E2E Partenaire de test";
// Base partagée avec la production : le partenaire de test reste masqué sauf sur une base dédiée.
const baseDediee = process.env.E2E_BASE_DEDIEE === "1";

test("un éditeur ajoute un partenaire masqué, le déplace puis le supprime", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/partenaires");
  await page.getByRole("link", { name: "Nouveau partenaire" }).click();

  await page.getByLabel("Nom", { exact: true }).fill(NOM);
  await page.getByLabel("Catégorie").selectOption("Entreprise");
  await page.getByLabel("Description").fill("Partenaire créé par les tests.");
  await page.getByLabel("Visible sur le site").uncheck();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/admin\/partenaires\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Partenaire ajouté." })).toBeVisible();

  // Nom en double : erreur sur le champ.
  await page.goto("/admin/partenaires/nouveau");
  await page.getByLabel("Nom", { exact: true }).fill(NOM.toUpperCase());
  await page.getByLabel("Description").fill("Doublon.");
  await page.getByLabel("Visible sur le site").uncheck();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Ce partenaire existe déjà.").first()).toBeVisible();

  // Nouveau = dernier de la liste ; on le monte d'un rang, le focus reste sur le bouton.
  await page.goto("/admin/partenaires");
  const ligne = page.getByRole("listitem").filter({ hasText: NOM });
  await expect(ligne.getByText("Masqué")).toBeVisible();
  await expect(page.getByRole("button", { name: `Descendre ${NOM}` })).toBeDisabled();
  const monter = page.getByRole("button", { name: `Monter ${NOM}` });
  await monter.click();
  await expect(page.getByRole("button", { name: `Descendre ${NOM}` })).toBeEnabled();
  await expect(monter).toBeFocused();

  // Masqué : absent de la page publique.
  await page.goto("/partenaires");
  await expect(page.getByText(NOM)).toHaveCount(0);

  if (baseDediee) {
    await page.goto("/admin/partenaires");
    await page.getByRole("link", { name: NOM }).click();
    await page.getByLabel("Visible sur le site").check();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Partenaire enregistré." })).toBeVisible();
    await page.goto("/partenaires");
    await expect(page.getByText(NOM)).toBeVisible();
  }

  await page.goto("/admin/partenaires");
  await page.getByRole("link", { name: NOM }).click();
  await page.getByRole("button", { name: "Supprimer le partenaire" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/partenaires$/);
  await expect(page.getByText(NOM)).toHaveCount(0);
});
