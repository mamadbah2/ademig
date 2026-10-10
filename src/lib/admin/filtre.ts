export type Filtre = { q: string; statut?: "brouillon" | "publie"; page: number };

// Au-delà, l'OFFSET demandé à Postgres devient démesuré pour une liste paginée.
const PAGE_MAX = 10_000;

const texte = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// Recherche, statut et page viennent de l'URL : la liste se partage et survit au rechargement.
export function lireFiltre(p: Record<string, string | string[] | undefined>): Filtre {
  const statut = texte(p.statut);
  const page = Number(texte(p.page));
  return {
    q: texte(p.q).trim(),
    statut: statut === "brouillon" || statut === "publie" ? statut : undefined,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, PAGE_MAX) : 1,
  };
}

export function urlListe(base: string, f: Filtre, page: number): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.statut) p.set("statut", f.statut);
  if (page > 1) p.set("page", String(page));
  const requete = p.toString();
  return requete ? `${base}?${requete}` : base;
}
