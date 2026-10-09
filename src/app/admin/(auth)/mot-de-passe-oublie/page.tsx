import type { Metadata } from "next";
import { FormulaireMotDePasseOublie } from "./formulaire";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOublie() {
  return (
    <>
      <h1 className="font-titre text-3xl">Mot de passe oublié</h1>
      <p className="mt-2">Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <FormulaireMotDePasseOublie />
    </>
  );
}
