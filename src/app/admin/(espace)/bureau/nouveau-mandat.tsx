"use client";

import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { creerMandatAction } from "@/lib/admin/bureau";

export function FormulaireNouveauMandat({ mandatEnPlace }: { mandatEnPlace: boolean }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(creerMandatAction);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate aria-labelledby="titre-nouveau-mandat" className="space-y-4 border-[1.5px] border-encre p-4">
      <h2 id="titre-nouveau-mandat" className="font-titre text-2xl">
        Nouveau mandat
      </h2>
      <p>Préparez le prochain bureau sans rien changer au site, puis activez-le d&apos;un coup.</p>
      <Alerte resultat={resultat} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label="Libellé" name="libelle" aide="Ex. : Bureau 2027." erreurs={erreurs?.libelle} required />
        <Champ label="Date d'élection" name="dateElection" type="date" erreurs={erreurs?.dateElection} required />
      </div>
      {mandatEnPlace && (
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" name="reprendreCommissions" defaultChecked className="size-5 accent-brun" />
          Reprendre les commissions du mandat en place (noms et missions, sans les membres)
        </label>
      )}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Création…" : "Créer le mandat"}
      </Bouton>
    </form>
  );
}
