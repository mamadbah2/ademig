"use client";

import { useRef, useState } from "react";
import { slugifier } from "@/lib/admin/slug";
import { Bouton, Champ } from "../ui";

// Lien de la page : suit le titre tant qu'on ne l'a pas modifié ; verrouillé une fois le contenu publié.
export function ChampSlug({
  titre,
  valeurInitiale,
  verrouille,
  erreurs,
}: {
  titre: string;
  valeurInitiale: string;
  verrouille: boolean;
  erreurs?: string[];
}) {
  const [saisie, setSaisie] = useState<string | null>(valeurInitiale || null);
  const [deverrouille, setDeverrouille] = useState(false);
  // Après un enregistrement, l'état sauvegardé change : le lien se reverrouille (ajustement pendant le rendu).
  const [enregistre, setEnregistre] = useState({ valeurInitiale, verrouille });
  if (enregistre.valeurInitiale !== valeurInitiale || enregistre.verrouille !== verrouille) {
    setEnregistre({ valeurInitiale, verrouille });
    setDeverrouille(false);
  }
  const champ = useRef<HTMLInputElement>(null);
  const valeur = saisie ?? slugifier(titre);
  const bloque = verrouille && !deverrouille;

  return (
    <div>
      <Champ
        ref={champ}
        label="Lien de la page"
        name="slug"
        value={valeur}
        readOnly={bloque}
        onChange={(e) => setSaisie(e.target.value)}
        aide={
          bloque
            ? "Ce contenu a déjà été publié : son lien a pu être partagé."
            : deverrouille
              ? "Attention : l'ancien lien ne fonctionnera plus."
              : "Lettres minuscules, chiffres et tirets. Proposé à partir du titre."
        }
        erreurs={erreurs}
        required
      />
      {deverrouille && <input type="hidden" name="modifierSlug" value="on" />}
      {bloque && (
        <Bouton type="button" variante="secondaire" className="mt-2" onClick={() => {
            setDeverrouille(true);
            champ.current?.focus();
          }}>
          Modifier le lien
        </Bouton>
      )}
    </div>
  );
}
