"use client";

import { useMemo, useState } from "react";
import type { Alumni } from "@/lib/content/types";

function normaliser(texte: string) {
  return texte.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

const CHAMP = "w-full border-[1.5px] border-encre bg-papier px-4 py-3";

export function AnnuaireAlumni({ alumni }: { alumni: Alumni[] }) {
  const [recherche, setRecherche] = useState("");
  const [promotion, setPromotion] = useState("");
  const [domaine, setDomaine] = useState("");

  const promotions = useMemo(() => [...new Set(alumni.map((a) => a.promotion))], [alumni]);
  const domaines = useMemo(() => [...new Set(alumni.flatMap((a) => a.domaines))].sort((a, b) => a.localeCompare(b, "fr")), [alumni]);

  const q = normaliser(recherche.trim());
  const resultats = alumni.filter((a) => {
    if (promotion && a.promotion !== Number(promotion)) return false;
    if (domaine && !a.domaines.includes(domaine)) return false;
    return !q || normaliser([a.nom, a.poste, a.structure, ...a.domaines].filter(Boolean).join(" ")).includes(q);
  });

  // La liste arrive triée par promotion, de la plus récente à la plus ancienne.
  const groupes = new Map<number, Alumni[]>();
  for (const a of resultats) groupes.set(a.promotion, [...(groupes.get(a.promotion) ?? []), a]);

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <label className="flex-1">
          <span className="sr-only">Rechercher un alumni</span>
          <input
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, poste, entreprise…"
            className={`${CHAMP} placeholder:text-encre/60`}
          />
        </label>
        <label>
          <span className="sr-only">Filtrer par promotion</span>
          <select value={promotion} onChange={(e) => setPromotion(e.target.value)} className={`${CHAMP} lg:w-52`}>
            <option value="">Toutes les promotions</option>
            {promotions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrer par domaine</span>
          <select value={domaine} onChange={(e) => setDomaine(e.target.value)} className={`${CHAMP} lg:w-60`}>
            <option value="">Tous les domaines</option>
            {domaines.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-6 font-bold" aria-live="polite">
        {resultats.length} alumni
      </p>

      {resultats.length === 0 ? (
        <p className="mt-6 border border-dashed border-encre p-8 text-center">
          Aucun alumni ne correspond à cette recherche. Essayez un autre nom ou retirez les filtres.
        </p>
      ) : (
        [...groupes].map(([annee, personnes]) => (
          <section key={annee} className="mt-10" aria-labelledby={`promotion-${annee}`}>
            <h2 id={`promotion-${annee}`} className="border-b-[1.5px] border-encre pb-2 font-display text-2xl text-marine">
              Promotion {annee}
              <span className="ml-3 text-base font-normal text-encre">{personnes[0].promotionOrdre} promotion</span>
            </h2>
            <ul className="mt-4 grid gap-x-10 gap-y-5 md:grid-cols-2">
              {personnes.map((a) => (
                <li key={a.numero}>
                  <p className="font-bold">
                    {a.nom}
                    {a.decede && <span className="font-normal"> (décédé)</span>}
                  </p>
                  {(a.poste || a.structure) && <p>{[a.poste, a.structure].filter(Boolean).join(", ")}</p>}
                  {a.domaines.length > 0 && <p className="text-sm text-encre/75">{a.domaines.join(" · ")}</p>}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
