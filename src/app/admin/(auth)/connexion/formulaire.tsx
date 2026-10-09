"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { messageConnexion } from "@/lib/admin/messages";
import { authClient } from "@/lib/auth-client";

export function FormulaireConnexion() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const donnees = new FormData(evenement.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(donnees.get("email")).trim().toLowerCase(),
      password: String(donnees.get("password")),
    });
    if (error) {
      setErreur(messageConnexion(error.status));
      setEnvoi(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-5">
      <Alerte resultat={erreur ? { ok: false, message: erreur } : null} />
      <Champ label="Email" name="email" type="email" autoComplete="email" required />
      <Champ label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
      <Bouton type="submit" disabled={envoi} className="w-full">
        {envoi ? "Connexion…" : "Se connecter"}
      </Bouton>
      <p className="text-center">
        <Link href="/admin/mot-de-passe-oublie" className="underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
