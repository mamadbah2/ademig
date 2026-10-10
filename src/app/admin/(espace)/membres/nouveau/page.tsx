import type { Metadata } from "next";
import Link from "next/link";
import { TitrePage } from "@/components/admin/ui";
import { exigerSession } from "@/lib/session";
import { FormulaireMembre } from "../formulaire";

export const metadata: Metadata = { title: "Nouveau membre" };

export default async function NouveauMembre() {
  await exigerSession();
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/membres" className="underline underline-offset-4">
          ← Membres
        </Link>
      </p>
      <TitrePage>Nouveau membre</TitrePage>
      <FormulaireMembre />
    </>
  );
}
