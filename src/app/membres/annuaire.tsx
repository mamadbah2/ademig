"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Portrait } from "@/components/portrait";
import type { Member } from "@/lib/content/types";

function normaliser(texte: string) {
  return texte.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function AnnuaireMembres({ membres }: { membres: Member[] }) {
  const [recherche, setRecherche] = useState("");
  const [specialite, setSpecialite] = useState("");

  const specialites = useMemo(
    () => [...new Set(membres.map((m) => m.specialite))].filter((s) => s !== "À compléter").sort(),
    [membres],
  );

  const q = normaliser(recherche.trim());
  const resultats = membres.filter((m) => {
    if (specialite && m.specialite !== specialite) return false;
    if (!q) return true;
    const texte = [m.nom, m.titre, m.fonction, m.organisation, m.ville, m.specialite, ...m.competences]
      .filter(Boolean)
      .join(" ");
    return normaliser(texte).includes(q);
  });

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Rechercher un membre</span>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, entreprise, compétence…"
            className="w-full border-[1.5px] border-encre bg-papier px-4 py-3 placeholder:text-encre/60"
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par spécialité</span>
          <select
            value={specialite}
            onChange={(e) => setSpecialite(e.target.value)}
            className="w-full border-[1.5px] border-encre bg-papier px-4 py-3 sm:w-60"
          >
            <option value="">Toutes les spécialités</option>
            {specialites.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-6 font-bold" aria-live="polite">
        {resultats.length} membre{resultats.length > 1 ? "s" : ""}
      </p>

      {resultats.length === 0 ? (
        <p className="mt-6 border border-dashed border-encre p-8 text-center">
          Aucun membre ne correspond à cette recherche. Essayez un autre nom ou retirez le filtre de
          spécialité.
        </p>
      ) : (
        <ul className="mt-6 grid gap-x-10 gap-y-10 md:grid-cols-2">
          {resultats.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/membres/${m.slug}`}
                className="group flex h-full items-start gap-5"
              >
                <Portrait nom={m.nom} photo={m.photo} />
                <div className="min-w-0">
                  <p className="font-titre text-2xl leading-tight group-hover:text-brun">{m.nom}</p>
                  {m.fonction && (
                    <p className="mt-1 inline-block border border-encre bg-moutarde px-2 py-0.5 text-sm">
                      {m.fonction}
                    </p>
                  )}
                  <p className="mt-1 font-bold">
                    {m.titre}, {m.organisation}
                    {m.promotion && ` (promotion ${m.promotion})`}
                  </p>
                  <p className="mt-2 leading-relaxed">{m.resume}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
