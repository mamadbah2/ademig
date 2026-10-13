import type { Actualite, Evenement } from "./types";

// Photos du diaporama de l'accueil : l'actualité récente et le prochain événement passent « à la une ».

export type DiapoHero = {
  src: string;
  alt: string;
  // Nom court sous la jauge du diaporama.
  univers: string;
  // Cadrage de la photo (classe Tailwind object-position).
  position: string;
  // Contenu mis en avant par la photo, avec sa page.
  une?: { titre: string; href: string };
};

export const DIAPOS_HERO_MAX = 3;
// Au-delà, une actualité n'est plus « récente » : elle ne prend plus le hero.
export const FRAICHEUR_ACTUALITE_JOURS = 120;

// Photos d'origine, utilisées tant que rien de récent n'a de photo.
export const DIAPOS_PAR_DEFAUT: DiapoHero[] = [
  {
    src: "/hero/mine-strates.jpg",
    alt: "Un tombereau au pied du front de taille d'une mine à ciel ouvert, dont les strates sont bien visibles",
    univers: "Mines",
    position: "object-[70%_60%]",
  },
  {
    src: "/hero/offshore-plateforme.jpg",
    alt: "Une plateforme pétrolière en mer, éclairée par le soleil couchant",
    univers: "Pétrole et gaz",
    position: "object-[75%_55%]",
  },
  {
    src: "/hero/mine-tombereau.jpg",
    alt: "Un tombereau chargé de minerai soulève la poussière sur une piste minière",
    univers: "Géologie",
    position: "object-[70%_70%]",
  },
];

type Image = { src: string; alt: string };

// Une affiche en hauteur serait rognée en plein écran : seules les affiches en largeur servent.
function imagesEvenement(e: Evenement): Image[] {
  if (e.photos?.length) return e.photos;
  return e.affiche && e.affiche.width >= e.affiche.height ? [e.affiche] : [];
}

function versDiapos(images: Image[], univers: string, une: DiapoHero["une"]): DiapoHero[] {
  return images.map((p) => ({ src: p.src, alt: p.alt, univers, position: "object-center", une }));
}

// Listes attendues dans l'ordre du site : actualités et événements du plus récent au plus ancien.
export function choisirDiaposHero({
  actualites,
  evenements,
  maintenant,
}: {
  actualites: Actualite[];
  evenements: Evenement[];
  maintenant: Date;
}): DiapoHero[] {
  const iso = maintenant.toISOString();
  const limite = new Date(maintenant.getTime() - FRAICHEUR_ACTUALITE_JOURS * 86_400_000).toISOString();

  const actualite = actualites.find((a) => a.date >= limite && a.date <= iso && a.photos?.length);
  // Le plus proche des événements à venir (ou en cours) qui a une image utilisable.
  const evenement = evenements
    .filter((e) => (e.fin ?? e.debut) >= iso)
    .reverse()
    .find((e) => imagesEvenement(e).length > 0);

  const deEvenement = evenement
    ? versDiapos(imagesEvenement(evenement), "Événement", { titre: evenement.titre, href: `/evenements/${evenement.slug}` })
    : [];
  const deActualite = actualite
    ? versDiapos(actualite.photos ?? [], "Actualité", { titre: actualite.titre, href: `/actualites/${actualite.slug}` })
    : [];

  // Le prochain événement passe en premier ; les deux sources alternent, sans doublon d'image.
  const diapos: DiapoHero[] = [];
  const vues = new Set<string>();
  for (let i = 0; diapos.length < DIAPOS_HERO_MAX && (i < deEvenement.length || i < deActualite.length); i++) {
    for (const d of [deEvenement[i], deActualite[i]]) {
      if (d && !vues.has(d.src) && diapos.length < DIAPOS_HERO_MAX) {
        vues.add(d.src);
        diapos.push(d);
      }
    }
  }
  if (diapos.length === 0) return DIAPOS_PAR_DEFAUT;
  // Plusieurs photos d'une même source : les repères sont numérotés pour rester distincts.
  const total = (u: string) => diapos.filter((d) => d.univers === u).length;
  const rang = new Map<string, number>();
  return diapos.map((d) => {
    if (total(d.univers) < 2) return d;
    const n = (rang.get(d.univers) ?? 0) + 1;
    rang.set(d.univers, n);
    return { ...d, univers: `${d.univers} ${n}` };
  });
}
