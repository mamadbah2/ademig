"use client";

import { useActionState, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { activer } from "@/lib/membres/actions-activation";
import type { Resultat } from "@/lib/admin/resultat";

const MINIMUM = 12;

export function FormulaireActivation({ jeton }: { jeton: string }) {
  const [resultat, envoyer, enCours] = useActionState<
    Resultat | null,
    FormData
  >(activer.bind(null, jeton), null);
  const [longueur, setLongueur] = useState(0);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;

  return (
    <form action={envoyer} onReset={() => setLongueur(0)} className="mt-6 space-y-5">
      <Alerte
        resultat={resultat && !resultat.ok && !erreurs ? resultat : null}
      />
      <Champ
        label="Mot de passe"
        name="motDePasse"
        type="password"
        autoComplete="new-password"
        minLength={MINIMUM}
        maxLength={128}
        required
        onChange={(e) => setLongueur(e.currentTarget.value.length)}
        aide={`${MINIMUM} caractères minimum. Une phrase de plusieurs mots est facile à retenir.`}
        erreurs={erreurs?.motDePasse}
      />
      <p aria-live="polite" className="-mt-3 text-sm font-bold">
        {longueur} / {MINIMUM} caractères
      </p>
      <Champ
        label="Confirmer le mot de passe"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        required
        erreurs={erreurs?.confirmation}
      />
      <Bouton type="submit" disabled={enCours} className="w-full">
        {enCours ? "Activation…" : "Activer mon compte"}
      </Bouton>
    </form>
  );
}
