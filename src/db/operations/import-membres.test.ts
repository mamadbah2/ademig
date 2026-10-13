import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { creerDbTest } from "@/test/db";
import * as t from "@/db/schema";
import { classerImport, executerImport } from "./import-membres";
import type { Db } from "@/db/types";

const ligne = (n: number, prenom: string, nom: string, email: string) => ({ ligne: n, prenom, nom, email, telephone: null, promotion: 2010, specialite: "Géologie" });

describe("import des membres", () => {
  let db: Db;
  beforeEach(async () => { db = await creerDbTest(); });

  it("crée fiche + compte membre inactif pour un nouvel email", async () => {
    const r = await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(r).toMatchObject({ crees: 1, rattaches: 0, ignores: 0 });
    const u = await db.query.user.findFirst({ where: eq(t.user.email, "awa@ex.org") });
    expect(u).toMatchObject({ role: "membre", actif: false });
    const f = await db.query.membres.findFirst({ where: eq(t.membres.userId, u!.id) });
    expect(f).toMatchObject({ nom: "Awa Ndiaye", visible: false, annuaire: true, emailContact: "awa@ex.org", promotion: 2010 });
    expect(r.aInviter).toEqual([u!.id]);
  });

  it("rattache une fiche existante du même nom (bureau) sans la dupliquer", async () => {
    await db.insert(t.membres).values({ slug: "awa-ndiaye", nom: "Awa NDIAYE", titre: "Dr", specialite: "Mines", resume: "r", visible: true });
    const [classee] = await classerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(classee.statut).toBe("rattacher_fiche");
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    const fiches = await db.select().from(t.membres);
    expect(fiches).toHaveLength(1);
    expect(fiches[0]).toMatchObject({ visible: true, titre: "Dr" }); // la fiche publique garde ses réglages
    expect(fiches[0].userId).not.toBeNull();
  });

  it("lie un compte admin existant (avec mot de passe) sans changer son rôle ni l'inviter", async () => {
    await db.insert(t.user).values({ id: "u1", name: "Admin", email: "admin@ex.org", role: "editeur", emailVerified: true });
    await db.insert(t.account).values({ id: "a1", accountId: "u1", providerId: "credential", userId: "u1", password: "x" });
    const r = await executerImport(db, [ligne(2, "Ali", "Sow", "ADMIN@ex.org")]);
    expect((await db.query.user.findFirst({ where: eq(t.user.id, "u1") }))!.role).toBe("editeur");
    expect(await db.query.membres.findFirst({ where: eq(t.membres.userId, "u1") })).toBeDefined();
    expect(r.aInviter).toEqual([]);
  });

  it("invite un compte existant qui n'a pas encore de mot de passe", async () => {
    await db.insert(t.user).values({ id: "u2", name: "Invité", email: "inv@ex.org", role: "editeur", emailVerified: true });
    const r = await executerImport(db, [ligne(2, "Ali", "Sow", "inv@ex.org")]);
    expect(r.aInviter).toEqual(["u2"]);
  });

  it("ignore un email déjà membre, et un second import ne crée rien", async () => {
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    const r = await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(r).toMatchObject({ crees: 0, ignores: 1 });
    expect(await db.$count(t.membres)).toBe(1);
  });

  it("donne un slug unique à deux homonymes", async () => {
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "a1@ex.org"), ligne(3, "Awa", "Ndiaye", "a2@ex.org")]);
    const slugs = (await db.select({ s: t.membres.slug }).from(t.membres)).map((r) => r.s).sort();
    expect(slugs).toEqual(["awa-ndiaye", "awa-ndiaye-2"]);
  });

  it("une fiche sans compte du même nom n'est rattachée que par la première ligne", async () => {
    await db.insert(t.membres).values({ slug: "awa-ndiaye", nom: "Awa Ndiaye", titre: "Dr", specialite: "Mines", resume: "r" });
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "a1@ex.org"), ligne(3, "Awa", "Ndiaye", "a2@ex.org")]);
    const u1 = await db.query.user.findFirst({ where: eq(t.user.email, "a1@ex.org") });
    const u2 = await db.query.user.findFirst({ where: eq(t.user.email, "a2@ex.org") });
    const existante = await db.query.membres.findFirst({ where: eq(t.membres.slug, "awa-ndiaye") });
    expect(existante!.userId).toBe(u1!.id);
    expect(existante!.titre).toBe("Dr");
    const seconde = await db.query.membres.findFirst({ where: eq(t.membres.userId, u2!.id) });
    expect(seconde).toMatchObject({ emailContact: "a2@ex.org", slug: "awa-ndiaye-2" });
    expect(await db.$count(t.membres)).toBe(2);
  });

  it("rattache une fiche orpheline par son email de contact seul, même avec un autre nom", async () => {
    await db.insert(t.membres).values({ slug: "x", nom: "Nom Différent", titre: "Dr", specialite: "Mines", resume: "r", emailContact: "Awa@Ex.org" });
    const [c] = await classerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(c.statut).toBe("rattacher_fiche");
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(await db.$count(t.membres)).toBe(1);
    expect((await db.query.membres.findFirst())!.userId).not.toBeNull();
  });

  it("préfère la fiche trouvée par email à celle trouvée par nom", async () => {
    await db.insert(t.membres).values([
      { slug: "par-nom", nom: "Awa Ndiaye", titre: "A", specialite: "s", resume: "r" },
      { slug: "par-mail", nom: "Autre", titre: "B", specialite: "s", resume: "r", emailContact: "awa@ex.org" },
    ]);
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect((await db.query.membres.findFirst({ where: eq(t.membres.slug, "par-mail") }))!.userId).not.toBeNull();
    expect((await db.query.membres.findFirst({ where: eq(t.membres.slug, "par-nom") }))!.userId).toBeNull();
  });

  it("compare les noms sans accents ni casse", async () => {
    await db.insert(t.membres).values({ slug: "aissatou-diallo", nom: "AISSATOU DIALLO", titre: "Dr", specialite: "Mines", resume: "r" });
    const [c] = await classerImport(db, [ligne(2, "Aïssatou", "Diallo", "ai@ex.org")]);
    expect(c.statut).toBe("rattacher_fiche");
    await executerImport(db, [ligne(2, "Aïssatou", "Diallo", "ai@ex.org")]);
    expect(await db.$count(t.membres)).toBe(1);
  });

  it("lier_compte rattache la fiche orpheline de même nom à un compte admin", async () => {
    await db.insert(t.user).values({ id: "u1", name: "Admin", email: "admin@ex.org", role: "admin", emailVerified: true });
    await db.insert(t.membres).values({ slug: "ali-sow", nom: "Ali Sow", titre: "Dr", specialite: "Mines", resume: "r" });
    const [c] = await classerImport(db, [ligne(2, "Ali", "Sow", "admin@ex.org")]);
    expect(c).toMatchObject({ statut: "lier_compte", userId: "u1" });
    expect(c.ficheId).not.toBeNull();
    await executerImport(db, [ligne(2, "Ali", "Sow", "admin@ex.org")]);
    expect(await db.$count(t.membres)).toBe(1);
    expect((await db.query.membres.findFirst())!.userId).toBe("u1");
    expect((await db.query.user.findFirst({ where: eq(t.user.id, "u1") }))!.role).toBe("admin");
  });

  it("un email en double dans le fichier ne crée qu'un compte", async () => {
    const r = await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org"), ligne(3, "Awa", "Ndiaye", "AWA@ex.org")]);
    expect(r).toMatchObject({ crees: 1, ignores: 1 });
    expect(await db.$count(t.user)).toBe(1);
    expect(await db.$count(t.membres)).toBe(1);
    const classees = await classerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(classees[0].statut).toBe("deja_membre");
  });

  it("classerImport ne modifie pas la base", async () => {
    await db.insert(t.user).values({ id: "u1", name: "Admin", email: "admin@ex.org", role: "editeur", emailVerified: true });
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    const avant = [await db.$count(t.user), await db.$count(t.membres)];
    const classees = await classerImport(db, [
      ligne(2, "Awa", "Ndiaye", "awa@ex.org"),
      ligne(3, "Ali", "Sow", "admin@ex.org"),
      ligne(4, "Neuf", "Venu", "neuf@ex.org"),
    ]);
    expect(classees.map((c) => c.statut)).toEqual(["deja_membre", "lier_compte", "nouveau"]);
    expect([await db.$count(t.user), await db.$count(t.membres)]).toEqual(avant);
  });
});
