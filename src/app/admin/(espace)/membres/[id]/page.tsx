import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireMembreAdmin } from "@/db/requetes/admin/membres";
import { exigerSession } from "@/lib/session";
import { FormulaireMembre } from "../formulaire";

export const metadata: Metadata = { title: "Modifier un membre" };

export default async function ModifierMembre({ params, searchParams }: PageProps<"/admin/membres/[id]">) {
  await exigerSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const membre = await lireMembreAdmin(db, id);
  if (!membre) notFound();
  const { cree } = await searchParams;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/membres" className="underline underline-offset-4">
          ← Membres
        </Link>
      </p>
      <TitrePage>{membre.nom}</TitrePage>
      <FormulaireMembre membre={membre} messageInitial={cree ? "Membre ajouté." : undefined} />
    </>
  );
}
