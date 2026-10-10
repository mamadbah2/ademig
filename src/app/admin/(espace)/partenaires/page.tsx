import type { Metadata } from "next";
import Link from "next/link";
import { EtatVide, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerPartenairesAdmin } from "@/db/requetes/admin/partenaires";
import { exigerSession } from "@/lib/session";
import { ListePartenaires } from "./liste";

export const metadata: Metadata = { title: "Partenaires" };

export default async function Partenaires() {
  await exigerSession();
  const lignes = await listerPartenairesAdmin(db);

  return (
    <>
      <TitrePage
        action={
          <Link href="/admin/partenaires/nouveau" className="inline-flex min-h-11 items-center bg-brun px-4 py-2 font-bold text-papier hover:bg-encre focus-visible:outline-3 focus-visible:outline-moutarde">
            Nouveau partenaire
          </Link>
        }
      >
        Partenaires
      </TitrePage>
      <p className="mb-4">L&apos;ordre de cette liste est celui de la page Partenaires du site.</p>
      {lignes.length === 0 ? <EtatVide>Aucun partenaire pour le moment.</EtatVide> : <ListePartenaires lignes={lignes} />}
    </>
  );
}
