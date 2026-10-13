import type { Metadata } from "next";
import { FormulaireMotDePasseOublie } from "./formulaire";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default async function MotDePasseOublie({ searchParams }: PageProps<"/admin/mot-de-passe-oublie">) {
  // Arrivée depuis /connexion (espace membre) : retour et lien reçu ramènent vers les pages des membres.
  const membre = (await searchParams).espace === "membre";
  return (
    <>
      <h1 className="font-titre text-3xl">Mot de passe oublié</h1>
      <p className="mt-2">Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <FormulaireMotDePasseOublie membre={membre} />
    </>
  );
}
