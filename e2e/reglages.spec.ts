import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

// Base partagée avec la production : on n'enregistre une valeur différente que sur une base dédiée.
const baseDediee = process.env.E2E_BASE_DEDIEE === "1";
const INTRO = "Les ingénieurs formés à Dakar aux métiers des mines et de la géologie";

test.beforeEach(async ({ page }) => {
  // Une saisie non enregistrée déclenche l'avertissement de sortie : on l'accepte.
  page.on("dialog", (d) => d.accept());
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
});

test("les coordonnées et les réseaux refusent une saisie invalide sans rien écrire", async ({ page }) => {
  await page.goto("/admin/reglages");
  await expect(page.getByRole("link", { name: "Coordonnées" })).toHaveAttribute("aria-current", "page");
  const email = page.getByLabel("Email de contact");
  const emailActuel = await email.inputValue();

  await email.fill("pas-une-adresse");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Adresse email invalide.").first()).toBeVisible();
  await expect(email).toHaveValue("pas-une-adresse");
  await page.goto("/admin/reglages");
  await expect(page.getByLabel("Email de contact")).toHaveValue(emailActuel);

  // Réseaux : une adresse en http:// est refusée, et le message dit quel élément corriger.
  await page.getByRole("link", { name: "Réseaux sociaux" }).click();
  await expect(page.getByRole("link", { name: "Réseaux sociaux" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Ajouter un réseau" }).click();
  const rang = await page.getByLabel("Nom du réseau").count();
  await page.getByLabel("Nom du réseau").last().fill("E2E Réseau");
  await page.getByLabel("Adresse", { exact: true }).last().fill("http://exemple.com");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(`Élément ${rang} : Adresse invalide : elle doit commencer par https://.`)).toBeVisible();
  await page.goto("/admin/reglages?onglet=reseaux");
  await expect(page.getByLabel("Nom du réseau")).toHaveCount(rang - 1);
});

test("un texte du site se corrige, se rétablit et reste dans sa limite", async ({ page }) => {
  await page.goto("/admin/reglages?onglet=textes");
  const intro = page.getByRole("textbox", { name: "En-tête : introduction" });
  const rétablir = page.getByRole("button", { name: "Rétablir le texte d'origine : En-tête : introduction" });

  // Enregistrer sans rien changer : aucun texte n'est modifié, mais le formulaire réel passe la validation stricte.
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Textes enregistrés." })).toBeVisible();

  // Trop long : erreur sous le champ, saisie conservée.
  await intro.fill("x".repeat(161));
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("160 caractères au plus.")).toBeVisible();
  await expect(intro).toHaveValue("x".repeat(161));

  // Rétablir remet le texte d'origine dans le champ, sans enregistrer.
  await rétablir.click();
  await expect(intro).toHaveValue(INTRO);
  await expect(rétablir).toBeDisabled();

  if (baseDediee) {
    await intro.fill("E2E Introduction de test");
    await expect(page.getByText("Modifié", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Textes enregistrés." })).toBeVisible();
    await page.goto("/amicale");
    await expect(page.getByText("E2E Introduction de test")).toBeVisible();

    await page.goto("/admin/reglages?onglet=textes");
    await rétablir.click();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Textes enregistrés." })).toBeVisible();
    await page.goto("/amicale");
    await expect(page.getByText(INTRO)).toBeVisible();
  }
});
