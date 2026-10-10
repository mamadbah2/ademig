"use client";

import Image from "next/image";
import { useId, useState } from "react";
import type { MediaChoisi } from "@/db/requetes/admin/commun";
import { deplacer, retirer } from "@/lib/admin/liste";
import { SelecteurMedia } from "../selecteur-media";
import { Bouton } from "../ui";

function Vignette({ media }: { media: MediaChoisi }) {
  return (
    <span className="flex aspect-square w-24 shrink-0 items-center justify-center border-[1.5px] border-encre bg-white p-1">
      <Image
        src={media.url}
        alt=""
        width={media.width}
        height={media.height}
        sizes="96px"
        unoptimized={media.mime === "image/svg+xml"}
        className="max-h-full w-auto object-contain"
      />
    </span>
  );
}

function Erreurs({ id, erreurs }: { id: string; erreurs?: string[] }) {
  if (!erreurs?.length) return null;
  return (
    <p id={id} className="mt-2 border-l-4 border-rouge pl-2 text-sm font-bold">
      {erreurs.join(" ")}
    </p>
  );
}

// Une seule image (affiche, portrait, logo).
export function ChampMedia({
  libelle,
  name,
  valeurInitiale,
  erreurs,
}: {
  libelle: string;
  name: string;
  valeurInitiale: MediaChoisi | null;
  erreurs?: string[];
}) {
  const id = useId();
  const [media, setMedia] = useState(valeurInitiale);
  return (
    <fieldset aria-describedby={erreurs?.length ? id : undefined} className="border-[1.5px] border-encre p-4">
      <legend className="px-1 font-bold">{libelle}</legend>
      <input type="hidden" name={name} value={media?.id ?? ""} />
      {media ? (
        <div className="flex flex-wrap items-center gap-4">
          <Vignette media={media} />
          <p className="min-w-0 flex-1">{media.alt}</p>
          <Bouton type="button" variante="danger" onClick={() => setMedia(null)}>
            Retirer
          </Bouton>
        </div>
      ) : (
        <p className="mb-3">Aucune image.</p>
      )}
      <div className="mt-3">
        <SelecteurMedia
          libelle={media ? "Changer d'image" : "Choisir une image"}
          valeur={media ? [media] : []}
          onChange={(l) => setMedia(l[0] ?? null)}
        />
      </div>
      <Erreurs id={id} erreurs={erreurs} />
    </fieldset>
  );
}

// Plusieurs images ordonnées ; la première sert de vignette dans les listes du site.
export function GaleriePhotos({
  libelle,
  name,
  valeurInitiale,
  erreurs,
}: {
  libelle: string;
  name: string;
  valeurInitiale: MediaChoisi[];
  erreurs?: string[];
}) {
  const id = useId();
  const [photos, setPhotos] = useState(valeurInitiale);
  return (
    <fieldset aria-describedby={erreurs?.length ? id : undefined} className="border-[1.5px] border-encre p-4">
      <legend className="px-1 font-bold">{libelle}</legend>
      <input type="hidden" name={name} value={JSON.stringify(photos.map((p) => p.id))} />
      {photos.length === 0 ? (
        <p className="mb-3">Aucune photo.</p>
      ) : (
        <ol className="mb-3 space-y-3">
          {photos.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3">
              <Vignette media={p} />
              <p className="min-w-0 flex-1">
                {i === 0 && <strong>Vignette · </strong>}
                {p.alt}
              </p>
              <div className="flex gap-2">
                <Bouton
                  type="button"
                  variante="secondaire"
                  disabled={i === 0}
                  onClick={() => setPhotos((l) => deplacer(l, i, -1))}
                  aria-label={`Monter la photo ${i + 1}`}
                >
                  ↑
                </Bouton>
                <Bouton
                  type="button"
                  variante="secondaire"
                  disabled={i === photos.length - 1}
                  onClick={() => setPhotos((l) => deplacer(l, i, 1))}
                  aria-label={`Descendre la photo ${i + 1}`}
                >
                  ↓
                </Bouton>
                <Bouton
                  type="button"
                  variante="danger"
                  onClick={() => setPhotos((l) => retirer(l, i))}
                  aria-label={`Retirer la photo ${i + 1}`}
                >
                  Retirer
                </Bouton>
              </div>
            </li>
          ))}
        </ol>
      )}
      <SelecteurMedia libelle="Choisir les photos" multiple valeur={photos} onChange={setPhotos} />
      <Erreurs id={id} erreurs={erreurs} />
    </fieldset>
  );
}
