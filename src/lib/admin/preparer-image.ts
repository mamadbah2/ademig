import { COTE_MAX, QUALITE_WEBP } from "@/lib/validation/media";

export function calculerDimensions(largeur: number, hauteur: number, max = COTE_MAX) {
  const echelle = Math.min(1, max / Math.max(largeur, hauteur));
  return { width: Math.round(largeur * echelle), height: Math.round(hauteur * echelle) };
}

export function nomDeFichier(nom: string, extension: string): string {
  const base = nom
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "image"}.${extension}`;
}

async function dimensionsSvg(fichier: File) {
  const url = URL.createObjectURL(fichier);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    // Un SVG sans largeur ni hauteur déclarées : format paysage par défaut.
    return { width: image.naturalWidth || 800, height: image.naturalHeight || 600 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Dans le navigateur : réduit l'image à 2000 px et la convertit en WebP (les SVG restent tels quels).
export async function preparerImage(fichier: File): Promise<{ fichier: File; width: number; height: number }> {
  if (fichier.type === "image/svg+xml") return { fichier, ...(await dimensionsSvg(fichier)) };
  // createImageBitmap applique l'orientation EXIF des photos de téléphone.
  const bitmap = await createImageBitmap(fichier);
  const { width, height } = calculerDimensions(bitmap.width, bitmap.height);
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: QUALITE_WEBP });
  // Safari ne sait pas encoder en WebP : il renvoie du PNG, qu'on garde tel quel.
  const type = blob.type || "image/png";
  const extension = type === "image/webp" ? "webp" : "png";
  return { fichier: new File([blob], nomDeFichier(fichier.name, extension), { type }), width, height };
}
