import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import * as t from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import type { LigneImport } from "@/lib/membres/import-csv";
import { slugifier } from "@/lib/admin/slug";

export type StatutLigne = "nouveau" | "rattacher_fiche" | "lier_compte" | "deja_membre";
export type LigneClassee = LigneImport & { statut: StatutLigne; ficheId: string | null; userId: string | null };

// Nom comparé sans accents ni casse, espaces réduits.
const cle = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();

type FicheEtat = { id: string; slug: string; cle: string; emailContact: string | null; userId: string | null };

// Classe les lignes une à une ; avec `ecrire`, applique aussi chaque ligne en base.
// L'état est tenu en mémoire pour que deux lignes du même fichier (homonymes, doublons)
// se voient entre elles, comme si les écritures précédentes avaient eu lieu.
async function traiter(db: Db | Tx, lignes: LigneImport[], ecrire: boolean): Promise<LigneClassee[]> {
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

  const resultat: LigneClassee[] = [];
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
      fiche = ficheDuCompte;
    } else if (userExistant) {
      statut = "lier_compte";
      fiche = fiches.find((f) => !f.userId && f.cle === cleNom);
    } else {
      fiche = fiches.find((f) => !f.userId && (f.emailContact === email || f.cle === cleNom));
      statut = fiche ? "rattacher_fiche" : "nouveau";
    }

    const ficheExistante = fiche?.id ?? null;
    let userId = userExistant;
    if (statut !== "deja_membre") {
      if (!userId) {
        userId = ecrire ? randomUUID() : `apercu-${l.ligne}`;
        if (ecrire) {
          await db.insert(t.user).values({ id: userId, name: nomComplet, email, role: "membre", actif: false, emailVerified: true });
        }
        users.set(email, userId);
      }
      if (fiche) {
        fiche.userId = userId;
        if (ecrire) {
          const [f] = await db.select({ emailContact: t.membres.emailContact }).from(t.membres).where(eq(t.membres.id, fiche.id));
          await db
            .update(t.membres)
            .set({ userId, ...(f?.emailContact ? {} : { emailContact: email }) })
            .where(eq(t.membres.id, fiche.id));
        }
      } else {
        const slug = uniqueSlug(slugifier(nomComplet));
        let id = `apercu-fiche-${l.ligne}`;
        if (ecrire) {
          const [cree] = await db
            .insert(t.membres)
            .values({
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
            })
            .returning({ id: t.membres.id });
          id = cree.id;
        }
        fiches.push({ id, slug, cle: cleNom, emailContact: email, userId });
        fiche = fiches[fiches.length - 1];
      }
    }
    resultat.push({
      ...l,
      statut,
      // Fiche déjà présente avant la ligne ; null si l'import en crée une.
      ficheId: ficheExistante,
      userId: userExistant,
    });
  }
  return resultat;
}

export async function classerImport(db: Db, lignes: LigneImport[]): Promise<LigneClassee[]> {
  return traiter(db, lignes, false);
}

export async function executerImport(
  db: Db,
  lignes: LigneImport[],
): Promise<{ crees: number; rattaches: number; ignores: number; aInviter: string[] }> {
  return db.transaction(async (tx) => {
    // Recalculé dans la transaction : l'aperçu a pu changer entre-temps.
    const classees = await traiter(tx, lignes, true);
    const ignores = classees.filter((c) => c.statut === "deja_membre").length;
    const crees = classees.filter((c) => c.statut === "nouveau").length;
    const rattaches = classees.length - ignores - crees;

    const emails = classees.filter((c) => c.statut !== "deja_membre").map((c) => c.email.toLowerCase());
    const ids = emails.length
      ? (await tx.select({ id: t.user.id, email: t.user.email }).from(t.user)).filter((u) => emails.includes(u.email.toLowerCase())).map((u) => u.id)
      : [];
    const avecMotDePasse = ids.length
      ? new Set(
          (
            await tx
              .select({ userId: t.account.userId })
              .from(t.account)
              .where(and(inArray(t.account.userId, ids), eq(t.account.providerId, "credential")))
          ).map((a) => a.userId),
        )
      : new Set<string>();
    return { crees, rattaches, ignores, aInviter: ids.filter((id) => !avecMotDePasse.has(id)) };
  });
}
