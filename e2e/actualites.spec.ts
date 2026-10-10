import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const TITRE = "E2E Actualité de test";
const SLUG = "e2e-actualite-de-test";
// La base est partagée avec la production : on ne publie que sur une base dédiée.
const baseDediee = process.env.E2E_BASE_DEDIEE === "1";

test("un éditeur rédige, prévisualise puis supprime une actualité", async ({ page, context }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/actualites");
  await page.getByRole("link", { name: "Nouvelle actualité" }).click();

  await page.getByLabel("Titre", { exact: true }).fill(TITRE);
  await expect(page.getByLabel("Lien de la page")).toHaveValue(SLUG);

  // Une erreur ne doit pas effacer la saisie.
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Corrigez les champs signalés." })).toBeVisible();
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(TITRE);

  await page.getByLabel("Résumé").fill("Un résumé de test.");
  const texte = page.getByRole("textbox", { name: "Texte" });
  await texte.click();
  await page.keyboard.type("Un texte ");
  await page.getByRole("button", { name: "Gras" }).click();
  await page.keyboard.type("important");
  await page.getByRole("button", { name: "Gras" }).click();
  await page.keyboard.type(" avec un lien : ");
  await page.getByRole("button", { name: "Lien" }).click();
  await page.getByLabel("Adresse du lien").fill("https://ensmg.ucad.sn/");
  await page.getByRole("button", { name: "Appliquer" }).click();

  // Choix d'une photo dans le sélecteur de médias (fenêtre rendue dans un portail).
  await page.getByRole("button", { name: "Choisir les photos" }).click();
  const fenetre = page.getByRole("dialog");
  const premiereImage = fenetre.locator("button[aria-pressed]").first();
  await expect(premiereImage, "La médiathèque doit contenir au moins une image (seed).").toBeVisible();
  await premiereImage.click();
  await fenetre.getByRole("button", { name: /^Valider/ }).click();
  await expect(page.getByText("Vignette", { exact: false }).first()).toBeVisible();
  await expect(page.locator("strong", { hasText: "Vignette" })).toHaveCount(1);

  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/\/admin\/actualites\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Actualité créée." })).toBeVisible();

  // Invisible sur le site public.
  const reponse = await page.request.get(`/actualites/${SLUG}`);
  expect(reponse.status()).toBe(404);

  // Visible en aperçu, avec la mise en forme.
  const [apercu] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1, name: TITRE })).toBeVisible();
  await expect(apercu.locator(".texte-long strong", { hasText: "important" })).toBeVisible();
  await expect(apercu.locator('.texte-long a[href="https://ensmg.ucad.sn/"]')).toBeVisible();
  await apercu.getByRole("button", { name: "Quitter l'aperçu" }).click();
  await expect(apercu.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await apercu.close();

  if (baseDediee) {
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Actualité publiée." })).toBeVisible();
    await page.goto("/actualites");
    await expect(page.getByRole("link", { name: new RegExp(TITRE) })).toBeVisible();
    await page.goBack();
    await page.getByRole("button", { name: "Dépublier" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Actualité retirée du site." })).toBeVisible();
  }

  await page.getByRole("button", { name: "Supprimer l'actualité" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/actualites$/);
  await expect(page.getByText(TITRE)).toHaveCount(0);
});

test("un brouillon reste invisible avec un cookie d'aperçu mais sans session", async ({ page, browser }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/actualites/nouveau");
  await page.getByLabel("Titre", { exact: true }).fill(`${TITRE} 2`);
  await page.getByLabel("Résumé").fill("Résumé.");
  await page.getByRole("textbox", { name: "Texte" }).click();
  await page.keyboard.type("Texte.");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/cree=1$/);
  const [apercu] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1 })).toBeVisible();

  // On ne copie que le cookie de Draft Mode dans un navigateur sans session.
  const cookies = (await page.context().cookies()).filter((c) => c.name === "__prerender_bypass");
  expect(cookies).toHaveLength(1);
  const autre = await browser.newContext();
  await autre.addCookies(cookies);
  const visiteur = await autre.newPage();
  await visiteur.goto(`/actualites/${SLUG}-2`);
  await expect(visiteur.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await autre.close();
});
