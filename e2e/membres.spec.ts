import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const NOM = "E2E Membre de test";
const SLUG = "e2e-membre-de-test";

test("un éditeur prépare une fiche masquée, la prévisualise puis la supprime", async ({ page, context, browser }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/membres");
  await page.getByRole("link", { name: "Nouveau membre" }).click();

  await page.getByLabel("Nom", { exact: true }).fill(NOM);
  await expect(page.getByLabel("Lien de la page")).toHaveValue(SLUG);
  await page.getByLabel("Poste actuel").fill("Géologue d'exploration");
  await page.getByLabel("Spécialité").fill("Géologie");
  await page.getByLabel("Promotion").fill("2015");
  await page.getByLabel("Résumé").fill("Un résumé de test.");
  // Masquée par défaut à la création.
  await expect(page.getByLabel("Visible sur le site")).not.toBeChecked();

  const bio = page.getByRole("textbox", { name: "Biographie" });
  await bio.click();
  await page.keyboard.type("Une biographie ");
  // Tiptap rend le focus à l'éditeur à l'image suivante : on attend avant de taper.
  const gras = page.getByRole("button", { name: "Gras" });
  await gras.click();
  await expect(gras).toHaveAttribute("aria-pressed", "true");
  await expect(bio).toBeFocused();
  await page.keyboard.type("importante");

  await page.getByRole("button", { name: "Ajouter une étape" }).click();
  await page.getByLabel("Période").fill("2015");
  await page.getByLabel("Poste occupé").fill("Ingénieure diplômée");
  await page.getByLabel("Employeur ou école").fill("ENSMG");
  await page.getByRole("button", { name: "Ajouter une compétence" }).click();
  await page.getByLabel("Compétence", { exact: true }).fill("Cartographie");

  // Email invalide : erreur sur le champ, saisie des listes conservée.
  await page.getByLabel("Email public").fill("pas-un-email");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Adresse email invalide.")).toBeVisible();
  await expect(page.getByLabel("Période")).toHaveValue("2015");
  await page.getByLabel("Email public").fill("");

  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/membres\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Membre ajouté." })).toBeVisible();

  // Masquée : ni en accès direct, ni dans l'annuaire.
  expect((await page.request.get(`/membres/${SLUG}`)).status()).toBe(404);
  expect(await (await page.request.get("/membres")).text()).not.toContain(NOM);

  const [apercu] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1, name: NOM })).toBeVisible();
  await expect(apercu.locator("strong", { hasText: "importante" })).toBeVisible();
  await expect(apercu.getByText("Aperçu : ce contenu n'est peut-être pas publié.")).toBeVisible();

  // Le seul cookie de Draft Mode, sans session, ne montre pas la fiche.
  const cookies = (await context.cookies()).filter((c) => c.name === "__prerender_bypass");
  expect(cookies).toHaveLength(1);
  const autre = await browser.newContext();
  await autre.addCookies(cookies);
  const visiteur = await autre.newPage();
  await visiteur.goto(`/membres/${SLUG}`);
  await expect(visiteur.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await autre.close();

  await apercu.getByRole("button", { name: "Quitter l'aperçu" }).click();
  await expect(apercu.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await apercu.close();

  await page.getByRole("button", { name: "Supprimer le membre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/membres$/);
  await expect(page.getByText(NOM)).toHaveCount(0);
});
