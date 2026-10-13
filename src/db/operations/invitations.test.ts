import { verifyPassword } from "better-auth/crypto";
import { asc, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { account, emailsFile, invitations, membres, session, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { creerCompte, creerCompteAvecMotDePasse } from "./comptes";
import { ErreurMetier } from "./erreurs";
import {
  activerCompte,
  creerInvitation,
  desactiverCompteMembre,
  etatCompte,
  genererLienInvitation,
  inviterLesNonInvites,
  inviterParEmail,
  reactiverCompteMembre,
  suiviInvitations,
  verifierInvitable,
  verifierJeton,
} from "./invitations";

const JOUR = 24 * 3600 * 1000;

async function membreAvecCompte(db: Db, n: number) {
  const { id } = await creerCompte(db, { nom: `Membre ${n}`, email: `e2e-${n}@ademig.test`, role: "membre" });
  await db.insert(membres).values({ slug: `membre-${n}`, nom: `Membre ${n}`, titre: "T", specialite: "S", resume: "R", userId: id });
  return id;
}

const jetonDe = (html: string) => /jeton=([\w-]+)/.exec(html)![1];

describe("invitations", () => {
  it("un jeton créé est valide", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const { jeton } = await creerInvitation(db, id);
    expect(await verifierJeton(db, jeton)).toMatchObject({ ok: true, userId: id, email: "e2e-1@ademig.test" });
  });

  it("un second jeton invalide le premier", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const { jeton: premier } = await creerInvitation(db, id);
    const { jeton: second } = await creerInvitation(db, id);
    expect(await verifierJeton(db, premier)).toEqual({ ok: false, raison: "inconnu" });
    expect((await verifierJeton(db, second)).ok).toBe(true);
  });

  it("expire après 30 jours", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const t0 = new Date();
    const { jeton } = await creerInvitation(db, id, t0);
    expect(await verifierJeton(db, jeton, new Date(t0.getTime() + 31 * JOUR))).toEqual({ ok: false, raison: "expire" });
    expect((await verifierJeton(db, jeton, new Date(t0.getTime() + 29 * JOUR))).ok).toBe(true);
  });

  it("jeton inconnu", async () => {
    const db = await creerDbTest();
    expect(await verifierJeton(db, "nimportequoi")).toEqual({ ok: false, raison: "inconnu" });
  });
});

