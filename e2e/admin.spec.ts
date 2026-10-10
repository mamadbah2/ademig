import { expect, test } from "@playwright/test";
import { COMPTES, seConnecter, seConnecterEtAttendre } from "./comptes";

test("sans session, l'admin renvoie vers la connexion", async ({ page }) => {
  await page.goto("/admin/comptes");
  await expect(page).toHaveURL(/\/admin\/connexion$/);
});

test("un super-admin se connecte puis se déconnecte", async ({ page }) => {
  await seConnecter(page, COMPTES.superadmin.email);
  await expect(page.getByRole("heading", { name: `Bonjour ${COMPTES.superadmin.nom}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Comptes", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion$/);
});

test("l'email est reconnu malgré les majuscules et les espaces", async ({ page }) => {
  await seConnecter(page, `  ${COMPTES.editeur.email.toUpperCase()} `);
  await expect(page.getByRole("heading", { name: `Bonjour ${COMPTES.editeur.nom}` })).toBeVisible();
});

test("un mauvais mot de passe est refusé", async ({ page }) => {
  await seConnecter(page, COMPTES.superadmin.email, "pas-le-bon-mot-de-passe");
  await expect(page.getByRole("alert").filter({ hasText: "Email ou mot de passe incorrect." })).toBeVisible();
});

test("un compte désactivé ne peut pas se connecter", async ({ page }) => {
  await seConnecter(page, COMPTES.inactif.email);
  await expect(page.getByRole("alert").filter({ hasText: "Ce compte est désactivé. Contactez un super-admin." })).toBeVisible();
});

test("un éditeur n'accède pas à la gestion des comptes", async ({ page }) => {
  await seConnecter(page, COMPTES.editeur.email);
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Comptes", exact: true })).toHaveCount(0);
  await page.goto("/admin/comptes");
  await expect(page.getByRole("heading", { name: "Accès refusé" })).toBeVisible();
});

test("désactiver un compte coupe sa session ouverte", async ({ browser }) => {
  const contexteEditeur = await browser.newContext();
  const editeur = await contexteEditeur.newPage();
  await seConnecter(editeur, COMPTES.aDesactiver.email);
  await expect(editeur.getByRole("heading", { name: /Bonjour/ })).toBeVisible();

  const contexteAdmin = await browser.newContext();
  const admin = await contexteAdmin.newPage();
  await seConnecterEtAttendre(admin, COMPTES.superadmin.email);
  await admin.goto("/admin/comptes");
  const ligne = admin.getByRole("listitem").filter({ hasText: COMPTES.aDesactiver.email });
  await ligne.getByRole("button", { name: "Désactiver" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Désactiver" }).click();
  await expect(ligne.getByText("Désactivé", { exact: true })).toBeVisible();

  await editeur.reload();
  await expect(editeur).toHaveURL(/\/admin\/connexion$/);

  await contexteEditeur.close();
  await contexteAdmin.close();
});

test("un lien de réinitialisation expiré est expliqué", async ({ page }) => {
  await page.goto("/admin/reinitialiser?error=INVALID_TOKEN");
  await expect(page.getByText("Ce lien n'est plus valable")).toBeVisible();
  await expect(page.getByRole("link", { name: "Demander un nouveau lien" })).toBeVisible();
});

test("la médiathèque reçoit, décrit et supprime une image", async ({ page }) => {
  const alt = `Image de test e2e ${Date.now()}`;
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/medias");

  await page.getByLabel("Choisir des images").setInputFiles("public/actualites/session-codes-2025.jpg");
  await page.getByLabel("Texte alternatif (obligatoire)").fill(alt);
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  const vignette = page.getByRole("link", { name: alt });
  await expect(vignette).toBeVisible({ timeout: 30_000 });

  await vignette.click();
  await page.getByLabel("Texte alternatif").fill(`${alt} (modifié)`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Description enregistrée." })).toBeVisible();

  await page.getByRole("button", { name: "Supprimer l'image" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/medias$/);
  await expect(page.getByRole("link", { name: `${alt} (modifié)` })).toHaveCount(0);
});

test("un fichier non pris en charge est refusé avant l'envoi", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/medias");
  await page.getByLabel("Choisir des images").setInputFiles({
    name: "IMG_0042.HEIC",
    mimeType: "image/heic",
    buffer: Buffer.from("faux contenu"),
  });
  await expect(page.getByRole("alert").filter({ hasText: "Format non pris en charge (HEIC)" })).toBeVisible();
});
