"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import type { Media } from "@/db/operations/media";
import { chercherMedias } from "@/lib/admin/media";
import { EnvoiImages } from "./envoi-images";
import { Bouton, Champ } from "./ui";

// Choix d'une ou plusieurs images de la médiathèque, avec envoi possible sans quitter le formulaire.
export function SelecteurMedia({
  libelle,
  multiple = false,
  valeur,
  onChange,
}: {
  libelle: string;
  multiple?: boolean;
  valeur: string[];
  onChange: (ids: string[]) => void;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [medias, setMedias] = useState<Media[]>([]);
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState<string[]>(valeur);
  const [chargement, demarrer] = useTransition();

  const charger = (texte: string) =>
    demarrer(async () => {
      const r = await chercherMedias(texte);
      if (r.ok && r.donnees) setMedias(r.donnees);
    });

  const basculer = (id: string) =>
    setChoix((c) => (multiple ? (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]) : [id]));

  function ouvrir() {
    setChoix(valeur);
    charger(recherche);
    dialogue.current?.showModal();
  }

  return (
    <>
      <Bouton type="button" variante="secondaire" onClick={ouvrir}>
        {libelle}
        {valeur.length > 0 && ` (${valeur.length})`}
      </Bouton>
      <dialog
        ref={dialogue}
        aria-label={libelle}
        className="m-auto h-[min(48rem,calc(100%-2rem))] w-[min(64rem,calc(100%-2rem))] border-[1.5px] border-encre bg-papier p-0 text-encre backdrop:bg-encre/50"
      >
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-end gap-3 border-b-[1.5px] border-encre p-4">
            <Champ
              label="Rechercher"
              name="recherche-media"
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  charger(recherche);
                }
              }}
              className="min-w-0 flex-1"
            />
            <Bouton type="button" variante="secondaire" onClick={() => charger(recherche)}>
              Rechercher
            </Bouton>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <details className="mb-6">
              <summary className="cursor-pointer font-bold">Envoyer de nouvelles images</summary>
              <EnvoiImages
                onEnvoye={(id) => {
                  basculer(id);
                  charger(recherche);
                }}
              />
            </details>
            {chargement && <p role="status">Chargement…</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {medias.map((m) => {
                const choisi = choix.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      aria-pressed={choisi}
                      onClick={() => basculer(m.id)}
                      className={`block w-full border-[1.5px] bg-white text-left focus-visible:outline-3 focus-visible:outline-moutarde ${choisi ? "border-brun outline-3 outline-brun" : "border-encre"}`}
                    >
                      <span className="flex aspect-square items-center justify-center p-1">
                        <Image
                          src={m.url}
                          alt=""
                          width={m.width}
                          height={m.height}
                          sizes="200px"
                          unoptimized={m.mime === "image/svg+xml"}
                          className="max-h-full w-auto object-contain"
                        />
                      </span>
                      <span className="block truncate border-t border-encre px-2 py-1 text-sm">{m.alt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex justify-end gap-3 border-t-[1.5px] border-encre p-4">
            <Bouton type="button" variante="secondaire" onClick={() => dialogue.current?.close()}>
              Annuler
            </Bouton>
            <Bouton
              type="button"
              onClick={() => {
                onChange(choix);
                dialogue.current?.close();
              }}
            >
              Valider{choix.length > 0 && ` (${choix.length})`}
            </Bouton>
          </div>
        </div>
      </dialog>
    </>
  );
}
