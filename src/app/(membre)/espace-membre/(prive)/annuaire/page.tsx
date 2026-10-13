import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { listerAnnuaire, PAR_PAGE_ANNUAIRE, type FiltreAnnuaire } from "@/db/requetes/annuaire";
import { Bouton, Champ, Selection } from "@/components/admin/ui";
import { Portrait } from "@/components/portrait";
import { Cadre } from "@/components/ui";
import { lireFiltreAnnuaire, urlAnnuaire } from "@/lib/annuaire-filtre";
import { exigerMembre } from "@/lib/session";

export const metadata: Metadata = { title: "Annuaire" };

const base = "/espace-membre/annuaire";

function Pagination({ filtre, total }: { filtre: FiltreAnnuaire; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE_ANNUAIRE));
  if (pages === 1) return null;
  const lien = "inline-flex min-h-11 items-center border-[1.5px] border-encre px-4 font-bold hover:bg-sable";
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center gap-3">
      {filtre.page > 1 && (
        <Link href={urlAnnuaire(filtre, filtre.page - 1)} className={lien}>
          ← Précédente
        </Link>
      )}
      <p>
        Page {filtre.page} sur {pages}
      </p>
      {filtre.page < pages && (
        <Link href={urlAnnuaire(filtre, filtre.page + 1)} className={lien}>
          Suivante →
        </Link>
      )}
    </nav>
  );
}

export default async function Annuaire({ searchParams }: PageProps<"/espace-membre/annuaire">) {
  // Un compte d'administration sans fiche voit l'annuaire aussi : le bureau en a besoin.
  await exigerMembre();
  const filtre = lireFiltreAnnuaire(await searchParams);
  const { fiches, total, promotions, specialites } = await listerAnnuaire(db, filtre);

  return (
    <Cadre as="div">
      <h1 className="font-titre text-4xl text-marine sm:text-5xl">Annuaire</h1>
      <p className="mt-2">
        {total} membre{total > 1 ? "s" : ""}
      </p>

      <form role="search" method="get" action={base} className="mt-6 flex flex-wrap items-end gap-3">
        <Champ label="Rechercher" name="q" type="search" defaultValue={filtre.q} className="w-full sm:max-w-xs" />
        <Selection
          label="Promotion"
          name="promotion"
          defaultValue={filtre.promotion?.toString() ?? ""}
          options={[{ valeur: "", libelle: "Toutes" }, ...promotions.map((p) => ({ valeur: String(p), libelle: String(p) }))]}
        />
        <Selection
          label="Spécialité"
          name="specialite"
          defaultValue={filtre.specialite ?? ""}
          options={[{ valeur: "", libelle: "Toutes" }, ...specialites.map((s) => ({ valeur: s, libelle: s }))]}
        />
        <Bouton type="submit" variante="secondaire">
          Filtrer
        </Bouton>
      </form>

      {fiches.length === 0 ? (
        <p className="mt-8 font-bold">Aucun membre ne correspond à votre recherche.</p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {fiches.map((f) => (
            <li key={f.slug} className="flex gap-4 border-[1.5px] border-encre bg-papier/70 p-4">
              <Portrait nom={f.nom} photo={f.photo ?? undefined} />
              <div className="min-w-0 flex-1">
                <h2 className="font-titre text-xl text-marine">{f.nom}</h2>
                <p className="text-sm font-bold">
                  {f.promotion !== null ? `Promotion ${f.promotion} · ` : ""}
                  {f.specialite}
                </p>
                {(f.organisation || f.ville) && (
                  <p className="mt-1 text-sm">{[f.organisation, f.ville].filter(Boolean).join(" · ")}</p>
                )}
                {f.linkedin && (
                  <a
                    href={f.linkedin}
                    target="_blank"
                    rel="noopener"
                    className="mt-3 inline-flex min-h-11 items-center border-[1.5px] border-encre bg-papier px-3 text-sm font-bold hover:bg-sable focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-moutarde"
                  >
                    LinkedIn
                    <span className="sr-only"> de {f.nom} (nouvel onglet)</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Pagination filtre={filtre} total={total} />
    </Cadre>
  );
}
