import type { Metadata } from "next";
import Link from "next/link";
import { FiltresListe, Pagination } from "@/components/admin/liste";
import { AccesRefusePage, Badge, EtatVide, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerMembresAdmin } from "@/db/requetes/admin/membres";
import { lireFiltre } from "@/lib/admin/filtre";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Membres" };

const BASE = "/admin/membres";

export default async function Membres({ searchParams }: PageProps<"/admin/membres">) {
  const session = await exigerSession();
  if (!aLeRole(session.role, "editeur")) return <AccesRefusePage />;
  const filtre = lireFiltre(await searchParams);
  const { lignes, total } = await listerMembresAdmin(db, filtre);

  return (
    <>
      <TitrePage
        action={
          <Link href={`${BASE}/nouveau`} className="inline-flex min-h-11 items-center bg-marine px-4 py-2 font-bold text-papier hover:bg-encre focus-visible:outline-3 focus-visible:outline-moutarde">
            Nouveau membre
          </Link>
        }
      >
        Membres
      </TitrePage>
      <FiltresListe base={BASE} filtre={filtre} avecStatut={false} />
      {lignes.length === 0 ? (
        <EtatVide>{filtre.q ? "Aucun membre ne correspond." : "Aucun membre pour le moment."}</EtatVide>
      ) : (
        <ul className="divide-y divide-encre/30 border-y-[1.5px] border-encre">
          {lignes.map((m) => (
            <li key={m.id}>
              <Link href={`${BASE}/${m.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 hover:bg-sable focus-visible:outline-3 focus-visible:outline-moutarde">
                <span className="min-w-0 flex-1 font-bold">{m.nom}</span>
                <span className="text-sm">{m.titre}</span>
                {m.fonction && <span className="text-sm">{m.fonction}</span>}
                <Badge ton={m.visible ? "vert" : "moutarde"}>{m.visible ? "Visible" : "Masqué"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination base={BASE} filtre={filtre} total={total} />
    </>
  );
}
