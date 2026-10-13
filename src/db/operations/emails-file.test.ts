import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { emailsFile } from "@/db/schema";
import { creerDbTest } from "@/test/db";
import { mettreEnFile, viderFile } from "./emails-file";

const email = (n: number) => ({ destinataire: `e2e-${n}@ademig.test`, sujet: `Sujet ${n}`, html: `<p>${n}</p>`, type: "invitation" as const });

async function remplir(db: Awaited<ReturnType<typeof creerDbTest>>, n: number) {
  for (let i = 1; i <= n; i++) {
    await mettreEnFile(db, email(i));
    await new Promise((r) => setTimeout(r, 5)); // ordre de création stable
  }
}

describe("viderFile", () => {
  it("envoie au plus max emails, les plus anciens d'abord", async () => {
    const db = await creerDbTest();
    await remplir(db, 4);
    const envoyer = vi.fn().mockResolvedValue(undefined);
    const bilan = await viderFile(db, { max: 3, envoyer, pauseMs: 0 });
    expect(bilan).toEqual({ envoyes: 3, echecs: 0, restants: 1 });
    expect(envoyer.mock.calls.map(([e]) => e.a)).toEqual(["e2e-1@ademig.test", "e2e-2@ademig.test", "e2e-3@ademig.test"]);
    const lignes = await db.select().from(emailsFile);
    const envoyes = lignes.filter((l) => l.statut === "envoye");
    expect(envoyes.map((l) => l.destinataire).sort()).toEqual(["e2e-1@ademig.test", "e2e-2@ademig.test", "e2e-3@ademig.test"]);
    expect(envoyes.every((l) => l.envoyeLe instanceof Date)).toBe(true);
  });

  it("compte la tentative, garde l'email en file puis le passe en échec à la 3e erreur", async () => {
    const db = await creerDbTest();
    await mettreEnFile(db, email(1));
    const envoyer = vi.fn().mockRejectedValue(new Error("SMTP 550"));
    const bilan = await viderFile(db, { max: 10, envoyer, pauseMs: 0 });
    expect(bilan.echecs).toBe(1);
    let [ligne] = await db.select().from(emailsFile);
    expect(ligne).toMatchObject({ tentatives: 1, statut: "a_envoyer", erreur: "SMTP 550" });

    await viderFile(db, { max: 10, envoyer, pauseMs: 0 });
    await viderFile(db, { max: 10, envoyer, pauseMs: 0 });
    [ligne] = await db.select().from(emailsFile);
    expect(ligne).toMatchObject({ tentatives: 3, statut: "echec" });

    const bilanFinal = await viderFile(db, { max: 10, envoyer, pauseMs: 0 });
    expect(bilanFinal).toEqual({ envoyes: 0, echecs: 0, restants: 0 });
    expect(envoyer).toHaveBeenCalledTimes(3);
  });

  it("ne renvoie jamais un email envoyé ou en échec", async () => {
    const db = await creerDbTest();
    await mettreEnFile(db, email(1));
    await mettreEnFile(db, email(2));
    const lignes = await db.select().from(emailsFile);
    await db.update(emailsFile).set({ statut: "envoye" }).where(eq(emailsFile.id, lignes[0].id));
    await db.update(emailsFile).set({ statut: "echec" }).where(eq(emailsFile.id, lignes[1].id));
    const envoyer = vi.fn().mockResolvedValue(undefined);
    expect(await viderFile(db, { max: 10, envoyer, pauseMs: 0 })).toEqual({ envoyes: 0, echecs: 0, restants: 0 });
    expect(envoyer).not.toHaveBeenCalled();
  });

  it("tronque le message d'erreur à 500 caractères", async () => {
    const db = await creerDbTest();
    await mettreEnFile(db, email(1));
    await viderFile(db, { max: 1, envoyer: async () => { throw new Error("x".repeat(900)); }, pauseMs: 0 });
    const [ligne] = await db.select().from(emailsFile);
    expect(ligne.erreur).toHaveLength(500);
  });

  it("s'arrête quand le budget de temps est dépassé et laisse le reste en file", async () => {
    const db = await creerDbTest();
    await remplir(db, 4);
    const envoyer = vi.fn(() => new Promise<void>((r) => setTimeout(r, 30)));
    const bilan = await viderFile(db, { max: 10, envoyer, pauseMs: 0, budgetMs: 20 });
    expect(bilan.envoyes).toBe(1);
    expect(bilan.restants).toBe(3);
  });
});
