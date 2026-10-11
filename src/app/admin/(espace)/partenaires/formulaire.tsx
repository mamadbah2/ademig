"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChampMedia } from "@/components/admin/champs/champ-media";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Bouton, Champ, Selection, ZoneTexte } from "@/components/admin/ui";
import type { PartenaireAdmin } from "@/db/requetes/admin/partenaires";
import { creerPartenaire, enregistrerPartenaire, supprimerPartenaireAction } from "@/lib/admin/partenaires";
import type { Resultat } from "@/lib/admin/resultat";

const CATEGORIES = ["Institution", "Entreprise", "Événement"].map((c) => ({ valeur: c, libelle: c }));

export function FormulairePartenaire({ partenaire, messageInitial }: { partenaire?: PartenaireAdmin; messageInitial?: string }) {
  const router = useRouter();
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(
    partenaire ? enregistrerPartenaire.bind(null, partenaire.id) : creerPartenaire,
  );
  const [suppression, setSuppression] = useState<Resultat | null>(null);
  const [suppressionEnCours, demarrer] = useTransition();
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || partenaire?.version;
  const message = resultat ?? suppression ?? (messageInitial ? { ok: true as const, message: messageInitial } : null);

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="space-y-6">
      <Alerte resultat={message} />
      {version && <input type="hidden" name="version" value={version} />}
      <Champ label="Nom" name="nom" defaultValue={partenaire?.nom} erreurs={erreurs?.nom} required />
      <Selection label="Catégorie" name="categorie" options={CATEGORIES} defaultValue={partenaire?.categorie ?? "Institution"} erreurs={erreurs?.categorie} />
      <ZoneTexte label="Description" name="description" defaultValue={partenaire?.description} aide="Une ou deux phrases, affichées sur la page Partenaires." erreurs={erreurs?.description} />
      <Champ label="Site web" name="url" type="url" defaultValue={partenaire?.url} aide="Facultatif. Adresse complète, avec https://." erreurs={erreurs?.url} />
      <ChampMedia libelle="Logo" name="logoId" valeurInitiale={partenaire?.logo ?? null} erreurs={erreurs?.logoId} />
      <label className="flex min-h-11 items-center gap-3 font-bold">
        <input type="checkbox" name="visible" defaultChecked={partenaire?.visible ?? true} className="size-5 accent-brun" />
        Visible sur le site
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Bouton type="submit" disabled={enCours || suppressionEnCours}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
        {partenaire && (
          <BoutonConfirmation
            libelle="Supprimer le partenaire"
            question="Supprimer définitivement ce partenaire ? Son logo reste dans la médiathèque."
            confirmer="Supprimer"
            disabled={enCours || suppressionEnCours}
            onConfirmer={() =>
              demarrer(async () => {
                const r = await supprimerPartenaireAction(partenaire.id);
                if (r.ok) router.push("/admin/partenaires");
                else setSuppression(r);
              })
            }
          />
        )}
      </div>
    </form>
  );
}
