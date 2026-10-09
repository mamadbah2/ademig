import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { account, session, user } from "@/db/schema";
import { creerDbTest } from "@/test/db";
import {
  changerActivation,
  changerRole,
  creerCompte,
  creerCompteAvecMotDePasse,
  listerComptes,
} from "./comptes";
import { ErreurMetier } from "./erreurs";

const awa = { nom: "Awa Ndiaye", email: "awa@exemple.sn", role: "superadmin" as const };
const moussa = { nom: "Moussa Fall", email: "moussa@exemple.sn", role: "editeur" as const };

describe("création de compte", () => {
  it("normalise l'email et ne crée pas de mot de passe", async () => {
    const db = await creerDbTest();
    await creerCompte(db, { ...moussa, email: "  Moussa@Exemple.SN " });
    const [compte] = await listerComptes(db);
    expect(compte).toMatchObject({ nom: "Moussa Fall", email: "moussa@exemple.sn", role: "editeur", actif: true, aMotDePasse: false });
  });

  it("refuse un email déjà utilisé, quelle que soit la casse", async () => {
    const db = await creerDbTest();
    await creerCompte(db, moussa);
    const erreur = await creerCompte(db, { ...moussa, email: "MOUSSA@exemple.sn" }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("email");
  });

  it("enregistre un mot de passe vérifiable par Better Auth", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompteAvecMotDePasse(db, { ...awa, motDePasse: "un-mot-de-passe-solide" });
    const credential = await db.query.account.findFirst({ where: eq(account.userId, id) });
    expect(credential).toMatchObject({ providerId: "credential", accountId: id });
    expect(await verifyPassword({ hash: credential!.password!, password: "un-mot-de-passe-solide" })).toBe(true);
    expect((await listerComptes(db))[0].aMotDePasse).toBe(true);
  });
});

describe("changement de rôle", () => {
  it("refuse de modifier son propre rôle", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, awa);
    await expect(changerRole(db, { acteurId: id, cibleId: id, role: "editeur" })).rejects.toThrow(
      "Vous ne pouvez pas modifier votre propre rôle.",
    );
  });

  it("garde au moins un super-admin actif", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, awa);
    await expect(changerRole(db, { acteurId: "systeme", cibleId: id, role: "editeur" })).rejects.toThrow(
      "Il doit rester au moins un super-admin actif.",
    );
  });

  it("change le rôle quand un autre super-admin reste", async () => {
    const db = await creerDbTest();
    const a = await creerCompte(db, awa);
    const m = await creerCompte(db, { ...moussa, role: "superadmin" });
    await changerRole(db, { acteurId: a.id, cibleId: m.id, role: "editeur" });
    expect((await db.query.user.findFirst({ where: eq(user.id, m.id) }))?.role).toBe("editeur");
  });
});

describe("activation", () => {
  it("refuse de se désactiver soi-même", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, awa);
    await expect(changerActivation(db, { acteurId: id, cibleId: id, actif: false })).rejects.toThrow(
      "Vous ne pouvez pas désactiver votre propre compte.",
    );
  });

  it("désactive un compte et ferme ses sessions ouvertes", async () => {
    const db = await creerDbTest();
    const a = await creerCompte(db, awa);
    const m = await creerCompte(db, moussa);
    await db.insert(session).values({
      id: "s1",
      token: "jeton",
      userId: m.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await changerActivation(db, { acteurId: a.id, cibleId: m.id, actif: false });
    expect((await db.query.user.findFirst({ where: eq(user.id, m.id) }))?.actif).toBe(false);
    expect(await db.$count(session, eq(session.userId, m.id))).toBe(0);
  });

  it("garde au moins un super-admin actif", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, awa);
    await expect(changerActivation(db, { acteurId: "systeme", cibleId: id, actif: false })).rejects.toThrow(
      "Il doit rester au moins un super-admin actif.",
    );
  });

  it("réactive un compte", async () => {
    const db = await creerDbTest();
    const a = await creerCompte(db, awa);
    const m = await creerCompte(db, moussa);
    await changerActivation(db, { acteurId: a.id, cibleId: m.id, actif: false });
    await changerActivation(db, { acteurId: a.id, cibleId: m.id, actif: true });
    expect((await db.query.user.findFirst({ where: eq(user.id, m.id) }))?.actif).toBe(true);
  });
});
