import type { Metadata } from "next";
import { Cadre } from "@/components/ui";
import { exigerMembre } from "@/lib/session";
import { FormulaireMotDePasse } from "@/app/admin/(espace)/mon-compte/formulaires";

export const metadata: Metadata = { title: "Mot de passe" };

export default async function MotDePasse() {
  await exigerMembre();
  return (
    <Cadre as="div" className="mx-auto max-w-xl">
      <h1 className="font-titre text-4xl text-marine sm:text-5xl">Mot de passe</h1>
      <p className="mt-4">Vos autres appareils seront déconnectés après le changement.</p>
      <FormulaireMotDePasse />
    </Cadre>
  );
}
