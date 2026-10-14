"use client";

import { useMemo, useState } from "react";
import { CarteMembre, type MembreAnnuaire } from "@/components/carte-membre";

function normaliser(texte: string) {
  return texte.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function AnnuaireMembres({ membres }: { membres: MembreAnnuaire[] }) {
  const [recherche, setRecherche] = useState("");
  const [specialite, setSpecialite] = useState("");

  const specialites = useMemo(
    () => [...new Set(membres.map((m) => m.specialite))].filter((s) => s && s !== "À compléter").sort(),
    [membres],
  );

  const q = normaliser(recherche.trim());
  const resultats = membres.filter((m) => {
    if (specialite && m.specialite !== specialite) return false;
    if (!q) return true;
    const texte = [m.nom, m.titre, m.organisation, m.specialite]
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
            placeholder="Nom, poste, entreprise…"
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
              <CarteMembre membre={m} disposition="ligne" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
