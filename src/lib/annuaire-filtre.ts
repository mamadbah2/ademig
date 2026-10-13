import type { FiltreAnnuaire } from "@/db/requetes/annuaire";

const PAGE_MAX = 10_000;
const texte = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// Recherche, promotion, spécialité et page viennent de l'URL : l'annuaire se partage et survit au rechargement.
export function lireFiltreAnnuaire(p: Record<string, string | string[] | undefined>): FiltreAnnuaire {
  const promotion = Number(texte(p.promotion));
  const page = Number(texte(p.page));
  return {
    q: texte(p.q).trim(),
    promotion: Number.isInteger(promotion) && promotion >= 1900 && promotion <= 2200 ? promotion : null,
    specialite: texte(p.specialite).trim() || null,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, PAGE_MAX) : 1,
  };
}

export function urlAnnuaire(f: FiltreAnnuaire, page: number): string {
  const base = "/espace-membre/annuaire";
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.promotion !== null) p.set("promotion", String(f.promotion));
  if (f.specialite) p.set("specialite", f.specialite);
  if (page > 1) p.set("page", String(page));
  const requete = p.toString();
  return requete ? `${base}?${requete}` : base;
}
