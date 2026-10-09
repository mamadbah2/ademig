"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { messageConnexion } from "@/lib/admin/messages";
import { authClient } from "@/lib/auth-client";

export function FormulaireMotDePasseOublie() {
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setEnvoi(true);
    const email = String(new FormData(evenement.currentTarget).get("email")).trim().toLowerCase();
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/admin/reinitialiser" });
    setEnvoi(false);
    // Même réponse que le compte existe ou non : on ne révèle pas les adresses enregistrées.
    setResultat(
      error?.status === 429
        ? { ok: false, message: messageConnexion(429) }
        : {
            ok: true,
            message: "Si un compte correspond à cette adresse, un email vient de partir. Le lien est valable 24 heures.",
          },
    );
  }

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-5">
      <Alerte resultat={resultat} />
      <Champ label="Email" name="email" type="email" autoComplete="email" required />
      <Bouton type="submit" disabled={envoi} className="w-full">
        {envoi ? "Envoi…" : "Recevoir le lien"}
      </Bouton>
      <p className="text-center">
        <Link href="/admin/connexion" className="underline underline-offset-4">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
