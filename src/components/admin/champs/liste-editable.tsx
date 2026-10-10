"use client";

import { type ReactNode, useId, useRef, useState } from "react";
import { cibleFocusApres, deplacer, retirer } from "@/lib/admin/liste";
import { Bouton } from "../ui";
import { useFocusDiffere } from "./use-focus-differe";

type Element<T> = { cle: number; valeur: T };

// Liste d'éléments saisis dans le formulaire, envoyée en JSON dans un champ caché.
export function ListeEditable<T>({
  libelle,
  name,
  valeurInitiale,
  nouvelElement,
  rendu,
  libelleAjout,
  erreurs,
}: {
  libelle: string;
  name: string;
  valeurInitiale: T[];
  nouvelElement: () => T;
  rendu: (element: T, modifier: (patch: Partial<T>) => void, index: number, idElement: string) => ReactNode;
  libelleAjout: string;
  erreurs?: string[];
}) {
  const id = useId();
  const compteur = useRef(valeurInitiale.length);
  const [elements, setElements] = useState<Element<T>[]>(() => valeurInitiale.map((valeur, cle) => ({ cle, valeur })));

  const focaliser = useFocusDiffere(elements);

  function agir(action: "monter" | "descendre" | "retirer", i: number) {
    const suivante = action === "retirer" ? retirer(elements, i) : deplacer(elements, i, action === "monter" ? -1 : 1);
    const cible = cibleFocusApres(action, i, elements.length);
    focaliser(cible === "ajout" ? `${id}-ajout` : `${id}-${suivante[cible.index].cle}-${cible.bouton}`);
    setElements(suivante);
  }

  const modifier = (index: number) => (patch: Partial<T>) =>
    setElements((l) => l.map((e, i) => (i === index ? { ...e, valeur: { ...e.valeur, ...patch } } : e)));

  return (
    <fieldset aria-describedby={erreurs?.length ? `${id}-erreur` : undefined} className="border-[1.5px] border-encre p-4">
      <legend className="px-1 font-bold">{libelle}</legend>
      <input type="hidden" name={name} value={JSON.stringify(elements.map((e) => e.valeur))} />
      <ol className="space-y-4">
        {elements.map((e, i) => (
          <li key={e.cle} className="border-b border-encre/30 pb-4">
            {rendu(e.valeur, modifier(i), i, `${id}-${e.cle}`)}
            <div className="mt-2 flex flex-wrap gap-2">
              <Bouton type="button" variante="secondaire" id={`${id}-${e.cle}-haut`} disabled={i === 0} onClick={() => agir("monter", i)} aria-label={`${libelle} : monter l'élément ${i + 1}`}>
                ↑
              </Bouton>
              <Bouton type="button" variante="secondaire" id={`${id}-${e.cle}-bas`} disabled={i === elements.length - 1} onClick={() => agir("descendre", i)} aria-label={`${libelle} : descendre l'élément ${i + 1}`}>
                ↓
              </Bouton>
              <Bouton type="button" variante="danger" id={`${id}-${e.cle}-retirer`} onClick={() => agir("retirer", i)} aria-label={`${libelle} : retirer l'élément ${i + 1}`}>
                Retirer
              </Bouton>
            </div>
          </li>
        ))}
      </ol>
      <Bouton
        type="button"
        variante="secondaire"
        id={`${id}-ajout`}
        className="mt-4"
        onClick={() => setElements((l) => [...l, { cle: compteur.current++, valeur: nouvelElement() }])}
      >
        {libelleAjout}
      </Bouton>
      {erreurs && erreurs.length > 0 && (
        <p id={`${id}-erreur`} className="mt-2 border-l-4 border-rouge pl-2 text-sm font-bold">
          {erreurs.join(" ")}
        </p>
      )}
    </fieldset>
  );
}
