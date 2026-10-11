import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EtatVide, TitrePage } from "@/components/admin/ui";
import { formatDate } from "@/components/ui";
import { db } from "@/db";
import { listerMandatsAdmin } from "@/db/requetes/admin/bureau";
import { exigerSession } from "@/lib/session";
import { FormulaireNouveauMandat } from "./nouveau-mandat";

export const metadata: Metadata = { title: "Bureau" };

export default async function Bureau() {
  await exigerSession();
  const mandats = await listerMandatsAdmin(db);

  return (
    <>
      <TitrePage>Bureau</TitrePage>
      <p className="mb-6">Le mandat en place est celui de la page Bureau du site. Les anciens mandats restent consultables ici.</p>
      {mandats.length === 0 ? (
        <EtatVide>Aucun mandat pour le moment.</EtatVide>
      ) : (
        <ul className="divide-y divide-encre/30 border-y-[1.5px] border-encre">
          {mandats.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/bureau/${m.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 hover:bg-sable focus-visible:outline-3 focus-visible:outline-moutarde">
                <span className="min-w-0 flex-1 font-bold">{m.libelle}</span>
                <span className="text-sm">Élu le {formatDate(m.dateElection)}</span>
                <span className="text-sm">
                  {m.postes} poste{m.postes > 1 ? "s" : ""}
                </span>
                <Badge ton={m.actif ? "vert" : "neutre"}>{m.actif ? "En place" : "Inactif"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-10">
        <FormulaireNouveauMandat mandatEnPlace={mandats.some((m) => m.actif)} />
      </div>
    </>
  );
}
