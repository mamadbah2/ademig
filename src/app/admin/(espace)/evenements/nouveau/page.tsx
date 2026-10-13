import type { Metadata } from "next";
import Link from "next/link";
import { AccesRefusePage, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { suggestionsPartenaires } from "@/db/requetes/admin/evenements";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulaireEvenement } from "../formulaire";

export const metadata: Metadata = { title: "Nouvel événement" };

export default async function NouvelEvenement() {
  const session = await exigerSession();
  if (!aLeRole(session.role, "editeur")) return <AccesRefusePage />;
  const suggestions = await suggestionsPartenaires(db);
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/evenements" className="underline underline-offset-4">
          ← Événements
        </Link>
      </p>
      <TitrePage>Nouvel événement</TitrePage>
      <FormulaireEvenement suggestions={suggestions} />
    </>
  );
}
