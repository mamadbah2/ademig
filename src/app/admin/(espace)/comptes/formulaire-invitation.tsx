"use client";

import { useActionState } from "react";
import { Alerte, Bouton, Champ, Selection } from "@/components/admin/ui";
import { inviterCompte } from "@/lib/admin/comptes";
import { LIBELLES_ROLES, ROLES } from "@/lib/roles";

export function FormulaireInvitation() {
  const [resultat, envoyer, enCours] = useActionState(inviterCompte, null);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  return (
    // La clé remet le formulaire à zéro après une invitation réussie.
    <form key={resultat?.ok ? resultat.message : "saisie"} action={envoyer} className="mt-5 grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Alerte resultat={resultat} />
      </div>
      <Champ label="Prénom et nom" name="nom" autoComplete="off" erreurs={erreurs?.nom} required />
      <Champ label="Email" name="email" type="email" autoComplete="off" erreurs={erreurs?.email} required />
      <Selection
        label="Rôle"
        name="role"
        defaultValue="editeur"
        options={ROLES.map((r) => ({ valeur: r, libelle: LIBELLES_ROLES[r] }))}
        aide="L'éditeur gère le contenu ; le super-admin gère aussi les comptes."
        erreurs={erreurs?.role}
      />
      <div className="flex items-end">
        <Bouton type="submit" disabled={enCours} className="w-full sm:w-auto">
          {enCours ? "Envoi…" : "Envoyer l'invitation"}
        </Bouton>
      </div>
    </form>
  );
}
