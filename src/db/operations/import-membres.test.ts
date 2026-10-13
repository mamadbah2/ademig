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
    expect(await db.$count(t.membres)).toBe(2);
  });
});
