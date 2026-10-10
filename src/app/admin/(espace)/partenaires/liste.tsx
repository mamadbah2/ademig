"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFocusDiffere } from "@/components/admin/champs/use-focus-differe";
import { Alerte, Badge, Bouton } from "@/components/admin/ui";
import type { LignePartenaireAdmin } from "@/db/requetes/admin/partenaires";
import { deplacerPartenaireAction } from "@/lib/admin/partenaires";
import type { Resultat } from "@/lib/admin/resultat";

export function ListePartenaires({ lignes }: { lignes: LignePartenaireAdmin[] }) {
  const [erreur, setErreur] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  const focaliser = useFocusDiffere(lignes);
  // Échec : la liste ne change pas, donc on rend le focus au bouton cliqué dès qu'il est de nouveau actif.
  const apresEchec = useRef<string | null>(null);
  useEffect(() => {
    if (!enCours && apresEchec.current) {
      document.getElementById(apresEchec.current)?.focus();
      apresEchec.current = null;
    }
  }, [enCours]);

  function deplacer(index: number, sens: -1 | 1) {
    const { id } = lignes[index];
    const arrivee = index + sens;
    // La ligne garde sa clé : le bouton cliqué garde le focus, sauf s'il devient désactivé à une extrémité.
    const extremite = arrivee === 0 || arrivee === lignes.length - 1;
    const bouton = sens === -1 ? (extremite ? "bas" : "haut") : extremite ? "haut" : "bas";
    demarrer(async () => {
      const r = await deplacerPartenaireAction(id, sens);
      setErreur(r.ok ? null : r);
      if (r.ok) focaliser(`partenaire-${id}-${bouton}`);
      else apresEchec.current = `partenaire-${id}-${sens === -1 ? "haut" : "bas"}`;
    });
  }

  return (
    <>
      <Alerte resultat={erreur} />
      <ol className="divide-y divide-encre/30 border-y-[1.5px] border-encre">
        {lignes.map((p, i) => (
          <li key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2 py-3">
            <span className="flex size-14 shrink-0 items-center justify-center border-[1.5px] border-encre bg-white p-1">
              {p.logo && (
                <Image
                  src={p.logo.url}
                  alt=""
                  width={p.logo.width}
                  height={p.logo.height}
                  sizes="56px"
                  unoptimized={p.logo.mime === "image/svg+xml"}
                  className="max-h-full w-auto object-contain"
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <Link href={`/admin/partenaires/${p.id}`} className="font-bold underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-moutarde">
                {p.nom}
              </Link>
              <span className="block text-sm">{p.categorie}</span>
            </span>
            <Badge ton={p.visible ? "vert" : "moutarde"}>{p.visible ? "Visible" : "Masqué"}</Badge>
            <span className="flex gap-2">
              <Bouton type="button" variante="secondaire" id={`partenaire-${p.id}-haut`} aria-label={`Monter ${p.nom}`} disabled={enCours || i === 0} onClick={() => deplacer(i, -1)}>
                ↑
              </Bouton>
              <Bouton type="button" variante="secondaire" id={`partenaire-${p.id}-bas`} aria-label={`Descendre ${p.nom}`} disabled={enCours || i === lignes.length - 1} onClick={() => deplacer(i, 1)}>
                ↓
              </Bouton>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
