import { QUALITE_WEBP } from "@/lib/validation/media";

export const COTE_PORTRAIT = 800;
export const TYPES_PORTRAIT = ["image/jpeg", "image/png", "image/webp"];

// Plus grand carré centré dans l'image, ramené à 800 px au plus (jamais agrandi).
export function zoneCarree(largeur: number, hauteur: number) {
  const cote = Math.min(largeur, hauteur);
  return {
    x: Math.round((largeur - cote) / 2),
    y: Math.round((hauteur - cote) / 2),
    cote,
    sortie: Math.min(COTE_PORTRAIT, cote),
  };
}

// Dans le navigateur : recadre la photo en carré et l'encode en WebP (PNG sur Safari, qui ne sait pas encoder en WebP).
export async function recadrerCarre(fichier: File): Promise<{ blob: Blob; cote: number }> {
  // createImageBitmap applique l'orientation EXIF des photos de téléphone.
  const bitmap = await createImageBitmap(fichier);
  const { x, y, cote, sortie } = zoneCarree(bitmap.width, bitmap.height);
  const canvas = new OffscreenCanvas(sortie, sortie);
  canvas.getContext("2d")!.drawImage(bitmap, x, y, cote, cote, 0, 0, sortie, sortie);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: QUALITE_WEBP });
  return { blob, cote: sortie };
}
