import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { AccesRefusePage, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireCompteDuMembre, lireMembreAdmin } from "@/db/requetes/admin/membres";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulaireMembre } from "../formulaire";
import { EncadreCompte } from "./encadre-compte";

export const metadata: Metadata = { title: "Modifier un membre" };

export default async function ModifierMembre({ params, searchParams }: PageProps<"/admin/membres/[id]">) {
  const session = await exigerSession();
  if (!aLeRole(session.role, "editeur")) return <AccesRefusePage />;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const membre = await lireMembreAdmin(db, id);
  if (!membre) notFound();
  const { cree } = await searchParams;
  // Le suivi des invitations et ses actions sont réservés au super-admin.
  const compte = aLeRole(session.role, "superadmin") ? await lireCompteDuMembre(db, id) : null;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/membres" className="underline underline-offset-4">
          ← Membres
        </Link>
      </p>
      <TitrePage>{membre.nom}</TitrePage>
      {compte && <EncadreCompte compte={compte} nom={membre.nom} />}
      <FormulaireMembre membre={membre} messageInitial={cree ? "Membre ajouté." : undefined} />
    </>
  );
}
