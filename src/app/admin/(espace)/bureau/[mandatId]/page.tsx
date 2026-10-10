import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireMandatAdmin } from "@/db/requetes/admin/bureau";
import { optionsMembres } from "@/db/requetes/admin/membres";
import { exigerSession } from "@/lib/session";
import { ActionsMandat } from "./actions-mandat";
import { FormulaireMandat } from "./formulaire";

export const metadata: Metadata = { title: "Modifier un mandat" };

export default async function ModifierMandat({ params, searchParams }: PageProps<"/admin/bureau/[mandatId]">) {
  await exigerSession();
  const { mandatId } = await params;
  if (!z.uuid().safeParse(mandatId).success) notFound();
  const [mandat, membres] = await Promise.all([lireMandatAdmin(db, mandatId), optionsMembres(db)]);
  if (!mandat) notFound();
  const { cree } = await searchParams;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/bureau" className="underline underline-offset-4">
          ← Bureau
        </Link>
      </p>
      <TitrePage>{mandat.libelle}</TitrePage>
      <ActionsMandat id={mandat.id} actif={mandat.actif} />
      <FormulaireMandat mandat={mandat} membres={membres} messageInitial={cree ? "Mandat créé." : undefined} />
    </>
  );
}
