import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

test("le focus clavier suit les éléments déplacés ou retirés", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/actualites/nouveau");
  const ajouter = page.getByRole("button", { name: "Ajouter une source" });
  await ajouter.click();
  await ajouter.click();

  await page.getByRole("button", { name: "Sources : descendre l'élément 1" }).click();
  await expect(page.getByRole("button", { name: "Sources : monter l'élément 2" })).toBeFocused();

  await page.getByRole("button", { name: "Sources : retirer l'élément 2" }).click();
  await expect(page.getByRole("button", { name: "Sources : retirer l'élément 1" })).toBeFocused();
  await page.getByRole("button", { name: "Sources : retirer l'élément 1" }).click();
  await expect(ajouter).toBeFocused();
});

test("la boîte de lien se ferme avec Échap et rend le focus", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/actualites/nouveau");
  await page.getByRole("textbox", { name: "Texte" }).click();
  const lien = page.getByRole("button", { name: "Lien" });
  await lien.click();
  await page.getByLabel("Adresse du lien").fill("pas-une-adresse");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "L'adresse doit commencer" })).toBeVisible();
  await page.getByLabel("Adresse du lien").press("Escape");
  await expect(page.getByLabel("Adresse du lien")).toHaveCount(0);
  await expect(lien).toBeFocused();
  await lien.click();
  await expect(page.getByRole("alert").filter({ hasText: "L'adresse doit commencer" })).toHaveCount(0);
});
