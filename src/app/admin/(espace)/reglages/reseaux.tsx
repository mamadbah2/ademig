"use client";

import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { enregistrerReseaux } from "@/lib/admin/reglages";
import type { Reseau } from "@/lib/content/types";

export function FormulaireReseaux({ reseaux, version: versionInitiale }: { reseaux: Reseau[]; version: string | null }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(enregistrerReseaux);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || versionInitiale;

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      <Alerte resultat={resultat} />
      {version && <input type="hidden" name="version" value={version} />}
      <p>
        L&apos;ordre de cette liste est celui des liens du pied de page et de la page Contact. Chaque adresse commence par
        https://.
      </p>
      <ListeEditable
        libelle="Réseaux sociaux"
        name="reseaux"
        valeurInitiale={reseaux}
        nouvelElement={() => ({ label: "", url: "" })}
        libelleAjout="Ajouter un réseau"
        erreurs={erreurs?.reseaux}
        rendu={(r, modifier, _i, idElement) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`${idElement}-label`} label="Nom du réseau" name={`${idElement}-label`} form="" value={r.label} onChange={(e) => modifier({ label: e.target.value })} />
            <Champ id={`${idElement}-url`} label="Adresse" name={`${idElement}-url`} form="" type="url" value={r.url} onChange={(e) => modifier({ url: e.target.value })} />
          </div>
        )}
      />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}