describe("activerCompte", () => {
  it("crée le mot de passe, active le compte et numérote les membres", async () => {
    const db = await creerDbTest();
    const a = await membreAvecCompte(db, 1);
    const b = await membreAvecCompte(db, 2);
    await db.update(user).set({ actif: false }).where(eq(user.id, a));
    const { jeton } = await creerInvitation(db, a);
    expect(await activerCompte(db, jeton, "motdepasse-solide")).toEqual({ email: "e2e-1@ademig.test" });

    const cred = await db.query.account.findFirst({ where: eq(account.userId, a) });
    expect(cred?.providerId).toBe("credential");
    expect(await verifyPassword({ hash: cred!.password!, password: "motdepasse-solide" })).toBe(true);
    expect((await db.query.user.findFirst({ where: eq(user.id, a) }))!.actif).toBe(true);
    const fiche = await db.query.membres.findFirst({ where: eq(membres.userId, a) });
    expect(fiche?.activeLe).toBeInstanceOf(Date);
    expect(fiche?.numeroMembre).toBe(1);
    const [inv] = await db.select().from(invitations).where(eq(invitations.userId, a));
    expect(inv.utiliseeLe).toBeInstanceOf(Date);
    expect(await verifierJeton(db, jeton)).toEqual({ ok: false, raison: "utilise" });

    const { jeton: jeton2 } = await creerInvitation(db, b);
    await activerCompte(db, jeton2, "motdepasse-solide");
    expect((await db.query.membres.findFirst({ where: eq(membres.userId, b) }))!.numeroMembre).toBe(2);
  });

  it("refuse un second usage du même jeton sans créer de second account", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const { jeton } = await creerInvitation(db, id);
    await activerCompte(db, jeton, "motdepasse-solide");
    const erreur = await activerCompte(db, jeton, "autre-mot-de-passe").catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.message).toBe("Ce lien a déjà servi : connectez-vous ou demandez un nouveau lien.");
    expect(await db.select().from(account).where(eq(account.userId, id))).toHaveLength(1);
  });

  it("refuse un mot de passe de moins de 12 caractères", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const { jeton } = await creerInvitation(db, id);
    const erreur = await activerCompte(db, jeton, "court").catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("motDePasse");
    expect((await verifierJeton(db, jeton)).ok).toBe(true);
  });

  it("refuse un mot de passe de plus de 128 caractères", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const { jeton } = await creerInvitation(db, id);
    const erreur = await activerCompte(db, jeton, "a".repeat(129)).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.message).toBe("128 caractères au maximum.");
    expect(erreur.champ).toBe("motDePasse");
  });

  it("refuse un jeton inconnu ou expiré", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    await expect(activerCompte(db, "inconnu", "motdepasse-solide")).rejects.toThrow(ErreurMetier);
    const t0 = new Date();
    const { jeton } = await creerInvitation(db, id, t0);
    await expect(activerCompte(db, jeton, "motdepasse-solide", new Date(t0.getTime() + 31 * JOUR))).rejects.toThrow(
      "Ce lien a expiré",
    );
  });

  it("met à jour le mot de passe d'un compte qui en a déjà un", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompteAvecMotDePasse(db, {
      nom: "Admin", email: "e2e-admin@ademig.test", role: "superadmin", motDePasse: "ancien-mot-de-passe",
    });
    await db.insert(session).values({ id: "s1", userId: id, token: "t1", expiresAt: new Date(Date.now() + 1e6) });
    const { jeton } = await creerInvitation(db, id);
    await activerCompte(db, jeton, "nouveau-mot-de-passe");
    expect(await db.select().from(session).where(eq(session.userId, id))).toHaveLength(0);
    const comptes = await db.select().from(account).where(eq(account.userId, id));
    expect(comptes).toHaveLength(1);
    expect(await verifyPassword({ hash: comptes[0].password!, password: "nouveau-mot-de-passe" })).toBe(true);
  });
});

describe("inviterParEmail", () => {
  it("met en file un email contenant l'URL d'activation", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    await inviterParEmail(db, id, (j) => `https://exemple.test/activer?jeton=${j}`);
    const [email] = await db.select().from(emailsFile);
    expect(email).toMatchObject({ type: "invitation", destinataire: "e2e-1@ademig.test", userId: id, statut: "a_envoyer" });
    expect(email.html).toContain("https://exemple.test/activer?jeton=");
    expect((await verifierJeton(db, jetonDe(email.html))).ok).toBe(true);
  });

  it("« Renvoyer » deux fois avant le cron ne laisse qu'un email en file, au lien valable", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const url = (j: string) => `https://exemple.test/activer?jeton=${j}`;
    await inviterParEmail(db, id, url);
    await inviterParEmail(db, id, url);
    const file = await db.select().from(emailsFile).where(eq(emailsFile.statut, "a_envoyer"));
    expect(file).toHaveLength(1);
    expect((await verifierJeton(db, jetonDe(file[0].html))).ok).toBe(true);
    expect(await db.select().from(invitations).where(eq(invitations.userId, id))).toHaveLength(1);
  });
});

