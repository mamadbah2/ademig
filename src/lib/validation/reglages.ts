import { z } from "zod";
import { CLES_TEXTES, type CleTexte, normaliserTexte, TEXTES, textesAEnregistrer } from "@/lib/content/textes";
import { champJson } from "./commun";

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
const version = z.iso.datetime().optional();

const requis = (message: string, max: number) => z.string().trim().min(1, message).max(max, `${max} caractères au plus.`);

const FORMAT_TELEPHONE = /^\+?[0-9][0-9 .()-]{5,24}$/;
const MESSAGE_TELEPHONE = "Numéro invalide (ex. : +221 77 552 52 25).";

export const schemaCoordonnees = z
  .object({
    email: z.string().trim().max(120, "120 caractères au plus.").pipe(z.email("Adresse email invalide.")),
    // Facultatif : un champ vide donne null.
    telephone: z
      .string()
      .optional()
      .transform((v) => v?.trim() || null)
      .pipe(z.string().regex(FORMAT_TELEPHONE, MESSAGE_TELEPHONE).nullable()),
    presseNom: requis("Indiquez le nom du contact presse.", 120),
    presseTelephone: z.string().trim().regex(FORMAT_TELEPHONE, MESSAGE_TELEPHONE),
    rue: requis("Indiquez la rue.", 200),
    boitePostale: requis("Indiquez la boîte postale.", 80),
    ville: requis("Indiquez la ville.", 80),
    pays: requis("Indiquez le pays.", 80),
    version,
  })
  .transform(({ version, email, telephone, presseNom, presseTelephone, rue, boitePostale, ville, pays }) => ({
    version,
    contact: {
      email,
      phone: telephone,
      press: { name: presseNom, phone: presseTelephone },
      address: { street: rue, postalBox: boitePostale, city: ville, country: pays },
    },
  }));

const reseau = z.object({
  label: z.string().trim().min(1, "Nommez chaque réseau.").max(40, "40 caractères au plus."),
  url: z.string().trim().pipe(z.url({ protocol: /^https$/, error: "Adresse invalide : elle doit commencer par https://." })),
});

export const schemaReseaux = z.object({
  reseaux: champJson(
    z
      .array(reseau)
      .max(12, "12 réseaux au plus.")
      .refine((liste) => new Set(liste.map((r) => r.label.toLowerCase())).size === liste.length, "Deux réseaux portent le même nom."),
  ),
  version,
});

function champTexte(cle: CleTexte) {
  const { max } = TEXTES[cle];
  return z
    .string()
    .default("")
    .transform((v) => normaliserTexte(cle, v))
    .pipe(z.string().max(max, `${max} caractères au plus.`));
}

// Objet strict : une clé hors du catalogue est refusée, jamais stockée.
export const schemaTextes = z
  .strictObject({ ...Object.fromEntries(CLES_TEXTES.map((cle) => [cle, champTexte(cle)])), version })
  .transform(({ version, ...saisie }) => ({ version, textes: textesAEnregistrer(saisie) }));
