"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";

// Tiptap n'est chargé que dans l'admin, et seulement dans le navigateur.
const ZoneTiptap = dynamic(() => import("./zone-tiptap"), {
  ssr: false,
  loading: () => <div className="min-h-80 animate-pulse border-[1.5px] border-encre bg-white" aria-hidden />,
});

export function EditeurRiche({
  libelle,
  name,
  valeurInitiale,
  aide,
  erreurs,
}: {
  libelle: string;
  name: string;
  valeurInitiale: string;
  aide?: string;
  erreurs?: string[];
}) {
  const id = useId();
  const [html, setHtml] = useState(valeurInitiale);
  const description = [aide && `${id}-aide`, erreurs?.length && `${id}-erreur`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <p id={`${id}-libelle`} className="mb-1 font-bold">
        {libelle}
      </p>
      {/* Présent dès le premier rendu : le formulaire l'envoie même si l'éditeur n'a pas fini de charger. */}
      <input type="hidden" name={name} value={html} />
      <ZoneTiptap
        valeurInitiale={valeurInitiale}
        onChange={setHtml}
        idLibelle={`${id}-libelle`}
        idDescription={description}
        invalide={Boolean(erreurs?.length)}
      />
      {aide && (
        <p id={`${id}-aide`} className="mt-1 text-sm">
          {aide}
        </p>
      )}
      {erreurs && erreurs.length > 0 && (
        <p id={`${id}-erreur`} className="mt-1 border-l-4 border-rouge pl-2 text-sm font-bold">
          {erreurs.join(" ")}
        </p>
      )}
    </div>
  );
}
