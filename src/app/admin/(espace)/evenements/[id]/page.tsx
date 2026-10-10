import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireEvenementAdmin, suggestionsPartenaires } from "@/db/requetes/admin/evenements";
import { exigerSession } from "@/lib/session";
import { FormulaireEvenement } from "../formulaire";

export const metadata: Metadata = { title: "Modifier un événement" };

export default async function ModifierEvenement({ params, searchParams }: PageProps<"/admin/evenements/[id]">) {
  await exigerSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [evenement, suggestions] = await Promise.all([lireEvenementAdmin(db, id), suggestionsPartenaires(db)]);
  if (!evenement) notFound();
  const { cree } = await searchParams;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/evenements" className="underline underline-offset-4">
          ← Événements
        </Link>
      </p>
      <TitrePage>{evenement.titre}</TitrePage>
      <FormulaireEvenement evenement={evenement} suggestions={suggestions} messageInitial={cree ? "Événement créé." : undefined} />
    </>
  );
}
