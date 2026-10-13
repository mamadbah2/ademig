import type { Metadata } from "next";
import Link from "next/link";
import { AccesRefusePage, TitrePage } from "@/components/admin/ui";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulaireImport } from "./formulaire";

export const metadata: Metadata = { title: "Importer des membres" };

export default async function ImporterMembres() {
  const session = await exigerSession();
  if (!aLeRole(session.role, "superadmin")) return <AccesRefusePage />;
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/membres" className="underline underline-offset-4">
          ← Membres
        </Link>
      </p>
      <TitrePage>Importer des membres</TitrePage>
      <FormulaireImport />
    </>
  );
}
