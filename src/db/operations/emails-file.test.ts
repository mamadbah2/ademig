import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { emailsFile, invitations, membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { creerCompte } from "./comptes";
import { mettreEnFile, viderFile } from "./emails-file";
import { activerCompte, creerInvitation, inviterParEmail, verifierJeton } from "./invitations";

// Domaine neutre : les adresses en @ademig.test ne partent jamais (voir le test dédié).
const email = (n: number) => ({ destinataire: `e2e-${n}@exemple.test`, sujet: `Sujet ${n}`, html: `<p>${n}</p>`, type: "systeme" as const });
const urlActivation = (j: string) => `https://exemple.test/activer?jeton=${j}`;
const options = (envoyer: (e: { a: string; sujet: string; html: string }) => Promise<void>, extra = {}) => ({
  max: 10,
  envoyer,
  pauseMs: 0,
  urlActivation,
  ...extra,
});

async function remplir(db: Db, n: number) {
  for (let i = 1; i <= n; i++) {
    await mettreEnFile(db, email(i));
    await new Promise((r) => setTimeout(r, 5)); // ordre de création stable
  }
}

async function membreAvecCompte(db: Db, n: number, domaine = "exemple.test") {
  const { id } = await creerCompte(db, { nom: `Membre ${n}`, email: `e2e-${n}@${domaine}`, role: "membre" });
  await db.update(user).set({ actif: false }).where(eq(user.id, id));
  await db.insert(membres).values({ slug: `membre-${n}`, nom: `Membre ${n}`, titre: "T", specialite: "S", resume: "R", userId: id });
  return id;
}

const erreurAvecCode = (code: string, message = code) => Object.assign(new Error(message), { code });

describe("viderFile", () => {
  it("envoie au plus max emails, les plus anciens d'abord", async () => {
    const db = await creerDbTest();
    await remplir(db, 4);
    const envoyer = vi.fn().mockResolvedValue(undefined);
    const bilan = await viderFile(db, options(envoyer, { max: 3 }));
    expect(bilan).toEqual({ envoyes: 3, echecs: 0, restants: 1 });
    expect(envoyer.mock.calls.map(([e]) => e.a)).toEqual(["e2e-1@exemple.test", "e2e-2@exemple.test", "e2e-3@exemple.test"]);
    const lignes = await db.select().from(emailsFile);
    const envoyes = lignes.filter((l) => l.statut === "envoye");
    expect(envoyes.map((l) => l.destinataire).sort()).toEqual(["e2e-1@exemple.test", "e2e-2@exemple.test", "e2e-3@exemple.test"]);
    expect(envoyes.every((l) => l.envoyeLe instanceof Date)).toBe(true);
  });

  it("compte la tentative d'une erreur propre au destinataire, garde l'email en file puis le passe en échec à la 3e", async () => {
    const db = await creerDbTest();
    await mettreEnFile(db, email(1));
    const envoyer = vi.fn().mockRejectedValue(Object.assign(new Error("SMTP 550"), { code: "EENVELOPE", responseCode: 550 }));
    const bilan = await viderFile(db, options(envoyer));
    expect(bilan.echecs).toBe(1);
    let [ligne] = await db.select().from(emailsFile);
    expect(ligne).toMatchObject({ tentatives: 1, statut: "a_envoyer", erreur: "SMTP 550" });

    await viderFile(db, options(envoyer));
    await viderFile(db, options(envoyer));
    [ligne] = await db.select().from(emailsFile);
    expect(ligne).toMatchObject({ tentatives: 3, statut: "echec" });

    const bilanFinal = await viderFile(db, options(envoyer));
    expect(bilanFinal).toEqual({ envoyes: 0, echecs: 0, restants: 0 });
    expect(envoyer).toHaveBeenCalledTimes(3);
  });

  it.each(["EAUTH", "ECONNECTION", "ETIMEDOUT", "ESOCKET"])(
    "une panne du service (%s) arrête le passage sans compter de tentative",
    async (code) => {
      const db = await creerDbTest();
      await remplir(db, 3);
      const envoyer = vi.fn().mockRejectedValue(erreurAvecCode(code, `Panne ${code}`));
      const bilan = await viderFile(db, options(envoyer));
      expect(bilan).toEqual({ envoyes: 0, echecs: 0, restants: 3, interrompu: `Panne ${code}` });
      expect(envoyer).toHaveBeenCalledTimes(1);
      const lignes = await db.select().from(emailsFile);
      expect(lignes.every((l) => l.tentatives === 0 && l.statut === "a_envoyer")).toBe(true);
    },
  );

  it("le quota quotidien de Gmail (550 5.4.5) arrête aussi le passage", async () => {
    const db = await creerDbTest();
    await remplir(db, 2);
    const quota = Object.assign(new Error("550-5.4.5 Daily user sending limit exceeded."), { code: "EMESSAGE", responseCode: 550 });
    const bilan = await viderFile(db, options(vi.fn().mockRejectedValue(quota)));
    expect(bilan.interrompu).toMatch(/5\.4\.5/);
    expect((await db.select().from(emailsFile)).every((l) => l.tentatives === 0)).toBe(true);
  });

  it("n'envoie jamais à une adresse de test (@ademig.test)", async () => {
    const db = await creerDbTest();
    await mettreEnFile(db, { ...email(1), destinataire: "e2e-1@ademig.test" });
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await viderFile(db, options(envoyer))).toEqual({ envoyes: 0, echecs: 0, restants: 0 });
    expect(envoyer).not.toHaveBeenCalled();
    const [ligne] = await db.select().from(emailsFile);
    expect(ligne).toMatchObject({ statut: "echec", tentatives: 0, erreur: "Adresse de test : jamais envoyée." });
  });

  it("ne renvoie jamais un email envoyé ou en échec", async () => {
    const db = await creerDbTest();
    await mettreEnFile(db, email(1));
    await mettreEnFile(db, email(2));
    const lignes = await db.select().from(emailsFile);
    await db.update(emailsFile).set({ statut: "envoye" }).where(eq(emailsFile.id, lignes[0].id));
    await db.update(emailsFile).set({ statut: "echec" }).where(eq(emailsFile.id, lignes[1].id));
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await viderFile(db, options(envoyer))).toEqual({ envoyes: 0, echecs: 0, restants: 0 });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("tronque le message d'erreur à 500 caractères", async () => {
    const db = await creerDbTest();
    await mettreEnFile(db, email(1));
    await viderFile(db, options(async () => { throw new Error("x".repeat(900)); }, { max: 1 }));
    const [ligne] = await db.select().from(emailsFile);
    expect(ligne.erreur).toHaveLength(500);
  });

  it("s'arrête quand le budget de temps est dépassé et laisse le reste en file", async () => {
    const db = await creerDbTest();
    await remplir(db, 4);
    const envoyer = vi.fn(() => new Promise<void>((r) => setTimeout(r, 30)));
    const bilan = await viderFile(db, options(envoyer, { budgetMs: 20 }));
    expect(bilan.envoyes).toBe(1);
    expect(bilan.restants).toBe(3);
  });
});

describe("viderFile : invitations construites à l'envoi", () => {
  it("la file ne garde aucun jeton ; le lien naît à l'envoi, avec l'adresse du site qui envoie", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const { jeton: ancien } = await creerInvitation(db, id, new Date(Date.now() - 40 * 24 * 3600 * 1000));
    await inviterParEmail(db, id);
    const [enFile] = await db.select().from(emailsFile);
    expect(enFile.html).toBe("");
    expect(enFile.html).not.toMatch(/jeton/);

    const envoyer = vi.fn().mockResolvedValue(undefined);
    const avant = Date.now();
    expect(await viderFile(db, options(envoyer))).toEqual({ envoyes: 1, echecs: 0, restants: 0 });
    const [{ a, sujet, html }] = envoyer.mock.calls[0];
    expect(a).toBe("e2e-1@exemple.test");
    expect(sujet).toBe("Votre espace membre ADEMIG");
    const jeton = /jeton=([\w-]+)/.exec(html)![1];
    expect(html).toContain("https://exemple.test/activer?jeton=");
    expect(await verifierJeton(db, jeton)).toMatchObject({ ok: true, userId: id });
    // Validité comptée depuis l'envoi : 30 jours pleins.
    const [inv] = await db.select().from(invitations).where(eq(invitations.userId, id));
    expect(inv.expireLe.getTime()).toBeGreaterThanOrEqual(avant + 30 * 24 * 3600 * 1000 - 1000);
    // L'ancien lien encore inutilisé meurt à l'envoi.
    expect((await verifierJeton(db, ancien)).ok).toBe(false);
    const [envoye] = await db.select().from(emailsFile);
    expect(envoye).toMatchObject({ statut: "envoye", html: "" });
  });

  it("un envoi raté n'invalide pas le lien précédent et ne crée pas de jeton", async () => {
    const db = await creerDbTest();
    const id = await membreAvecCompte(db, 1);
    const { jeton: ancien } = await creerInvitation(db, id);
    await inviterParEmail(db, id);
    await viderFile(db, options(vi.fn().mockRejectedValue(new Error("SMTP 550"))));
    expect((await verifierJeton(db, ancien)).ok).toBe(true);
    expect(await db.$count(invitations, eq(invitations.userId, id))).toBe(1);
  });

  it("un compte activé ou désactivé entre-temps n'est pas invité", async () => {
    const db = await creerDbTest();
    const a = await membreAvecCompte(db, 1);
    const b = await membreAvecCompte(db, 2);
    await inviterParEmail(db, a);
    await inviterParEmail(db, b);
    await db.update(user).set({ desactiveLe: new Date() }).where(eq(user.id, a));
    const { jeton } = await creerInvitation(db, b);
    await activerCompte(db, jeton, "motdepasse-solide");
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await viderFile(db, options(envoyer))).toMatchObject({ envoyes: 0, restants: 0 });
    expect(envoyer).not.toHaveBeenCalled();
    const lignes = await db.select().from(emailsFile);
    expect(lignes.every((l) => l.statut === "echec" && l.tentatives === 0)).toBe(true);
  });
});
