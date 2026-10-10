import type { Metadata } from "next";
import Link from "next/link";
import { FiltresListe, Pagination } from "@/components/admin/liste";
import { Badge, EtatVide, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerActualitesAdmin } from "@/db/requetes/admin/actualites";
import { lireFiltre } from "@/lib/admin/filtre";
import { formatDate } from "@/components/ui";
import { exigerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Actualités" };

const BASE = "/admin/actualites";

export default async function Actualites({ searchParams }: PageProps<"/admin/actualites">) {
  await exigerSession();
  const filtre = lireFiltre(await searchParams);
  const { lignes, total } = await listerActualitesAdmin(db, filtre);

  return (
    <>
      <TitrePage
        action={
          <Link href={`${BASE}/nouveau`} className="inline-flex min-h-11 items-center bg-brun px-4 py-2 font-bold text-papier hover:bg-encre focus-visible:outline-3 focus-visible:outline-moutarde">
            Nouvelle actualité
          </Link>
        }
      >
        Actualités
      </TitrePage>
      <FiltresListe base={BASE} filtre={filtre} />
      {lignes.length === 0 ? (
        <EtatVide>{filtre.q || filtre.statut ? "Aucune actualité ne correspond." : "Aucune actualité pour le moment."}</EtatVide>
      ) : (
        <ul className="divide-y divide-encre/30 border-y-[1.5px] border-encre">
          {lignes.map((a) => (
            <li key={a.id}>
              <Link href={`${BASE}/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 hover:bg-sable focus-visible:outline-3 focus-visible:outline-moutarde">
                <span className="min-w-0 flex-1 font-bold">{a.titre}</span>
                <span className="text-sm">{formatDate(a.date)}</span>
                <Badge ton={a.statut === "publie" ? "vert" : "moutarde"}>{a.statut === "publie" ? "Publié" : "Brouillon"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination base={BASE} filtre={filtre} total={total} />
    </>
  );
}