describe("inviterParEmail prioritaire", () => {
  it("antidate l'email pour qu'il parte en tête de file", async () => {
    const db = await creerDbTest();
    const [a, b] = [await membreAvecCompte(db, 1), await membreAvecCompte(db, 2)];
    const url = (j: string) => `https://exemple.test/activer?jeton=${j}`;
    await inviterParEmail(db, a, url);
    await inviterParEmail(db, b, url, { prioritaire: true });
    const [premier] = await db.select().from(emailsFile).orderBy(asc(emailsFile.creeLe));
    expect(premier.userId).toBe(b);
    expect(Date.now() - premier.creeLe.getTime()).toBeGreaterThan(300 * JOUR);
  });

  it("le statut reste « en file » malgré un ancien email déjà envoyé", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    await db.insert(emailsFile).values({ sujet: "s", html: "h", type: "invitation", destinataire: "e2e-1@ademig.test", userId: id, statut: "envoye", envoyeLe: new Date() });
    await inviterParEmail(db, id, (j) => `https://exemple.test/activer?jeton=${j}`, { prioritaire: true });
    expect((await suiviInvitations(db, [id])).get(id)?.statut).toBe("en_file");
  });
});

describe("verifierInvitable", () => {
  it("accepte un compte pas encore activé", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    await expect(verifierInvitable(db, id)).resolves.toBeUndefined();
  });

  it("refuse un compte activé, un compte désactivé avec mot de passe et un compte inconnu", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const { jeton } = await creerInvitation(db, id);
    await activerCompte(db, jeton, "motdepasse-solide");
    await expect(verifierInvitable(db, id)).rejects.toThrow(/déjà activé/);
    await db.update(user).set({ actif: false }).where(eq(user.id, id));
    await expect(verifierInvitable(db, id)).rejects.toThrow(/désactivé/);
    await expect(verifierInvitable(db, "inconnu")).rejects.toBeInstanceOf(ErreurMetier);
  });
});

describe("désactivation d'un compte pas encore activé", () => {
  const url = (j: string) => `https://exemple.test/activer?jeton=${j}`;

  it("tue le lien et l'email en file, bloque l'activation, le renvoi et le rattrapage, puis la réactivation rouvre", async () => {
    const db = await creerDbTest();
    const admin = await creerCompteAvecMotDePasse(db, { nom: "Admin", email: "e2e-admin@ademig.test", role: "superadmin", motDePasse: "motdepasse-solide" });
    const id = await membreAvecCompte(db, 1);
    await inviterParEmail(db, id, url);
    const [email] = await db.select().from(emailsFile);

    await desactiverCompteMembre(db, { acteurId: admin.id, cibleId: id });
    expect(await db.select().from(emailsFile)).toHaveLength(0);
    await expect(activerCompte(db, jetonDe(email.html), "motdepasse-solide")).rejects.toBeInstanceOf(ErreurMetier);
    // Même un jeton créé avant la désactivation (course) ne sert pas.
    await db.update(user).set({ desactiveLe: null }).where(eq(user.id, id));
    const { jeton } = await creerInvitation(db, id);
    await db.update(user).set({ desactiveLe: new Date() }).where(eq(user.id, id));
    await expect(activerCompte(db, jeton, "motdepasse-solide")).rejects.toThrow(/désactivé/);
    expect((await etatCompte(db, id))?.desactive).toBe(true);
    await expect(verifierInvitable(db, id)).rejects.toThrow(/désactivé/);
    await expect(inviterParEmail(db, id, url)).rejects.toThrow(/désactivé/);
    await expect(genererLienInvitation(db, id)).rejects.toThrow(/désactivé/);
    expect(await inviterLesNonInvites(db, url)).toBe(0);
    expect(await db.select().from(emailsFile)).toHaveLength(0);

    expect((await suiviInvitations(db, [id])).get(id)?.statut).toBe("desactive");

    await reactiverCompteMembre(db, id);
    expect((await etatCompte(db, id))).toMatchObject({ desactive: false, actif: false, aMotDePasse: false });
    expect((await db.select({ actif: user.actif }).from(user).where(eq(user.id, id)))[0].actif).toBe(false);
    expect((await suiviInvitations(db, [id])).get(id)?.statut).toBe("a_inviter");
    await expect(verifierInvitable(db, id)).resolves.toBeUndefined();
    await inviterParEmail(db, id, url, { prioritaire: true });
    expect(await db.select().from(emailsFile)).toHaveLength(1);
    expect(await inviterLesNonInvites(db, url)).toBe(0);
  });
});

