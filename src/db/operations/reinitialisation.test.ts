import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { account, emailsFile, membres, user } from "@/db/schema";
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

describe("demanderReinitialisation", () => {
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
    const { jeton: ancien } = await creerInvitation(db, id);
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
});
