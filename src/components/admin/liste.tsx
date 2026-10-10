import Link from "next/link";
import { type Filtre, urlListe } from "@/lib/admin/filtre";
import { PAR_PAGE } from "@/db/requetes/admin/commun";
import { Bouton, Champ, Selection } from "./ui";

export function FiltresListe({ base, filtre, avecStatut = true }: { base: string; filtre: Filtre; avecStatut?: boolean }) {
  return (
    <form role="search" action={base} className="mb-6 flex flex-wrap items-end gap-3">
      <Champ label="Rechercher" name="q" type="search" defaultValue={filtre.q} className="w-full max-w-sm" />
      {avecStatut && (
        <Selection
          label="Statut"
          name="statut"
          defaultValue={filtre.statut ?? ""}
          options={[
            { valeur: "", libelle: "Tous" },
            { valeur: "publie", libelle: "Publiés" },
            { valeur: "brouillon", libelle: "Brouillons" },
          ]}
        />
      )}
      <Bouton type="submit" variante="secondaire">
        Filtrer
      </Bouton>
    </form>
  );
}

export function Pagination({ base, filtre, total }: { base: string; filtre: Filtre; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  if (pages === 1) return null;
  const lien = "inline-flex min-h-11 items-center border-[1.5px] border-encre px-4 font-bold hover:bg-sable";
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center gap-3">
      {filtre.page > 1 && (
        <Link href={urlListe(base, filtre, filtre.page - 1)} className={lien}>
          ← Précédente
        </Link>
      )}
      <p>
        Page {filtre.page} sur {pages}
      </p>
      {filtre.page < pages && (
        <Link href={urlListe(base, filtre, filtre.page + 1)} className={lien}>
          Suivante →
        </Link>
      )}
    </nav>
  );
}
