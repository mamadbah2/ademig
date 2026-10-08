"use client";

import { useRef } from "react";
import { Bouton } from "./ui";

// Bouton qui demande confirmation dans une boîte de dialogue native avant d'agir.
export function BoutonConfirmation({
  libelle,
  question,
  confirmer,
  onConfirmer,
  disabled,
  variante = "danger",
}: {
  libelle: string;
  question: string;
  confirmer: string;
  onConfirmer: () => void;
  disabled?: boolean;
  variante?: "danger" | "principal";
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Bouton type="button" variante={variante} disabled={disabled} onClick={() => dialogue.current?.showModal()}>
        {libelle}
      </Bouton>
      <dialog
        ref={dialogue}
        aria-label={libelle}
        className="m-auto w-[min(26rem,calc(100%-2rem))] border-[1.5px] border-encre bg-papier p-6 text-encre backdrop:bg-encre/50"
      >
        <p className="font-bold">{question}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Bouton type="button" variante="secondaire" onClick={() => dialogue.current?.close()}>
            Annuler
          </Bouton>
          <Bouton
            type="button"
            variante={variante}
            onClick={() => {
              dialogue.current?.close();
              onConfirmer();
            }}
          >
            {confirmer}
          </Bouton>
        </div>
      </dialog>
    </>
  );
}
