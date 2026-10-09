import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { lireSession } from "@/lib/session";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Connexion" };

export default async function Connexion() {
  if (await lireSession()) redirect("/admin");
  return (
    <>
      <h1 className="font-titre text-3xl">Connexion</h1>
      <p className="mt-2">Espace réservé au bureau de l&apos;amicale.</p>
      <FormulaireConnexion />
    </>
  );
}
