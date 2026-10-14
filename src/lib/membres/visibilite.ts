export const VISIBILITES = ["publique", "membres", "masquee"] as const;
export type Visibilite = (typeof VISIBILITES)[number];

export const LIBELLES_VISIBILITE: Record<Visibilite, { titre: string; aide: string }> = {
  publique: {
    titre: "Publique",
    aide: "Votre photo, votre nom et votre titre apparaissent sur la page Membres du site, avec un lien vers votre LinkedIn, et dans l'annuaire des membres.",
  },
  membres: {
    titre: "Membres seulement",
    aide: "Seuls les membres connectés voient votre fiche, dans l'annuaire.",
  },
  masquee: {
    titre: "Masquée",
    aide: "Personne ne voit votre fiche, à part le bureau.",
  },
};

export function versVisibilite(c: { visible: boolean; annuaire: boolean }): Visibilite {
  if (c.visible) return "publique";
  return c.annuaire ? "membres" : "masquee";
}

export function depuisVisibilite(v: Visibilite): { visible: boolean; annuaire: boolean } {
  return { visible: v === "publique", annuaire: v !== "masquee" };
}