describe("genererLienInvitation", () => {
  it("invalide l'ancien lien et retire l'email en file, sans en mettre un autre", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    await inviterParEmail(db, id, (j) => `https://exemple.test/activer?jeton=${j}`);
    const [ancien] = await db.select().from(emailsFile);
    const { jeton } = await genererLienInvitation(db, id);
    expect(await db.select().from(emailsFile)).toHaveLength(0);
    expect((await verifierJeton(db, jetonDe(ancien.html))).ok).toBe(false);
    expect((await verifierJeton(db, jeton)).ok).toBe(true);
    expect((await suiviInvitations(db, [id])).get(id)?.statut).toBe("invite");
  });

  it("refuse un compte inconnu", async () => {
    const db = await creerDbTest();
    await expect(genererLienInvitation(db, "inconnu")).rejects.toBeInstanceOf(ErreurMetier);
  });
});

describe("inviterLesNonInvites", () => {
  it("met en file les seuls comptes de fiche pas encore invités, une fois chacun", async () => {
    const db = await creerDbTest();
    const [a, b, c] = [await membreAvecCompte(db, 1), await membreAvecCompte(db, 2), await membreAvecCompte(db, 3)];
    await creerCompte(db, { nom: "Sans fiche", email: "e2e-sans@ademig.test", role: "membre" });
    await inviterParEmail(db, b, (j) => `https://exemple.test/activer?jeton=${j}`);
    const { jeton } = await creerInvitation(db, c);
    await activerCompte(db, jeton, "motdepasse-solide");
    expect(await inviterLesNonInvites(db, (j) => `https://exemple.test/activer?jeton=${j}`)).toBe(1);
    const file = await db.select().from(emailsFile).where(eq(emailsFile.userId, a));
    expect(file).toHaveLength(1);
    expect(await inviterLesNonInvites(db, (j) => `https://exemple.test/activer?jeton=${j}`)).toBe(0);
  });
});

describe("suiviInvitations", () => {
  it("déduit le statut de chaque membre", async () => {
    const db = await creerDbTest();
    const [a, b, c, d, e] = [
      await membreAvecCompte(db, 1), await membreAvecCompte(db, 2), await membreAvecCompte(db, 3),
      await membreAvecCompte(db, 4), await membreAvecCompte(db, 5),
    ];
    const base = { sujet: "s", html: "h", type: "invitation" as const };
    await db.insert(emailsFile).values({ ...base, destinataire: "b@ademig.test", userId: b });
    await db.insert(emailsFile).values({ ...base, destinataire: "c@ademig.test", userId: c, statut: "envoye", envoyeLe: new Date("2026-10-01") });
    await db.insert(emailsFile).values({ ...base, destinataire: "d@ademig.test", userId: d, statut: "echec", erreur: "SMTP 550" });
    const { jeton } = await creerInvitation(db, e);
    await activerCompte(db, jeton, "motdepasse-solide");

    const suivi = await suiviInvitations(db, [a, b, c, d, e]);
    expect(suivi.get(a)).toMatchObject({ statut: "a_inviter", le: null, erreur: null });
    expect(suivi.get(b)?.statut).toBe("en_file");
    expect(suivi.get(c)).toMatchObject({ statut: "invite", le: new Date("2026-10-01") });
    expect(suivi.get(d)).toMatchObject({ statut: "echec", erreur: "SMTP 550" });
    expect(suivi.get(e)?.statut).toBe("active");
  });

  it("liste vide", async () => {
    expect((await suiviInvitations(await creerDbTest(), [])).size).toBe(0);
  });
});
