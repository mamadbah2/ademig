"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { ErreurMetier } from "@/db/operations/erreurs";
import { classerImport, executerImport, type LigneClassee } from "@/db/operations/import-membres";
import { inviterParEmail } from "@/db/operations/invitations";
import { action } from "@/lib/admin/action";
import type { Resultat } from "@/lib/admin/resultat";
import { analyserCsv, type ProblemeImport } from "@/lib/membres/import-csv";
import { urlActivation } from "@/lib/membres/url";

const TAILLE_MAX = 1024 * 1024;
// Invitations écrites par groupes : 2000 lignes en série seraient trop longues pour une requête.
const GROUPE = 20;

export type ApercuImport = { lignes: LigneClassee[]; problemes: ProblemeImport[]; csv: string };
export type BilanImport = { crees: number; rattaches: number; ignores: number; invites: number };

export async function analyserImport(_etat: unknown, donnees: FormData): Promise<Resultat<ApercuImport>> {
  return action("superadmin", async () => {
    const fichier = donnees.get("fichier");
    if (!(fichier instanceof File) || fichier.size === 0) throw new ErreurMetier("Choisissez un fichier CSV.");
    if (fichier.size > TAILLE_MAX) throw new ErreurMetier("Ce fichier dépasse 1 Mo : divisez-le en plusieurs fichiers.");
    // text() décode sans échec sur les octets invalides : le « � » est alors détecté par l'analyse.
    const csv = await fichier.text();
    const { valides, problemes } = analyserCsv(csv);
    return { ok: true, donnees: { lignes: await classerImport(db, valides), problemes, csv } };
  });
}

export async function confirmerImport(csv: string): Promise<Resultat<BilanImport>> {
  return action("superadmin", async () => {
    if (typeof csv !== "string" || csv.length > TAILLE_MAX * 2) throw new ErreurMetier("Fichier invalide : recommencez l'import.");
    // Le CSV est réanalysé : rien de l'aperçu n'est cru sur parole.
    const { valides } = analyserCsv(csv);
    const { crees, rattaches, ignores, aInviter } = await executerImport(db, valides);
    const comptes = [...new Set(aInviter)];
    for (let i = 0; i < comptes.length; i += GROUPE) {
      await Promise.all(comptes.slice(i, i + GROUPE).map((id) => inviterParEmail(db, id, urlActivation)));
    }
    revalidatePath("/admin/membres");
    return { ok: true, donnees: { crees, rattaches, ignores, invites: comptes.length } };
  });
}
