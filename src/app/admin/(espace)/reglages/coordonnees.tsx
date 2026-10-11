"use client";

import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { enregistrerCoordonnees } from "@/lib/admin/reglages";
import type { Contact } from "@/lib/content/types";

export function FormulaireCoordonnees({ contact, version: versionInitiale }: { contact: Contact; version: string | null }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(enregistrerCoordonnees);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || versionInitiale;

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <Alerte resultat={resultat} />
      {version && <input type="hidden" name="version" value={version} />}
      <Champ
        label="Email de contact"
        name="email"
        type="email"
        defaultValue={contact.email}
        aide="Affiché dans l'en-tête, le pied de page et la page Contact."
        erreurs={erreurs?.email}
        required
      />
      <Champ label="Téléphone" name="telephone" type="tel" defaultValue={contact.phone ?? ""} aide="Facultatif." erreurs={erreurs?.telephone} />
      <fieldset className="space-y-4 border-[1.5px] border-encre p-4">
        <legend className="px-1 font-bold">Contact presse</legend>
        <Champ label="Nom du contact presse" name="presseNom" defaultValue={contact.press.name} erreurs={erreurs?.presseNom} required />
        <Champ label="Téléphone du contact presse" name="presseTelephone" type="tel" defaultValue={contact.press.phone} erreurs={erreurs?.presseTelephone} required />
      </fieldset>
      <fieldset className="space-y-4 border-[1.5px] border-encre p-4">
        <legend className="px-1 font-bold">Adresse</legend>
        <Champ label="Rue" name="rue" defaultValue={contact.address.street} erreurs={erreurs?.rue} required />
        <Champ label="Boîte postale" name="boitePostale" defaultValue={contact.address.postalBox} erreurs={erreurs?.boitePostale} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label="Ville" name="ville" defaultValue={contact.address.city} erreurs={erreurs?.ville} required />
          <Champ label="Pays" name="pays" defaultValue={contact.address.country} erreurs={erreurs?.pays} required />
        </div>
      </fieldset>
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}
