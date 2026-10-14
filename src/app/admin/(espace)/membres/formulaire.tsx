"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { ChampMedia } from "@/components/admin/champs/champ-media";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Badge, Bouton, Champ } from "@/components/admin/ui";
import type { MembreAdmin } from "@/db/requetes/admin/membres";
import { creerMembre, enregistrerMembre, supprimerMembreAction } from "@/lib/admin/membres";
import { slugifier } from "@/lib/admin/slug";
import type { Resultat } from "@/lib/admin/resultat";

const ERREUR_IDENTIFIANT = "Un autre membre porte déjà ce nom (ou le nom ne contient ni lettre ni chiffre) : précisez-le, par exemple avec un second prénom.";

export function FormulaireMembre({ membre, messageInitial }: { membre?: MembreAdmin; messageInitial?: string }) {
  const router = useRouter();
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(membre ? enregistrerMembre.bind(null, membre.id) : creerMembre);
  const [nom, setNom] = useState(membre?.nom ?? "");
  const [suppression, setSuppression] = useState<Resultat | null>(null);
  const [suppressionEnCours, demarrer] = useTransition();
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || membre?.version;
  const message = resultat ?? (messageInitial ? { ok: true as const, message: messageInitial } : null);
  const occupe = enCours || suppressionEnCours;

  // Un refus de suppression s'affiche près du bouton, et s'efface au prochain enregistrement.
  function soumettre(e: FormEvent<HTMLFormElement>) {
    setSuppression(null);
    onSubmit(e);
  }

  return (
    <form ref={formulaire} onSubmit={soumettre} noValidate className="space-y-6">
      <Alerte resultat={message} />
      {version && <input type="hidden" name="version" value={version} />}
      <Champ
        label="Nom"
        name="nom"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        aide="Tel qu'affiché sur le site, avec le titre éventuel (ex. : Dr Ibrahima Diao)."
        erreurs={erreurs?.nom ?? (erreurs?.slug && [ERREUR_IDENTIFIANT])}
        required
      />
      {/* Identifiant interne, tiré du nom à la création puis inchangé : il n'y a plus de page par membre. */}
      <input type="hidden" name="slug" value={membre?.slug ?? slugifier(nom)} />
      <p className="text-sm">
        {membre?.fonction ? `Fonction au bureau en place : ${membre.fonction}.` : "Aucune fonction au bureau en place."} Les fonctions se
        modifient dans la rubrique Bureau.
      </p>
      <p className="text-sm">
        Sur le site, une carte affiche le portrait, le nom et le titre ; elle ouvre le profil LinkedIn du membre s&apos;il est
        renseigné. Il n&apos;y a pas de page individuelle.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label="Titre" name="titre" defaultValue={membre?.titre} aide="Affiché sous le nom. Facultatif. Ex. : Ingénieur chef de projets." erreurs={erreurs?.titre} />
        <Champ label="Organisation" name="organisation" defaultValue={membre?.organisation} aide="Facultative. Ex. : PETROSEN." erreurs={erreurs?.organisation} />
        <Champ label="Spécialité" name="specialite" defaultValue={membre?.specialite} aide="Facultative. Sert au filtre de l'annuaire. Ex. : Géologie." erreurs={erreurs?.specialite} />
        <Champ label="Promotion" name="promotion" inputMode="numeric" defaultValue={membre?.promotion} aide="Année du diplôme. Facultative." erreurs={erreurs?.promotion} />
      </div>
      <ChampMedia libelle="Portrait" name="photoId" valeurInitiale={membre?.photo ?? null} erreurs={erreurs?.photoId} />
      <Champ
        label="Profil LinkedIn"
        name="lienLinkedin"
        type="url"
        defaultValue={membre?.liens.linkedin}
        aide="Facultatif. Adresse complète, avec https:// : la carte du site y mène."
        erreurs={erreurs?.lienLinkedin}
      />
      <div>
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" name="visible" defaultChecked={membre?.visible ?? false} className="size-5 accent-brun" />
          Visible sur le site
        </label>
        <p className="text-sm">Une fiche masquée n&apos;apparaît ni sur la page Membres ni sur la page Bureau.</p>
      </div>
      <Alerte resultat={suppression} />
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t-[1.5px] border-encre bg-papier px-4 py-3 sm:-mx-8 sm:px-8">
        {membre && <Badge ton={membre.visible ? "vert" : "moutarde"}>{membre.visible ? "Visible" : "Masqué"}</Badge>}
        <Bouton type="submit" disabled={occupe}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
        {membre && (
          <div className="ml-auto">
            <BoutonConfirmation
              libelle="Supprimer le membre"
              question="Supprimer définitivement ce membre ? Son portrait reste dans la médiathèque."
              confirmer="Supprimer"
              disabled={occupe}
              onConfirmer={() =>
                demarrer(async () => {
                  const r = await supprimerMembreAction(membre.id);
                  if (r.ok) router.push("/admin/membres");
                  else setSuppression(r);
                })
              }
            />
          </div>
        )}
      </div>
    </form>
  );
}
