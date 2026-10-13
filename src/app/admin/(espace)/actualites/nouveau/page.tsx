import type { Metadata } from "next";
import Link from "next/link";
import { AccesRefusePage, TitrePage } from "@/components/admin/ui";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulaireActualite } from "../formulaire";

export const metadata: Metadata = { title: "Nouvelle actualité" };

export default async function NouvelleActualite() {
  const session = await exigerSession();
  if (!aLeRole(session.role, "editeur")) return <AccesRefusePage />;
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/actualites" className="underline underline-offset-4">
          ← Actualités
        </Link>
      </p>
      <TitrePage>Nouvelle actualité</TitrePage>
      <FormulaireActualite />
    </>
  );
}
