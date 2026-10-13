import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { db } from "@/db";
import { verifierJeton } from "@/db/operations/invitations";
import { Cadre } from "@/components/ui";
import { FormulaireActivation } from "./formulaire";

export const metadata: Metadata = { title: "Activer mon compte" };

const lien = "font-bold underline underline-offset-4";

export default async function Activer({
  searchParams,
}: PageProps<"/espace-membre/activer">) {
  const { jeton } = await searchParams;
  const etat =
    typeof jeton === "string" && jeton
      ? await verifierJeton(db, jeton)
      : { ok: false as const, raison: "inconnu" as const };

  if (!etat.ok) {
    return (
      <Cadre as="div" className="mx-auto max-w-xl">
        <h1 className="font-titre text-4xl sm:text-5xl">Activer mon compte</h1>
        <div className="mt-6 space-y-4">{messageLien(etat.raison)}</div>
      </Cadre>
    );
  }

  return (
    <Cadre as="div" className="mx-auto max-w-xl">
      <h1 className="font-titre text-4xl sm:text-5xl">Bienvenue, {etat.nom}</h1>
      <p className="mt-4">
        Choisissez le mot de passe de votre compte <strong>{etat.email}</strong>
        . Vous serez ensuite connecté à votre espace membre.
      </p>
      <FormulaireActivation jeton={jeton as string} />
    </Cadre>
  );
}

function messageLien(raison: "inconnu" | "expire" | "utilise"): ReactNode {
  const contact = (
    <p>
      Une question ?{" "}
      <Link href="/contact" className={lien}>
        Contactez le bureau
      </Link>
      .
    </p>
  );
  if (raison === "expire") {
    return (
      <>
        <p>
          Ce lien a expiré (il est valable 30 jours). Demandez au bureau de vous
          en envoyer un nouveau.
        </p>
        {contact}
      </>
    );
  }
  if (raison === "utilise") {
    return (
      <>
        <p>
          Ce lien a déjà servi : votre compte est activé.{" "}
          <Link href="/connexion" className={lien}>
            Connectez-vous
          </Link>{" "}
          ou demandez un nouveau lien au bureau.
        </p>
        {contact}
      </>
    );
  }
  return (
    <>
      <p>
        Lien inconnu : vérifiez que vous avez copié l&apos;adresse en entier, ou
        demandez un nouveau lien au bureau.
      </p>
      {contact}
    </>
  );
}
