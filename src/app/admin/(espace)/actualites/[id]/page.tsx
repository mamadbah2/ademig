import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireActualiteAdmin } from "@/db/requetes/admin/actualites";
import { exigerSession } from "@/lib/session";
import { FormulaireActualite } from "../formulaire";

export const metadata: Metadata = { title: "Modifier une actualité" };

export default async function ModifierActualite({ params, searchParams }: PageProps<"/admin/actualites/[id]">) {
  await exigerSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const actualite = await lireActualiteAdmin(db, id);
  if (!actualite) notFound();
  const { cree } = await searchParams;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/actualites" className="underline underline-offset-4">
          ← Actualités
        </Link>
      </p>
      <TitrePage>{actualite.titre}</TitrePage>
      <FormulaireActualite actualite={actualite} messageInitial={cree ? "Actualité créée." : undefined} />
    </>
  );
}
