"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { messageConnexion } from "@/lib/admin/messages";
import { authClient } from "@/lib/auth-client";
import { retourValide } from "@/lib/membres/retour";
import { destinationApresConnexion, type Role } from "@/lib/roles";

// Formulaire commun à /connexion (site) et /admin/connexion. `retour` n'est suivi que sur le site.
export function FormulaireConnexion({
  variante,
  retour,
}: {
  variante: "site" | "admin";
  retour?: string;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const donnees = new FormData(evenement.currentTarget);
    const { data, error } = await authClient.signIn.email({
      email: String(donnees.get("email")).trim().toLowerCase(),
      password: String(donnees.get("password")),
    });
    if (error || !data) {
      setErreur(messageConnexion(error?.status ?? 401));
      setEnvoi(false);
      return;
    }
    const suite =
      (variante === "site" ? retourValide(retour) : null) ??
      destinationApresConnexion(data.user.role as Role);
    router.push(suite);
    router.refresh();
  }

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-5">
      <Alerte resultat={erreur ? { ok: false, message: erreur } : null} />
      <Champ
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Champ
        label="Mot de passe"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Bouton type="submit" disabled={envoi} className="w-full">
        {envoi ? "Connexion…" : "Se connecter"}
      </Bouton>
      <p className="text-center">
        <Link
          href={variante === "site" ? "/admin/mot-de-passe-oublie?espace=membre" : "/admin/mot-de-passe-oublie"}
          className="underline underline-offset-4"
        >
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
