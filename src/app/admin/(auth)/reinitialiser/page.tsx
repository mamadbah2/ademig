import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireReinitialisation } from "./formulaire";

export const metadata: Metadata = { title: "Choisir un mot de passe" };

export default async function Reinitialiser({ searchParams }: PageProps<"/admin/reinitialiser">) {
  const { token, error, espace } = await searchParams;
  const jeton = typeof token === "string" ? token : null;
  const nouveauLien = espace === "membre" ? "/admin/mot-de-passe-oublie?espace=membre" : "/admin/mot-de-passe-oublie";
  return (
    <>
      <h1 className="font-titre text-3xl">Choisir un mot de passe</h1>
      {jeton && !error ? (
        <FormulaireReinitialisation token={jeton} nouveauLien={nouveauLien} />
      ) : (
        <LienInvalide nouveauLien={nouveauLien} />
      )}
    </>
  );
}

function LienInvalide({ nouveauLien }: { nouveauLien: string }) {
  return (
    <div className="mt-4 space-y-4">
      <p>Ce lien n&apos;est plus valable : il a expiré (24 heures) ou a déjà servi.</p>
      <p>
        <Link href={nouveauLien} className="font-bold underline underline-offset-4">
          Demander un nouveau lien
        </Link>
      </p>
    </div>
  );
}
