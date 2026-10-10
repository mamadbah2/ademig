"use client";

import { BoutonConfirmation } from "../confirmation";
import { Badge, Bouton } from "../ui";

// Statut et boutons d'un contenu ; chaque bouton de soumission porte son intention.
export function BarrePublication({
  statut,
  enCours,
  apercu,
  onSupprimer,
  libelleSupprimer = "Supprimer",
}: {
  statut: "brouillon" | "publie" | null;
  enCours: boolean;
  apercu?: string;
  onSupprimer?: () => void;
  libelleSupprimer?: string;
}) {
  const publie = statut === "publie";
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t-[1.5px] border-encre bg-papier px-4 py-3 sm:-mx-8 sm:px-8">
      {statut && <Badge ton={publie ? "vert" : "moutarde"}>{publie ? "Publié" : "Brouillon"}</Badge>}
      <Bouton type="submit" name="intention" value="enregistrer" variante={publie ? "principal" : "secondaire"} disabled={enCours}>
        {enCours ? "Enregistrement…" : publie ? "Enregistrer" : "Enregistrer le brouillon"}
      </Bouton>
      {publie ? (
        <Bouton type="submit" name="intention" value="depublier" variante="secondaire" disabled={enCours}>
          Dépublier
        </Bouton>
      ) : (
        <Bouton type="submit" name="intention" value="publier" disabled={enCours}>
          Publier
        </Bouton>
      )}
      {apercu && (
        <a
          href={apercu}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center px-2 font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-moutarde"
        >
          Aperçu
        </a>
      )}
      {onSupprimer && (
        <div className="ml-auto">
          <BoutonConfirmation
            libelle={libelleSupprimer}
            question="Supprimer définitivement ce contenu ? Les images restent dans la médiathèque."
            confirmer="Supprimer"
            disabled={enCours}
            onConfirmer={onSupprimer}
          />
        </div>
      )}
    </div>
  );
}
