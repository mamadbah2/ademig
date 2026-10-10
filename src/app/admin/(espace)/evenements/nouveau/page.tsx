import type { Metadata } from "next";
import Link from "next/link";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { suggestionsPartenaires } from "@/db/requetes/admin/evenements";
import { exigerSession } from "@/lib/session";
import { FormulaireEvenement } from "../formulaire";

export const metadata: Metadata = { title: "Nouvel événement" };

export default async function NouvelEvenement() {
  await exigerSession();
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
