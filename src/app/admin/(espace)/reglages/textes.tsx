"use client";

import { useState } from "react";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Badge, Bouton, Champ, ZoneTexte } from "@/components/admin/ui";
import { enregistrerTextes } from "@/lib/admin/reglages";
import { CLES_TEXTES, type CleTexte, fusionnerTextes, normaliserTexte, TEXTES } from "@/lib/content/textes";

const GROUPES = [...new Set(CLES_TEXTES.map((cle) => TEXTES[cle].groupe))];

// Chaque champ montre le texte affiché sur le site ; un texte égal à l'origine, ou vide, n'est pas stocké.
export function FormulaireTextes({ textes, version: versionInitiale }: { textes: Record<string, string>; version: string | null }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(enregistrerTextes);
  const [valeurs, setValeurs] = useState(() => fusionnerTextes(textes));
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || versionInitiale;

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="max-w-3xl space-y-10">
      <Alerte resultat={resultat} />
      {version && <input type="hidden" name="version" value={version} />}
      <p>
        Ces textes apparaissent sur les pages Accueil et L&apos;Amicale. Texte brut seulement ; un champ laissé vide
        reprend le texte d&apos;origine.
      </p>
      {GROUPES.map((groupe) => (
        <fieldset key={groupe} className="space-y-8">
          <legend className="font-titre mb-4 text-2xl">{groupe}</legend>
          {CLES_TEXTES.filter((cle) => TEXTES[cle].groupe === groupe).map((cle) => (
            <ChampTexte
              key={cle}
              cle={cle}
              valeur={valeurs[cle]}
              erreurs={erreurs?.[cle]}
              onChange={(valeur) => setValeurs((actuelles) => ({ ...actuelles, [cle]: valeur }))}
            />
          ))}
        </fieldset>
      ))}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}

function ChampTexte({ cle, valeur, erreurs, onChange }: { cle: CleTexte; valeur: string; erreurs?: string[]; onChange: (valeur: string) => void }) {
  const { libelle, forme, max, defaut } = TEXTES[cle];
  const texte = normaliserTexte(cle, valeur);
  const etat = texte === defaut ? "origine" : texte === "" ? "vide" : "modifie";
  const aide = [
    `Jusqu'à ${max} caractères.`,
    etat === "modifie" && `Texte d'origine : ${defaut}`,
    etat === "vide" && "Laissé vide, le texte d'origine sera affiché.",
  ]
    .filter(Boolean)
    .join(" ");
  const id = `texte-${cle.replaceAll(".", "-")}`;

  return (
    <div>
      {forme === "ligne" ? (
        <Champ id={id} label={libelle} name={cle} value={valeur} aide={aide} erreurs={erreurs} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <ZoneTexte id={id} label={libelle} name={cle} value={valeur} aide={aide} erreurs={erreurs} rows={max > 400 ? 6 : 3} onChange={(e) => onChange(e.target.value)} />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {etat === "modifie" && <Badge ton="moutarde">Modifié</Badge>}
        <Bouton
          type="button"
          variante="secondaire"
          disabled={etat === "origine"}
          onClick={() => onChange(defaut)}
          aria-label={`Rétablir le texte d'origine : ${libelle}`}
        >
          Rétablir le texte d&apos;origine
        </Bouton>
      </div>
    </div>
  );
}
