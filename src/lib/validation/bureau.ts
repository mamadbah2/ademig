import { z } from "zod";
import { caseACocher, champJson } from "./commun";

const libelle = z.string().trim().min(1, "Nommez le mandat (ex. : Bureau 2024).").max(80, "80 caractères au plus.");
const dateElection = z.iso.date({ error: "Indiquez la date de l'élection." });
const idMembre = z.uuid({ error: "Choisissez un membre." });
const sansDoublon = (valeurs: string[]) => new Set(valeurs).size === valeurs.length;

export const schemaNouveauMandat = z.object({ libelle, dateElection, reprendreCommissions: caseACocher });

const poste = z.object({
  membreId: idMembre,
  fonction: z.string().trim().min(1, "Indiquez la fonction.").max(120, "120 caractères au plus."),
  executif: z.boolean(),
});

const commission = z.object({
  nom: z.string().trim().min(1, "Nommez la commission.").max(120, "120 caractères au plus."),
  mission: z.string().trim().min(1, "Décrivez la mission de la commission.").max(600, "600 caractères au plus."),
  membres: z
    .array(z.object({ membreId: idMembre }))
    .max(30, "30 membres au plus par commission.")
    .refine((l) => sansDoublon(l.map((m) => m.membreId)), "Un membre figure deux fois dans la même commission.")
    .transform((l) => l.map((m) => m.membreId)),
});

export const schemaMandat = z.object({
  libelle,
  dateElection,
  postes: champJson(
    z
      .array(poste)
      .max(40, "40 postes au plus.")
      .refine((l) => sansDoublon(l.map((p) => p.membreId)), "Un membre n'occupe qu'un poste par mandat."),
  ),
  commissions: champJson(
    z
      .array(commission)
      .max(20, "20 commissions au plus.")
      .refine((l) => sansDoublon(l.map((c) => c.nom.trim().toLowerCase())), "Deux commissions portent le même nom."),
  ),
});

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiMandat = schemaMandat.extend({ version: z.iso.datetime().optional() });
