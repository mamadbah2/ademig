import { describe, expect, it } from "vitest";
import { estUrlBlob, schemaNouveauMedia, verifierFichier } from "./media";

const Mo = 1024 * 1024;

describe("verifierFichier", () => {
  it("accepte les formats d'image courants", () => {
    expect(verifierFichier({ name: "photo.jpg", type: "image/jpeg", size: 3 * Mo })).toBeNull();
    expect(verifierFichier({ name: "logo.svg", type: "image/svg+xml", size: 20_000 })).toBeNull();
  });

  it("refuse une photo HEIC d'iPhone avec un message clair", () => {
    expect(verifierFichier({ name: "IMG_0042.HEIC", type: "image/heic", size: 2 * Mo })).toBe(
      "Format non pris en charge (HEIC) : utilisez une image JPEG, PNG, WebP, AVIF ou SVG.",
    );
  });

  it("refuse un PDF", () => {
    expect(verifierFichier({ name: "affiche.pdf", type: "application/pdf", size: Mo })).toBe(
      "Format non pris en charge (PDF) : utilisez une image JPEG, PNG, WebP, AVIF ou SVG.",
    );
  });

  it("refuse un fichier de plus de 10 Mo", () => {
    expect(verifierFichier({ name: "panorama.jpg", type: "image/jpeg", size: 25 * Mo })).toBe(
      "Fichier trop lourd (25 Mo) : 10 Mo maximum.",
    );
  });
});

describe("estUrlBlob", () => {
  it("reconnaît les adresses publiques de Vercel Blob", () => {
    expect(estUrlBlob("https://abc123.public.blob.vercel-storage.com/medias/photo-x1.webp")).toBe(true);
    expect(estUrlBlob("https://exemple.com/photo.webp")).toBe(false);
    expect(estUrlBlob("/actualites/photo.jpg")).toBe(false);
  });
});

describe("schemaNouveauMedia", () => {
  const valide = {
    url: "https://abc123.public.blob.vercel-storage.com/medias/photo-x1.webp",
    pathname: "medias/photo-x1.webp",
    alt: "  Le bureau devant l'ENSMG ",
    credit: "",
    width: 2000,
    height: 1333,
    mime: "image/webp",
    taille: 300_000,
  };

  it("nettoie le texte alternatif et vide le crédit absent", () => {
    expect(schemaNouveauMedia.parse(valide)).toMatchObject({ alt: "Le bureau devant l'ENSMG", credit: null });
  });

  it("exige un texte alternatif et une adresse Blob", () => {
    const r = schemaNouveauMedia.safeParse({ ...valide, alt: "", url: "https://exemple.com/x.webp" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["alt", "url"]));
  });
});
