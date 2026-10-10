"use client";

import { type FormEvent, useActionState, useEffect, useRef, useTransition } from "react";
import type { Resultat } from "@/lib/admin/resultat";

function empreinte(formulaire: HTMLFormElement | null): string {
  if (!formulaire) return "";
  return [...new FormData(formulaire)].map(([cle, valeur]) => `${cle}=${String(valeur)}`).join("&");
}

// Soumission par onSubmit : avec `<form action>`, React vide les champs après chaque envoi,
// ce qui ferait perdre la saisie quand le serveur renvoie une erreur.
export function useFormulaire<T>(actionServeur: (etat: Resultat<T> | null, donnees: FormData) => Promise<Resultat<T>>) {
  const [resultat, envoyer, enCours] = useActionState(actionServeur, null);
  const [, demarrer] = useTransition();
  const formulaire = useRef<HTMLFormElement>(null);
  const reference = useRef<string | null>(null);

  // État de référence : à l'affichage, puis après chaque enregistrement réussi.
  useEffect(() => {
    if (reference.current === null || resultat?.ok) reference.current = empreinte(formulaire.current);
  }, [resultat]);

  useEffect(() => {
    function avertir(e: BeforeUnloadEvent) {
      if (reference.current !== null && empreinte(formulaire.current) !== reference.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Le bouton cliqué porte l'intention (enregistrer, publier, dépublier).
    const donnees = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    demarrer(() => envoyer(donnees));
  }

  return { resultat, enCours, formulaire, onSubmit };
}
