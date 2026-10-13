import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { account, emailsFile, invitations, membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { creerCompte, creerCompteAvecMotDePasse } from "./comptes";
import { creerInvitation, verifierJeton } from "./invitations";
import { demanderReinitialisation } from "./reinitialisation";

const URL_BA = "https://www.ademig.sn/api/auth/reset-password/abc?callbackURL=%2Fadmin%2Freinitialiser";
const urlActivation = (j: string) => `https://www.ademig.sn/espace-membre/activer?jeton=${j}`;

async function membreImporte(db: Db, n = 1) {
  const { id } = await creerCompte(db, { nom: `Membre ${n}`, email: `e2e-${n}@exemple.test`, role: "membre" });
  await db.update(user).set({ actif: false }).where(eq(user.id, id));
  await db.insert(membres).values({ slug: `membre-${n}`, nom: `Membre ${n}`, titre: "T", specialite: "S", resume: "R", userId: id });
  return id;
}

const HEURE = 3600 * 1000;

describe("demanderReinitialisation", () => {
  // Envoi immédiat réservé à la production (voir le test hors production).
  beforeEach(() => vi.stubEnv("VERCEL_ENV", "production"));
  afterEach(() => vi.unstubAllEnvs());

  it("un membre importé pas encore activé reçoit son invitation, pas un lien de réinitialisation", async () => {
    const db = await creerDbTest();
    const id = await membreImporte(db);
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("invitation");
    expect(envoyer).toHaveBeenCalledTimes(1);
    const [{ a, sujet, html }] = envoyer.mock.calls[0];
    expect(a).toBe("e2e-1@exemple.test");
    expect(sujet).toBe("Votre espace membre ADEMIG");
    expect(html).not.toContain("reset-password");
    const jeton = /jeton=([\w-]+)/.exec(html)![1];
    expect((await verifierJeton(db, jeton)).ok).toBe(true);
    // Aucun mot de passe créé : l'activation (numéro de membre, actif) reste possible.
    expect(await db.$count(account, eq(account.userId, id))).toBe(0);
    const [trace] = await db.select().from(emailsFile);
    expect(trace).toMatchObject({ type: "invitation", userId: id, statut: "envoye", html: "" });
  });

  it("si l'envoi échoue, l'invitation part en tête de file", async () => {
    const db = await creerDbTest();
    const id = await membreImporte(db);
    const { jeton: ancien } = await creerInvitation(db, id, new Date(Date.now() - HEURE));
    const envoyer = vi.fn().mockRejectedValue(new Error("panne"));
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("invitation_en_file");
    const [enFile] = await db.select().from(emailsFile);
    expect(enFile).toMatchObject({ statut: "a_envoyer", userId: id, html: "" });
    expect(Date.now() - enFile.creeLe.getTime()).toBeGreaterThan(300 * 24 * 3600 * 1000);
    expect((await verifierJeton(db, ancien)).ok).toBe(true);
  });

  it("un compte désactivé ne reçoit rien", async () => {
    const db = await creerDbTest();
    const id = await membreImporte(db);
    await db.update(user).set({ desactiveLe: new Date() }).where(eq(user.id, id));
    const envoyer = vi.fn();
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("ignore");
    expect(envoyer).not.toHaveBeenCalled();
    expect(await db.select().from(emailsFile)).toHaveLength(0);
  });

  it("un membre activé reçoit le lien de réinitialisation, rédigé pour l'espace membre et ramené vers ses pages", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompteAvecMotDePasse(db, { nom: "Awa", email: "e2e-awa@exemple.test", role: "membre", motDePasse: "motdepasse-solide" });
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("reinitialisation");
    const [{ sujet, html }] = envoyer.mock.calls[0];
    expect(sujet).toBe("Réinitialisation de votre mot de passe ADEMIG");
    expect(html).toContain("votre espace membre");
    expect(html).not.toContain("administration");
    expect(html).toContain("callbackURL=%2Fadmin%2Freinitialiser%3Fespace%3Dmembre");
  });

  it("un compte d'administration garde l'email et le lien de l'administration", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompteAvecMotDePasse(db, { nom: "Admin", email: "e2e-admin@exemple.test", role: "editeur", motDePasse: "motdepasse-solide" });
    const sans = await creerCompte(db, { nom: "Nouvel admin", email: "e2e-nouvel@exemple.test", role: "editeur" });
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("reinitialisation");
    expect(envoyer.mock.calls[0][0].html).toContain("compte d'administration");
    expect(envoyer.mock.calls[0][0].html).toContain(URL_BA.replace(/&/g, "&amp;"));
    // Admin invité sans fiche : invitation de l'administration, comme avant.
    expect(await demanderReinitialisation(db, { userId: sans.id, url: URL_BA }, { envoyer, urlActivation })).toBe("reinitialisation");
    expect(envoyer.mock.calls[1][0].sujet).toBe("Votre accès à l'administration du site ADEMIG");
  });

  it("hors production, l'invitation part en tête de file (le cron de production l'envoie avec son adresse)", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const db = await creerDbTest();
    const id = await membreImporte(db);
    const envoyer = vi.fn();
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("invitation_en_file");
    expect(envoyer).not.toHaveBeenCalled();
    const [enFile] = await db.select().from(emailsFile);
    expect(enFile).toMatchObject({ statut: "a_envoyer", userId: id, html: "" });
    expect(Date.now() - enFile.creeLe.getTime()).toBeGreaterThan(300 * 24 * HEURE);
  });

  it("n'envoie pas de nouvelle invitation moins de 15 minutes après la précédente", async () => {
    const db = await creerDbTest();
    const id = await membreImporte(db);
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("invitation");
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("ignore");
    expect(envoyer).toHaveBeenCalledTimes(1);
    // Passé le délai, l'envoi reprend.
    await db.update(invitations).set({ creeLe: new Date(Date.now() - 16 * 60 * 1000) }).where(eq(invitations.userId, id));
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("invitation");
  });

  it("plafonne à 3 invitations envoyées par 24 heures", async () => {
    const db = await creerDbTest();
    const id = await membreImporte(db);
    const trace = { destinataire: "e2e-1@exemple.test", sujet: "s", html: "", type: "invitation" as const, userId: id, statut: "envoye" as const };
    for (const h of [2, 5, 20]) await db.insert(emailsFile).values({ ...trace, envoyeLe: new Date(Date.now() - h * HEURE) });
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("ignore");
    expect(envoyer).not.toHaveBeenCalled();
    // Une des trois date de plus de 24 heures : un envoi redevient possible.
    await db.update(emailsFile).set({ envoyeLe: new Date(Date.now() - 25 * HEURE) }).where(eq(emailsFile.userId, id));
    expect(await demanderReinitialisation(db, { userId: id, url: URL_BA }, { envoyer, urlActivation })).toBe("invitation");
  });
});
