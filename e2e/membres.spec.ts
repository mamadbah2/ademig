import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const NOM = "E2E Membre de test";
const SLUG = "e2e-membre-de-test";

test("un éditeur prépare une fiche masquée avec le formulaire réduit, puis la supprime", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/membres");
  await page.getByRole("link", { name: "Nouveau membre" }).click();

  // Plus de page par membre : ni résumé, ni biographie, ni parcours, ni email public.
  for (const champ of ["Résumé", "Email public", "Ville", "Numéro d'ingénieur"]) {
    await expect(page.getByLabel(champ, { exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("textbox", { name: "Biographie" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ajouter une étape" })).toHaveCount(0);

  await page.getByLabel("Nom", { exact: true }).fill(NOM);
  // L'identifiant interne est tiré du nom, sans champ visible.
  await expect(page.getByLabel("Lien de la page")).toHaveCount(0);
  await expect(page.locator('input[type="hidden"][name="slug"]')).toHaveValue(SLUG);
  await page.getByLabel("Titre", { exact: true }).fill("Géologue d'exploration");
  await page.getByLabel("Organisation").fill("E2E Mines");
  await page.getByLabel("Promotion").fill("2015");
  // Masquée par défaut à la création.
  await expect(page.getByLabel("Visible sur le site")).not.toBeChecked();

  // LinkedIn invalide : erreur sur le champ, saisie conservée.
  await page.getByLabel("Profil LinkedIn").fill("https://example.com/in/e2e");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText(/LinkedIn/).filter({ hasNotText: "Profil LinkedIn" }).first()).toBeVisible();
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue("Géologue d'exploration");
  await page.getByLabel("Profil LinkedIn").fill("https://www.linkedin.com/in/e2e-membre");

  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/membres\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Membre ajouté." })).toBeVisible();
  await expect(page.getByLabel("Profil LinkedIn")).toHaveValue("https://www.linkedin.com/in/e2e-membre");
  // Pas d'aperçu : il n'y a plus de page à prévisualiser.
  await expect(page.getByRole("link", { name: "Aperçu" })).toHaveCount(0);
  const id = page.url().match(/membres\/([0-9a-f-]{36})/)![1];
  expect((await page.request.get(`/api/apercu?type=membre&id=${id}`, { maxRedirects: 0 })).status()).toBe(404);

  // Masquée : absente de l'annuaire public.
  expect(await (await page.request.get("/membres")).text()).not.toContain(NOM);

  await page.getByRole("button", { name: "Supprimer le membre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/membres$/);
  await expect(page.getByText(NOM)).toHaveCount(0);
});

test("les anciennes adresses de fiche redirigent définitivement vers l'annuaire", async ({ page }) => {
  for (const chemin of ["/membres/ibrahima-diao", "/membres/nimporte-quoi", "/membres/a/b"]) {
    const r = await page.request.get(chemin, { maxRedirects: 0 });
    expect([301, 308], chemin).toContain(r.status());
    expect(new URL(r.headers()["location"], "http://x").pathname).toBe("/membres");
  }
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).not.toMatch(/\/membres\/[a-z]/);
});

test("les cartes des membres n'ouvrent que LinkedIn, dans un nouvel onglet", async ({ page }) => {
  for (const chemin of ["/", "/membres", "/bureau"]) {
    await page.goto(chemin);
    await expect(page.locator('main a[href^="/membres/"]')).toHaveCount(0);
    const liens = page.locator('main a[aria-label$="profil LinkedIn (nouvel onglet)"]');
    for (const lien of await liens.all()) {
      await expect(lien).toHaveAttribute("target", "_blank");
      await expect(lien).toHaveAttribute("rel", "noopener noreferrer");
      await expect(lien).toHaveAttribute("href", /^https:\/\/www\.linkedin\.com\/in\//);
    }
  }
});
