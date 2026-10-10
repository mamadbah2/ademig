import { z } from "zod";
import { nettoyerHtml, texteDe } from "@/lib/html";

// Liste envoyée par un composant client dans un champ caché, en JSON.
export function champJson<T extends z.ZodType>(schema: T) {
  return z
    .string()
    .default("[]")
    .transform((texte, ctx) => {
      try {
        return JSON.parse(texte) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Valeur illisible : rechargez la page." });
        return z.NEVER;
      }
    })
    .pipe(schema);
}

export const champSlug = z
  .string()
  .trim()
  .min(1, "Indiquez le lien de la page.")
  .max(80, "80 caractères au plus.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lettres minuscules, chiffres et tirets seulement (ex. : forum-sim-2025).");

export const urlWeb = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/, error: "Adresse web invalide : elle doit commencer par http:// ou https://." }));

// Le nettoyage a lieu dans le schéma : aucune donnée validée ne contient de HTML brut.
export function htmlRiche(message: string) {
  return z
    .string()
    .transform(nettoyerHtml)
    .refine((html) => texteDe(html).length > 0, message);
}

const ID_YOUTUBE = /^[\w-]{11}$/;

// Accepte l'identifiant seul ou une adresse YouTube collée telle quelle.
export function extraireIdYoutube(texte: string): string | null {
  const t = texte.trim();
  if (ID_YOUTUBE.test(t)) return t;
  try {
    const url = new URL(t);
    const hote = url.hostname.replace(/^(www\.|m\.)/, "");
    let id: string | null = null;
    if (hote === "youtu.be") id = url.pathname.slice(1);
    else if (hote === "youtube.com" || hote === "youtube-nocookie.com") {
      id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
    }
    return id && ID_YOUTUBE.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const idYoutube = z.string().transform((texte, ctx) => {
  const id = extraireIdYoutube(texte);
  if (!id) {
    ctx.addIssue({ code: "custom", message: "Collez l'adresse de la vidéo YouTube ou son identifiant." });
    return z.NEVER;
  }
  return id;
});

export const intention = z.enum(["enregistrer", "publier", "depublier"]).default("enregistrer");

// Une case cochée envoie « on » ; décochée, elle n'envoie rien.
export const caseACocher = z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());

const video = z.object({ id: idYoutube, titre: z.string().trim().min(1, "Donnez un titre à chaque vidéo.") });
export const listeVideos = champJson(z.array(video).max(10, "10 vidéos au plus."));

export const listePhotos = champJson(
  z
    .array(z.uuid())
    .max(30, "30 photos au plus.")
    .refine((ids) => new Set(ids).size === ids.length, "Une photo figure deux fois."),
);

// Champ caché d'une image unique (affiche, logo, portrait) : vide quand aucune n'est choisie.
export const idMediaFacultatif = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid({ error: "Image inattendue : choisissez-la de nouveau." }).nullable());
