"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { messageChangementMotDePasse } from "@/lib/admin/messages";
import { authClient } from "@/lib/auth-client";

type Retour = { ok: boolean; message: string } | null;

export function FormulaireNom({ nom }: { nom: string }) {
  const router = useRouter();
  const [retour, setRetour] = useState<Retour>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const nouveau = String(new FormData(evenement.currentTarget).get("nom")).trim();
    if (nouveau.length < 2) return setRetour({ ok: false, message: "Indiquez le prénom et le nom." });
    setEnvoi(true);
    const { error } = await authClient.updateUser({ name: nouveau });
    setEnvoi(false);
    setRetour(error ? { ok: false, message: "Le nom n'a pas pu être enregistré." } : { ok: true, message: "Nom enregistré." });
    if (!error) router.refresh();
  }

  return (
    <form onSubmit={soumettre} className="mt-4 space-y-5">
      <Alerte resultat={retour} />
      <Champ label="Prénom et nom" name="nom" defaultValue={nom} autoComplete="name" required />
      <Bouton type="submit" disabled={envoi}>
        {envoi ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}

export function FormulaireMotDePasse() {
  const [retour, setRetour] = useState<Retour>(null);
  const [erreurs, setErreurs] = useState<{ nouveau?: string[]; confirmation?: string[] }>({});
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const formulaire = evenement.currentTarget;
    const donnees = new FormData(formulaire);
    const nouveau = String(donnees.get("nouveau"));
    if (nouveau.length < 12) return setErreurs({ nouveau: ["12 caractères minimum."] });
    if (nouveau !== String(donnees.get("confirmation"))) {
      return setErreurs({ confirmation: ["Les deux mots de passe diffèrent."] });
    }
    setErreurs({});
    setEnvoi(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(donnees.get("actuel")),
      newPassword: nouveau,
      // Les autres appareils connectés sont déconnectés.
      revokeOtherSessions: true,
    });
    setEnvoi(false);
    if (error) return setRetour({ ok: false, message: messageChangementMotDePasse(error.code) });
    formulaire.reset();
    setRetour({ ok: true, message: "Mot de passe changé. Vos autres appareils ont été déconnectés." });
  }

  return (
    <form onSubmit={soumettre} className="mt-4 space-y-5">
      <Alerte resultat={retour} />
      <Champ label="Mot de passe actuel" name="actuel" type="password" autoComplete="current-password" required />
      <Champ
        label="Nouveau mot de passe"
        name="nouveau"
        type="password"
        autoComplete="new-password"
        aide="12 caractères minimum."
        erreurs={erreurs.nouveau}
        required
      />
      <Champ
        label="Confirmer le nouveau mot de passe"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        erreurs={erreurs.confirmation}
        required
      />
      <Bouton type="submit" disabled={envoi}>
        {envoi ? "Enregistrement…" : "Changer le mot de passe"}
      </Bouton>
    </form>
  );
}
