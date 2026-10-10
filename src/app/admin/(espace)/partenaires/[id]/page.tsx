import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lirePartenaireAdmin } from "@/db/requetes/admin/partenaires";
import { exigerSession } from "@/lib/session";
import { FormulairePartenaire } from "../formulaire";

export const metadata: Metadata = { title: "Modifier un partenaire" };

export default async function ModifierPartenaire({ params, searchParams }: PageProps<"/admin/partenaires/[id]">) {
  await exigerSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const partenaire = await lirePartenaireAdmin(db, id);
  if (!partenaire) notFound();
  const { cree } = await searchParams;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/partenaires" className="underline underline-offset-4">
          ← Partenaires
        </Link>
      </p>
      <TitrePage>{partenaire.nom}</TitrePage>
      <FormulairePartenaire partenaire={partenaire} messageInitial={cree ? "Partenaire ajouté." : undefined} />
    </>
  );
}
