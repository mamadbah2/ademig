import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErreurMetier } from "@/db/operations/erreurs";
import { actualitePhotos, actualites } from "@/db/schema";
import { creerDbTest } from "@/test/db";
import { AccesRefuse } from "@/lib/roles";
import { champJson } from "@/lib/validation/commun";
import { erreursDe, lireFormulaire, resultatDErreur } from "./resultat";

describe("erreursDe", () => {
  it("rattache les erreurs Zod aux champs", () => {
    const r = z.object({ nom: z.string().min(2, "Indiquez le nom.") }).safeParse({ nom: "" });
    expect(r.success).toBe(false);
    expect(erreursDe(r.error!)).toEqual({
      ok: false,
      message: "Corrigez les champs signalés.",
      erreurs: { nom: ["Indiquez le nom."] },
    });
  });
});

describe("resultatDErreur", () => {
  it("traduit un accès refusé", () => {
    expect(resultatDErreur(new AccesRefuse())).toEqual({ ok: false, message: "Accès refusé." });
  });

  it("traduit une erreur métier, avec son champ", () => {
    expect(resultatDErreur(new ErreurMetier("Email déjà utilisé.", "email"))).toEqual({
      ok: false,
      message: "Email déjà utilisé.",
      erreurs: { email: ["Email déjà utilisé."] },
    });
  });

  it("traduit une violation d'unicité sur un slug, même enveloppée par Drizzle", () => {
    const pg = Object.assign(new Error("duplicate key"), { code: "23505", constraint: "actualites_slug_unique" });
    const drizzle = new Error("Failed query", { cause: pg });
    const attendu = { ok: false, message: "Ce lien est déjà utilisé.", erreurs: { slug: ["Ce lien est déjà utilisé."] } };
    expect(resultatDErreur(pg)).toEqual(attendu);
    expect(resultatDErreur(drizzle)).toEqual(attendu);
  });

  it("traduit une autre violation d'unicité en message général", () => {
    const pg = Object.assign(new Error("duplicate key"), { code: "23505", constraint: "media_url_unique" });
    expect(resultatDErreur(new Error("Failed query", { cause: pg }))).toEqual({
      ok: false,
      message: "Cette valeur est déjà utilisée : modifiez-la puis réessayez.",
    });
  });

  it("traduit une clé étrangère manquante", () => {
    const pg = Object.assign(new Error("foreign key"), { code: "23503" });
    const attendu = { ok: false, message: "Une image choisie n'existe plus : retirez-la puis réessayez." };
    expect(resultatDErreur(pg)).toEqual(attendu);
    expect(resultatDErreur(new Error("Failed query", { cause: pg }))).toEqual(attendu);
  });

  it("reconnaît les erreurs réelles du driver, enveloppées par Drizzle", async () => {
    const db = await creerDbTest();
    const actu = { slug: "doublon", titre: "T", date: "2026-10-10", resume: "R", corps: "<p>C</p>" };
    const [{ id }] = await db.insert(actualites).values(actu).returning({ id: actualites.id });
    const doublon = await db.insert(actualites).values(actu).catch((e: unknown) => e);
    expect(resultatDErreur(doublon)).toMatchObject({ erreurs: { slug: ["Ce lien est déjà utilisé."] } });
    const orpheline = await db
      .insert(actualitePhotos)
      .values({ actualiteId: id, mediaId: "00000000-0000-4000-8000-000000000000", ordre: 0 })
      .catch((e: unknown) => e);
    expect(resultatDErreur(orpheline)).toMatchObject({ message: "Une image choisie n'existe plus : retirez-la puis réessayez." });
  });

  it("laisse passer les autres erreurs", () => {
    expect(resultatDErreur(Object.assign(new Error("connexion"), { code: "ECONNRESET" }))).toBeNull();
    expect(resultatDErreur(new Error("panne"))).toBeNull();
  });
});

describe("erreursDe dans une liste", () => {
  const schema = z.object({
    postes: champJson(z.array(z.object({ fonction: z.string().trim().min(1, "Indiquez la fonction.") })).max(2, "2 postes au plus.")),
  });

  it("précise l'élément fautif, numéroté à partir de 1", () => {
    const r = schema.safeParse({ postes: '[{"fonction":"Président"},{"fonction":" "}]' });
    expect(erreursDe(r.error!)).toMatchObject({ erreurs: { postes: ["Élément 2 : Indiquez la fonction."] } });
  });

  it("laisse sans numéro une erreur qui porte sur toute la liste", () => {
    const r = schema.safeParse({ postes: '[{"fonction":"a"},{"fonction":"b"},{"fonction":"c"}]' });
    expect(erreursDe(r.error!)).toMatchObject({ erreurs: { postes: ["2 postes au plus."] } });
  });
});

describe("contraintes d'unicité du bureau et des partenaires", () => {
  const violation = (constraint: string) =>
    new Error("Failed query", { cause: Object.assign(new Error("duplicate key"), { code: "23505", constraint }) });

  it("rattache un nom de partenaire en double au champ nom", () => {
    expect(resultatDErreur(violation("partenaires_nom_unique"))).toEqual({
      ok: false,
      message: "Ce nom est déjà utilisé.",
      erreurs: { nom: ["Ce nom est déjà utilisé."] },
    });
  });

  it("rattache un membre à deux postes au champ postes", () => {
    expect(resultatDErreur(violation("postes_bureau_mandat_membre"))).toEqual({
      ok: false,
      message: "Un membre n'occupe qu'un poste par mandat.",
      erreurs: { postes: ["Un membre n'occupe qu'un poste par mandat."] },
    });
  });

  it("signale deux activations simultanées", () => {
    expect(resultatDErreur(violation("mandats_un_seul_actif"))).toEqual({
      ok: false,
      message: "Un autre mandat vient d'être activé : rechargez la page.",
    });
  });
});

describe("lireFormulaire", () => {
  const schema = z.object({ nom: z.string().trim().min(1, "Indiquez le nom.") });

  it("renvoie les données validées", () => {
    const f = new FormData();
    f.set("nom", " Diao ");
    expect(lireFormulaire(schema, f)).toEqual({ ok: true, data: { nom: "Diao" } });
  });

  it("renvoie le résultat d'erreurs à transmettre tel quel", () => {
    const f = new FormData();
    f.set("nom", "");
    expect(lireFormulaire(schema, f)).toEqual({
      ok: false,
      resultat: { ok: false, message: "Corrigez les champs signalés.", erreurs: { nom: ["Indiquez le nom."] } },
    });
  });
});
