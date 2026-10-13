import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";
import { db } from "../src/db";
import { creerCompteAvecMotDePasse } from "../src/db/operations/comptes";
import { creerInvitation } from "../src/db/operations/invitations";
import { membres, user } from "../src/db/schema";
import { motDePasseE2E, seConnecterEtAttendre } from "./comptes";

const EMAIL_MEMBRE = "e2e-membre@ademig.test";
const EMAIL_IMPORT_ADMIN = "e2e-import-admin@ademig.test";
const MOT_DE_PASSE_MEMBRE = "e2e-mot-de-passe-membre-12";

test("un membre invité active son compte, complète son profil et se retrouve dans l'annuaire", async ({ page }) => {
  // Préparation par la base : compte inactif, fiche liée, invitation.
  await db.delete(user).where(eq(user.email, EMAIL_MEMBRE));
  const userId = randomUUID();
  await db.insert(user).values({ id: userId, name: "E2E Membre", email: EMAIL_MEMBRE, role: "membre", actif: false });
  await db.insert(membres).values({
    slug: "e2e-membre",
    nom: "E2E Membre",
    titre: "Ingénieur",
    specialite: "Géologie",
    promotion: 2012,
    resume: "",
    visible: false,
    annuaire: true,
    userId,
  });
  const { jeton } = await creerInvitation(db, userId);

  // 1. Activation.
  await page.goto(`/espace-membre/activer?jeton=${jeton}`);
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE_MEMBRE);
  await page.getByLabel("Confirmer le mot de passe").fill(MOT_DE_PASSE_MEMBRE);
  await page.getByRole("button", { name: "Activer mon compte" }).click();
  await expect(page).toHaveURL(/\/espace-membre\?bienvenue=1$/);
  await expect(page.getByText("Compte activé")).toBeVisible();

  // 2. Profil.
  await page.goto("/espace-membre/profil");
  await page.getByLabel("Présentation").fill("Géologue de test, passionnée de cartographie.");
  await page.getByLabel("LinkedIn").fill("https://www.linkedin.com/in/e2e-membre");
  await page.getByRole("radio", { name: /Membres seulement/ }).check();
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Profil enregistré.")).toBeVisible();

  // 3. Annuaire.
  await page.goto("/espace-membre/annuaire");
  await page.getByLabel("Rechercher").fill("e2e");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/q=e2e/);
  const carte = page.getByRole("listitem").filter({ hasText: "E2E Membre" });
  await expect(carte).toBeVisible();
  await expect(carte.getByRole("link", { name: /LinkedIn/ })).toHaveAttribute("href", "https://www.linkedin.com/in/e2e-membre");

  // 4. Lien déjà utilisé.
  await page.goto(`/espace-membre/activer?jeton=${jeton}`);
  await expect(page.getByText("Ce lien a déjà servi")).toBeVisible();

  // 5. Un membre n'entre pas dans l'administration.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/espace-membre$/);

  // 6. Déconnexion : l'espace redemande la connexion.
  await page.getByRole("button", { name: "Déconnexion" }).first().click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await page.goto("/espace-membre");
  await expect(page).toHaveURL(/\/connexion\?retour=/);
});

test("un super-admin importe un CSV de membres : aperçu, confirmation, invitations en file", async ({ page }) => {
  await db.delete(user).where(eq(user.email, EMAIL_IMPORT_ADMIN));
  await creerCompteAvecMotDePasse(db, {
    email: EMAIL_IMPORT_ADMIN,
    nom: "E2E Import Admin",
    role: "superadmin",
    motDePasse: motDePasseE2E(),
  });
  await seConnecterEtAttendre(page, EMAIL_IMPORT_ADMIN);

  await page.goto("/admin/membres/importer");
  const csv = "nom;prenom;email\nImportun;E2E Un;e2e-import-1@ademig.test\nImportune;E2E Deux;e2e-import-2@ademig.test\n";
  await page.getByLabel("Fichier CSV").setInputFiles({ name: "membres.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Analyser le fichier" }).click();

  // Aperçu : 2 nouveaux, aucun autre statut.
  await expect(page.getByRole("heading", { name: "Aperçu avant import" })).toBeVisible();
  await expect(page.getByText("nouveaux", { exact: true }).locator("xpath=..")).toHaveText("2nouveaux");
  await page.getByRole("button", { name: /^Importer 2 membres/ }).click();

  await expect(page.getByText(/2 fiche\(s\) créée\(s\)/)).toBeVisible();
  await expect(page.getByText(/2 invitation\(s\) mise\(s\) en file/)).toBeVisible();

  // La liste montre les deux comptes « En file ».
  await page.goto("/admin/membres?q=e2e");
  for (const nom of ["E2E Un", "E2E Deux"]) {
    const ligne = page.getByRole("listitem").filter({ hasText: nom });
    await expect(ligne.getByText("En file")).toBeVisible();
  }
});
