import { Portrait } from "@/components/portrait";
import type { Member } from "@/lib/content/types";

export type DonneesCarte = Pick<Member, "nom" | "titre" | "photo" | "fonction" | "liens">;

// Seuls les champs affichés partent vers le navigateur (l'annuaire est un composant client).
export function versCarte(m: Member) {
  return {
    slug: m.slug,
    nom: m.nom,
    titre: m.titre,
    organisation: m.organisation,
    specialite: m.specialite,
    photo: m.photo,
    fonction: m.fonction,
    liens: m.liens?.linkedin ? { linkedin: m.liens.linkedin } : undefined,
  };
}

export type MembreAnnuaire = ReturnType<typeof versCarte>;

// Carte d'un membre : portrait, nom, titre (et fonction au bureau si demandée).
// Il n'y a plus de page par membre : la carte mène à son profil LinkedIn, ou n'est pas un lien.
// Pas de transition CSS sur `transform` ici : les `li` parents sont animés par GSAP.
export function CarteMembre({
  membre,
  disposition = "colonne",
  avecFonction = false,
  priority = false,
}: {
  membre: DonneesCarte;
  disposition?: "colonne" | "ligne";
  avecFonction?: boolean;
  priority?: boolean;
}) {
  const linkedin = membre.liens?.linkedin;
  const colonne = disposition === "colonne";
  const contenu = (
    <>
      <Portrait nom={membre.nom} photo={membre.photo} taille={colonne ? "lg" : "md"} priority={priority} />
      <span className={colonne ? "mt-4 block" : "block min-w-0"}>
        <span className="font-titre block text-2xl leading-tight transition-colors group-hover:text-brun">
          {membre.nom}
        </span>
        {avecFonction && membre.fonction && <span className="mt-1 block font-bold">{membre.fonction}</span>}
        {membre.titre && <span className={`mt-1 block ${avecFonction ? "text-sm" : ""}`}>{membre.titre}</span>}
        {linkedin && (
          <span aria-hidden className="mt-2 inline-block text-sm font-bold underline underline-offset-4">
            Profil LinkedIn ↗
          </span>
        )}
      </span>
    </>
  );
  const mise = colonne ? "flex flex-col items-center text-center" : "flex items-center gap-5";

  if (!linkedin) return <div className={mise}>{contenu}</div>;
  return (
    <a
      href={linkedin}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${membre.nom} — profil LinkedIn (nouvel onglet)`}
      className={`group ${mise} focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-moutarde`}
    >
      {contenu}
    </a>
  );
}
