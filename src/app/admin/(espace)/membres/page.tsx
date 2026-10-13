import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCompte } from "@/components/admin/badge-compte";
import { FiltresListe, Pagination } from "@/components/admin/liste";
import { AccesRefusePage, Badge, EtatVide, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerMembresAdmin } from "@/db/requetes/admin/membres";
import { lireFiltre } from "@/lib/admin/filtre";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { InviterTous } from "./inviter-tous";

export const metadata: Metadata = { title: "Membres" };

const BASE = "/admin/membres";
const lienBouton = "inline-flex min-h-11 items-center px-4 py-2 font-bold focus-visible:outline-3 focus-visible:outline-moutarde";

export default async function Membres({ searchParams }: PageProps<"/admin/membres">) {
  const session = await exigerSession();
  if (!aLeRole(session.role, "editeur")) return <AccesRefusePage />;
  const filtre = lireFiltre(await searchParams);
  const estSuperadmin = aLeRole(session.role, "superadmin");
  const { lignes, total } = await listerMembresAdmin(db, filtre);

  return (
    <>
      <TitrePage
        action={
          <div className="flex flex-wrap gap-3">
            {estSuperadmin && (
              <Link href={`${BASE}/importer`} className={`${lienBouton} border-[1.5px] border-encre bg-papier hover:bg-sable`}>
                Importer des membres
              </Link>
            )}
            <Link href={`${BASE}/nouveau`} className={`${lienBouton} bg-marine text-papier hover:bg-encre`}>
              Nouveau membre
            </Link>
          </div>
        }
      >
        Membres
      </TitrePage>
      {estSuperadmin && (
        <div className="mb-6">
          <InviterTous />
        </div>
      )}
      <FiltresListe base={BASE} filtre={filtre} avecStatut={false} avecCompte />
      {lignes.length === 0 ? (
        <EtatVide>{filtre.q || filtre.compte ? "Aucun membre ne correspond." : "Aucun membre pour le moment."}</EtatVide>
      ) : (
        <ul className="divide-y divide-encre/30 border-y-[1.5px] border-encre">
          {lignes.map((m) => (
            <li key={m.id}>
              <Link href={`${BASE}/${m.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 hover:bg-sable focus-visible:outline-3 focus-visible:outline-moutarde">
                <span className="min-w-0 flex-1 font-bold">{m.nom}</span>
                <span className="text-sm">{m.titre}</span>
                {m.fonction && <span className="text-sm">{m.fonction}</span>}
                {m.suivi && <BadgeCompte suivi={m.suivi} />}
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
