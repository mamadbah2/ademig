import type { Metadata } from "next";
import Link from "next/link";
import { AccesRefusePage, TitrePage } from "@/components/admin/ui";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulairePartenaire } from "../formulaire";

export const metadata: Metadata = { title: "Nouveau partenaire" };

export default async function NouveauPartenaire() {
  const session = await exigerSession();
  if (!aLeRole(session.role, "editeur")) return <AccesRefusePage />;
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/partenaires" className="underline underline-offset-4">
          ← Partenaires
        </Link>
      </p>
      <TitrePage>Nouveau partenaire</TitrePage>
      <FormulairePartenaire />
    </>
  );
}
