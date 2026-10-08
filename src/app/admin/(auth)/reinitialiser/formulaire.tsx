"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { authClient } from "@/lib/auth-client";

export function FormulaireReinitialisation({ token }: { token: string }) {
  const [erreurs, setErreurs] = useState<{ motDePasse?: string[]; confirmation?: string[] }>({});
  const [etat, setEtat] = useState<"saisie" | "envoi" | "fait" | "invalide">("saisie");

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    const motDePasse = String(donnees.get("motDePasse"));
    const confirmation = String(donnees.get("confirmation"));
    if (motDePasse.length < 12) return setErreurs({ motDePasse: ["12 caractères minimum."] });
    if (motDePasse !== confirmation) return setErreurs({ confirmation: ["Les deux mots de passe diffèrent."] });
    setErreurs({});
    setEtat("envoi");
    const { error } = await authClient.resetPassword({ newPassword: motDePasse, token });
    setEtat(error ? "invalide" : "fait");
  }

  if (etat === "fait") {
    return (
      <div className="mt-4 space-y-4">
        <Alerte resultat={{ ok: true, message: "Mot de passe enregistré." }} />
        <Link href="/admin/connexion" className="font-bold underline underline-offset-4">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-5">
      {etat === "invalide" && (
        <Alerte
          resultat={{ ok: false, message: "Ce lien n'est plus valable : il a expiré (24 heures) ou a déjà servi." }}
        />
      )}
      <Champ
        label="Nouveau mot de passe"
        name="motDePasse"
        type="password"
        autoComplete="new-password"
        aide="12 caractères minimum. Une phrase de plusieurs mots est facile à retenir."
        erreurs={erreurs.motDePasse}
        required
      />
      <Champ
        label="Confirmer le mot de passe"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        erreurs={erreurs.confirmation}
        required
      />
      <Bouton type="submit" disabled={etat === "envoi"} className="w-full">
        {etat === "envoi" ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
      {etat === "invalide" && (
        <p className="text-center">
          <Link href="/admin/mot-de-passe-oublie" className="font-bold underline underline-offset-4">
            Demander un nouveau lien
          </Link>
        </p>
      )}
    </form>
  );
}
