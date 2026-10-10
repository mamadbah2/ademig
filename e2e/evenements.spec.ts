import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const TITRE = "E2E Événement de test";
const SLUG = "e2e-evenement-de-test";

test("un éditeur prépare un événement, le prévisualise puis le supprime", async ({ page, context }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/evenements");
  await page.getByRole("link", { name: "Nouvel événement" }).click();

  await page.getByLabel("Titre", { exact: true }).fill(TITRE);
  await expect(page.getByLabel("Lien de la page")).toHaveValue(SLUG);
  await page.getByLabel("Début").fill("2026-12-05T09:00");
  await page.getByLabel("Fin", { exact: true }).fill("2026-12-05T08:00");
  await page.getByLabel("Lieu", { exact: true }).fill("CICAD");
  await page.getByLabel("Ville").fill("Diamniadio");
  await page.getByLabel("Résumé").fill("Un résumé de test.");
  await page.getByRole("textbox", { name: "Présentation" }).click();
  await page.keyboard.type("Présentation de l'événement.");
  await page.getByRole("button", { name: "Ajouter un partenaire" }).click();
  await page.getByLabel("Nom du partenaire").fill("E2E partenaire libre");

  // Fin avant le début : erreur sur le champ, saisie conservée.
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByText("La fin doit être après le début.")).toBeVisible();
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(TITRE);
  await expect(page.getByLabel("Nom du partenaire")).toHaveValue("E2E partenaire libre");

  await page.getByLabel("Fin", { exact: true }).fill("2026-12-05T18:00");
  await page.getByRole("button", { name: "Choisir une image" }).click();
  const fenetre = page.getByRole("dialog");
  const premiereImage = fenetre.locator("button[aria-pressed]").first();
  await expect(premiereImage, "La médiathèque doit contenir au moins une image (seed).").toBeVisible();
  await premiereImage.click();
  await fenetre.getByRole("button", { name: /^Valider/ }).click();

  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/\/admin\/evenements\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Événement créé." })).toBeVisible();
  // L'heure saisie est relue à l'identique (Dakar = UTC).
  await expect(page.getByLabel("Début")).toHaveValue("2026-12-05T09:00");

  expect((await page.request.get(`/evenements/${SLUG}`)).status()).toBe(404);

  const [apercu] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1, name: TITRE })).toBeVisible();
  await expect(apercu.getByText("E2E partenaire libre")).toBeVisible();
  await apercu.getByRole("button", { name: "Quitter l'aperçu" }).click();
  await expect(apercu.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await apercu.close();

  await page.getByRole("button", { name: "Supprimer l'événement" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/evenements$/);
  await expect(page.getByText(TITRE)).toHaveCount(0);
});

test("un brouillon reste invisible avec un cookie d'aperçu mais sans session", async ({ page, browser }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/evenements/nouveau");
  await page.getByLabel("Titre", { exact: true }).fill(`${TITRE} 2`);
  await expect(page.getByLabel("Lien de la page")).toHaveValue(`${SLUG}-2`);
  await page.getByLabel("Début").fill("2026-12-06T09:00");
  await page.getByLabel("Fin", { exact: true }).fill("2026-12-06T18:00");
  await page.getByLabel("Lieu", { exact: true }).fill("CICAD");
  await page.getByLabel("Ville").fill("Diamniadio");
  await page.getByLabel("Résumé").fill("Un résumé de test.");
  await page.getByRole("textbox", { name: "Présentation" }).click();
  await page.keyboard.type("Présentation de l'événement.");
  await page.getByRole("button", { name: "Choisir une image" }).click();
  const fenetre = page.getByRole("dialog");
  const premiereImage = fenetre.locator("button[aria-pressed]").first();
  await expect(premiereImage, "La médiathèque doit contenir au moins une image (seed).").toBeVisible();
  await premiereImage.click();
  await fenetre.getByRole("button", { name: /^Valider/ }).click();
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/cree=1$/);
  const [apercu] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1, name: `${TITRE} 2` })).toBeVisible();

  // On ne copie que le cookie de Draft Mode dans un navigateur sans session.
  const cookies = (await page.context().cookies()).filter((c) => c.name === "__prerender_bypass");
  expect(cookies).toHaveLength(1);
  const autre = await browser.newContext();
  await autre.addCookies(cookies);
  const visiteur = await autre.newPage();
  await visiteur.goto(`/evenements/${SLUG}-2`);
  await expect(visiteur.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await autre.close();
});
