import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as t from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import type { LigneImport } from "@/lib/membres/import-csv";
import { slugifier } from "@/lib/admin/slug";

export type StatutLigne = "nouveau" | "rattacher_fiche" | "lier_compte" | "deja_membre";
export type LigneClassee = LigneImport & { statut: StatutLigne; ficheId: string | null; userId: string | null };

// Nom comparé sans accents ni casse, espaces réduits.
const cle = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

type FicheEtat = { id: string; slug: string; cle: string; emailContact: string | null; userId: string | null };

type Plan = {
  classees: LigneClassee[];
  usersACreer: (typeof t.user.$inferInsert)[];
  fichesACreer: (typeof t.membres.$inferInsert)[];
  rattachements: { ficheId: string; userId: string; email: string }[];
  traites: string[]; // userId des lignes non ignorées
};

// Classe les lignes une à une, sans rien écrire. L'état est tenu en mémoire pour que deux
// lignes du même fichier (homonymes, doublons) se voient entre elles ; l'exécution applique
// ensuite le plan en quelques requêtes groupées. Aperçu et exécution partagent ce calcul.
async function planifier(db: Db | Tx, lignes: LigneImport[]): Promise<Plan> {
  const users = new Map<string, string>(); // email en minuscules -> id
  for (const u of await db.select({ id: t.user.id, email: t.user.email }).from(t.user)) users.set(u.email.toLowerCase(), u.id);
  const fiches: FicheEtat[] = (
    await db
      .select({ id: t.membres.id, slug: t.membres.slug, nom: t.membres.nom, emailContact: t.membres.emailContact, userId: t.membres.userId })
      .from(t.membres)
  ).map((f) => ({ id: f.id, slug: f.slug, cle: cle(f.nom), emailContact: f.emailContact?.toLowerCase() ?? null, userId: f.userId }));
  const slugsPris = new Set(fiches.map((f) => f.slug));

  const uniqueSlug = (base: string) => {
    const racine = base || "membre";
    let slug = racine;
    for (let n = 2; slugsPris.has(slug); n++) slug = `${racine}-${n}`;
    slugsPris.add(slug);
    return slug;
  };

  const plan: Plan = { classees: [], usersACreer: [], fichesACreer: [], rattachements: [], traites: [] };
  for (const l of lignes) {
    const email = l.email.toLowerCase();
    const nomComplet = `${l.prenom} ${l.nom}`;
    const cleNom = cle(nomComplet);
    const userExistant = users.get(email) ?? null;
    const ficheDuCompte = userExistant ? fiches.find((f) => f.userId === userExistant) : undefined;

    let statut: StatutLigne;
    let fiche: FicheEtat | undefined;
    if (userExistant && ficheDuCompte) {
      statut = "deja_membre";
    } else if (userExistant) {
      statut = "lier_compte";
      fiche = fiches.find((f) => !f.userId && f.cle === cleNom);
    } else {
      // L'email de contact identifie mieux une personne que son nom : on le cherche d'abord.
      fiche = fiches.find((f) => !f.userId && f.emailContact === email) ?? fiches.find((f) => !f.userId && f.cle === cleNom);
      statut = fiche ? "rattacher_fiche" : "nouveau";
    }

    if (statut !== "deja_membre") {
      let userId = userExistant;
      if (!userId) {
        userId = randomUUID();
        plan.usersACreer.push({ id: userId, name: nomComplet, email, role: "membre", actif: false, emailVerified: true });
        users.set(email, userId);
      }
      plan.traites.push(userId);
      if (fiche) {
        fiche.userId = userId;
        fiche.emailContact ??= email;
        plan.rattachements.push({ ficheId: fiche.id, userId, email });
      } else {
        const slug = uniqueSlug(slugifier(nomComplet));
        const id = randomUUID();
        plan.fichesACreer.push({
          id,
          slug,
          nom: nomComplet,
          titre: "Ingénieur",
          specialite: l.specialite ?? "",
          promotion: l.promotion,
          telephone: l.telephone,
          emailContact: email,
          resume: "",
          visible: false,
          annuaire: true,
          userId,
        });
        fiches.push({ id, slug, cle: cleNom, emailContact: email, userId });
      }
    }
    plan.classees.push({
      ...l,
      statut,
      // Fiche et compte déjà présents avant la ligne ; null si l'import les crée.
      ficheId: statut === "deja_membre" ? ficheDuCompte!.id : (fiche && !plan.fichesACreer.some((f) => f.id === fiche!.id) ? fiche.id : null),
      userId: userExistant,
    });
  }
  return plan;
}

export async function classerImport(db: Db, lignes: LigneImport[]): Promise<LigneClassee[]> {
  return (await planifier(db, lignes)).classees;
}

const PAQUET = 500;
const paquets = <T,>(xs: T[]) => Array.from({ length: Math.ceil(xs.length / PAQUET) }, (_, i) => xs.slice(i * PAQUET, (i + 1) * PAQUET));

export async function executerImport(
  db: Db,
  lignes: LigneImport[],
): Promise<{ crees: number; rattaches: number; ignores: number; aInviter: string[] }> {
  return db.transaction(async (tx) => {
    // Recalculé dans la transaction : l'aperçu a pu changer entre-temps.
    const plan = await planifier(tx, lignes);

    for (const lot of paquets(plan.usersACreer)) await tx.insert(t.user).values(lot);
    for (const lot of paquets(plan.fichesACreer)) await tx.insert(t.membres).values(lot);
    for (const lot of paquets(plan.rattachements)) {
      const valeurs = sql.join(lot.map((r) => sql`(${r.ficheId}::uuid, ${r.userId}, ${r.email})`), sql`, `);
      await tx.execute(sql`
        update ${t.membres}
        set user_id = v.user_id, email_contact = coalesce(${t.membres.emailContact}, v.email)
        from (values ${valeurs}) as v(id, user_id, email)
        where ${t.membres.id} = v.id`);
    }

    const classees = plan.classees;
    const ignores = classees.filter((c) => c.statut === "deja_membre").length;
    const crees = classees.filter((c) => c.statut === "nouveau").length;

    const avecMotDePasse = plan.traites.length
      ? new Set(
          (
            await tx
              .select({ userId: t.account.userId })
              .from(t.account)
              .where(and(inArray(t.account.userId, plan.traites), eq(t.account.providerId, "credential")))
          ).map((a) => a.userId),
        )
      : new Set<string>();
    return { crees, rattaches: classees.length - ignores - crees, ignores, aInviter: plan.traites.filter((id) => !avecMotDePasse.has(id)) };
  });
}
