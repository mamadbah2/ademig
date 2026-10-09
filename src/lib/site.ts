
// Configuration générale du site.
// Les valeurs marquées « À CONFIRMER » doivent être validées par le bureau de l'ADEMIG.

export const site = {
  name: "ADEMIG",
  fullName:
    "Amicale des ingénieurs diplômés de l'École nationale supérieure des mines et de la géologie",
  shortDescription: "Amicale des ingénieurs diplômés de l'ENSMG",
  description:
    "L'ADEMIG réunit les ingénieurs diplômés de l'École nationale supérieure des mines et de la géologie (ENSMG) de Dakar. Elle contribue à un secteur extractif sénégalais plus inclusif et durable.",
  motto: "Réfléchir, proposer, agir",
  // À CONFIRMER : nom de domaine définitif (ademig.org appartient à une autre association, au Niger).
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ademig.sn",
  locale: "fr_SN",
} as const;

export const navigation = [
  { href: "/", label: "Accueil" },
  { href: "/amicale", label: "L'Amicale" },
  { href: "/bureau", label: "Bureau et commissions" },
  { href: "/membres", label: "Membres" },
  { href: "/actualites", label: "Actualités" },
  { href: "/evenements", label: "Événements" },
  { href: "/partenaires", label: "Partenaires" },
  { href: "/contact", label: "Contact" },
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, site.url).toString();
}
