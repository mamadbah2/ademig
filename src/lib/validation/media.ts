import { z } from "zod";
import { formatOctets } from "@/lib/format";

export const TYPES_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"] as const;
export const TAILLE_MAX = 10 * 1024 * 1024;
export const COTE_MAX = 2000;
export const QUALITE_WEBP = 0.82;

export function estUrlBlob(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

// Contrôle fait dans le navigateur avant tout envoi.
export function verifierFichier(f: { name: string; type: string; size: number }): string | null {
  if (!(TYPES_IMAGES as readonly string[]).includes(f.type)) {
    const extension = f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : null;
    return `Format non pris en charge${extension ? ` (${extension})` : ""} : utilisez une image JPEG, PNG, WebP, AVIF ou SVG.`;
  }
  if (f.size > TAILLE_MAX) return `Fichier trop lourd (${formatOctets(f.size)}) : 10 Mo maximum.`;
  return null;
}

const alt = z.string().trim().min(3, "Décrivez l'image en quelques mots (texte alternatif).");
const credit = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

export const schemaNouveauMedia = z.object({
  url: z.string().refine(estUrlBlob, "Adresse d'image inattendue."),
  pathname: z.string().min(1),
  alt,
  credit,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mime: z.enum(TYPES_IMAGES),
  taille: z.number().int().positive().max(TAILLE_MAX),
});

export const schemaMajMedia = z.object({ alt, credit });
