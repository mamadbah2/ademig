import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { destinationApresConnexion, lireSession } from "@/lib/session";
import { FormulaireConnexion } from "@/components/connexion";

export const metadata: Metadata = { title: "Connexion" };

export default async function Connexion() {
  const session = await lireSession();
  if (session) redirect(destinationApresConnexion(session.role));
  return (
    <>
      <h1 className="font-titre text-3xl">Connexion</h1>
      <p className="mt-2">Espace réservé au bureau de l&apos;amicale.</p>
      <FormulaireConnexion variante="admin" />
    </>
  );
}
