"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { ChampMedia } from "@/components/admin/champs/champ-media";
import { ChampSlug } from "@/components/admin/champs/champ-slug";
import { EditeurRiche } from "@/components/admin/champs/editeur-riche";
import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Badge, Bouton, Champ, ZoneTexte } from "@/components/admin/ui";
import type { MembreAdmin } from "@/db/requetes/admin/membres";
import { creerMembre, enregistrerMembre, supprimerMembreAction } from "@/lib/admin/membres";
import type { Resultat } from "@/lib/admin/resultat";

type EtapeFormulaire = { periode: string; poste: string; organisation: string; description: string };
type RealisationFormulaire = { titre: string; annee: string; description: string };

const lienStyle = "inline-flex min-h-11 items-center px-2 font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-moutarde";

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
        erreurs={erreurs?.nom}
        required
      />
      <ChampSlug
        titre={nom}
        valeurInitiale={membre?.slug ?? ""}
        verrouille={membre?.visible ?? false}
        aideVerrouille="Cette fiche est visible sur le site : son lien a pu être partagé."
        erreurs={erreurs?.slug}
      />
      <p className="text-sm">
        {membre?.fonction ? `Fonction au bureau en place : ${membre.fonction}.` : "Aucune fonction au bureau en place."} Les fonctions se
        modifient dans la rubrique Bureau.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label="Poste actuel" name="titre" defaultValue={membre?.titre} aide="Ex. : Chef de mission, Doctorante." erreurs={erreurs?.titre} required />
        <Champ label="Organisation" name="organisation" defaultValue={membre?.organisation} aide="Facultative." erreurs={erreurs?.organisation} />
        <Champ label="Spécialité" name="specialite" defaultValue={membre?.specialite} aide="Ex. : Géologie, Pétrole et gaz." erreurs={erreurs?.specialite} required />
        <Champ label="Ville" name="ville" defaultValue={membre?.ville} aide="Facultative." erreurs={erreurs?.ville} />
        <Champ label="Promotion" name="promotion" inputMode="numeric" defaultValue={membre?.promotion} aide="Année du diplôme. Facultative." erreurs={erreurs?.promotion} />
        <Champ label="Numéro d'ingénieur" name="numero" inputMode="numeric" defaultValue={membre?.numero} aide="Numéro dans l'annuaire de l'école. Facultatif." erreurs={erreurs?.numero} />
      </div>
      <ZoneTexte
        label="Résumé"
        name="resume"
        defaultValue={membre?.resume}
        aide="Deux ou trois phrases, affichées dans l'annuaire et en tête de la fiche."
        erreurs={erreurs?.resume}
      />
      <EditeurRiche
        libelle="Biographie"
        name="bio"
        valeurInitiale={membre?.bio ?? ""}
        aide="Facultative. À défaut, la fiche affiche le résumé."
        erreurs={erreurs?.bio}
      />
      <ChampMedia libelle="Portrait" name="photoId" valeurInitiale={membre?.photo ?? null} erreurs={erreurs?.photoId} />
      <ListeEditable<EtapeFormulaire>
        libelle="Parcours"
        name="parcours"
        valeurInitiale={(membre?.parcours ?? []).map((e) => ({ ...e, description: e.description ?? "" }))}
        nouvelElement={() => ({ periode: "", poste: "", organisation: "", description: "" })}
        libelleAjout="Ajouter une étape"
        erreurs={erreurs?.parcours}
        rendu={(e, modifier, i, idElement) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`${idElement}-periode`} label="Période" name={`${idElement}-periode`} form="" value={e.periode} onChange={(ev) => modifier({ periode: ev.target.value })} aide="Ex. : Depuis 2024, 2018 – 2021." />
            <Champ id={`${idElement}-poste`} label="Poste occupé" name={`${idElement}-poste`} form="" value={e.poste} onChange={(ev) => modifier({ poste: ev.target.value })} />
            <Champ id={`${idElement}-organisation`} label="Employeur ou école" name={`${idElement}-organisation`} form="" value={e.organisation} onChange={(ev) => modifier({ organisation: ev.target.value })} className="sm:col-span-2" />
            <ZoneTexte id={`${idElement}-description`} label="Description de l'étape" name={`${idElement}-description`} form="" rows={2} value={e.description} onChange={(ev) => modifier({ description: ev.target.value })} aide="Facultative." className="sm:col-span-2" />
          </div>
        )}
      />
      <ListeEditable<{ nom: string }>
        libelle="Compétences"
        name="competences"
        valeurInitiale={(membre?.competences ?? []).map((nom) => ({ nom }))}
        nouvelElement={() => ({ nom: "" })}
        libelleAjout="Ajouter une compétence"
        erreurs={erreurs?.competences}
        rendu={(c, modifier, i, idElement) => (
          <Champ id={`${idElement}-nom`} label="Compétence" name={`${idElement}-nom`} form="" value={c.nom} onChange={(ev) => modifier({ nom: ev.target.value })} />
        )}
      />
      <ListeEditable<RealisationFormulaire>
        libelle="Réalisations"
        name="realisations"
        valeurInitiale={(membre?.realisations ?? []).map((r) => ({ titre: r.titre, annee: r.annee ?? "", description: r.description }))}
        nouvelElement={() => ({ titre: "", annee: "", description: "" })}
        libelleAjout="Ajouter une réalisation"
        erreurs={erreurs?.realisations}
        rendu={(r, modifier, i, idElement) => (
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Champ id={`${idElement}-titre`} label="Titre de la réalisation" name={`${idElement}-titre`} form="" value={r.titre} onChange={(ev) => modifier({ titre: ev.target.value })} />
            <Champ id={`${idElement}-annee`} label="Année" name={`${idElement}-annee`} form="" value={r.annee} onChange={(ev) => modifier({ annee: ev.target.value })} aide="Facultative." />
            <ZoneTexte id={`${idElement}-description`} label="Description de la réalisation" name={`${idElement}-description`} form="" rows={2} value={r.description} onChange={(ev) => modifier({ description: ev.target.value })} className="sm:col-span-2" />
          </div>
        )}
      />
      <fieldset className="border-[1.5px] border-encre p-4">
        <legend className="px-1 font-bold">Liens</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Champ label="Profil LinkedIn" name="lienLinkedin" type="url" defaultValue={membre?.liens.linkedin} aide="Facultatif. Adresse complète, avec https://." erreurs={erreurs?.lienLinkedin} />
          <Champ label="Site personnel" name="lienSite" type="url" defaultValue={membre?.liens.site} aide="Facultatif." erreurs={erreurs?.lienSite} />
          <Champ label="Email public" name="lienEmail" type="email" defaultValue={membre?.liens.email} aide="Affiché sur la fiche : laissez vide pour ne pas le publier." erreurs={erreurs?.lienEmail} />
        </div>
      </fieldset>
      <div>
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" name="visible" defaultChecked={membre?.visible ?? false} className="size-5 accent-brun" />
          Visible sur le site
        </label>
        <p className="text-sm">Une fiche masquée n&apos;apparaît ni dans l&apos;annuaire ni sur la page Bureau ; l&apos;aperçu reste possible.</p>
      </div>
      {membre && <p className="text-sm">L&apos;aperçu montre la dernière version enregistrée.</p>}
      <Alerte resultat={suppression} />
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t-[1.5px] border-encre bg-papier px-4 py-3 sm:-mx-8 sm:px-8">
        {membre && <Badge ton={membre.visible ? "vert" : "moutarde"}>{membre.visible ? "Visible" : "Masqué"}</Badge>}
        <Bouton type="submit" disabled={occupe}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
        {membre && (
          <a href={`/api/apercu?type=membre&id=${membre.id}`} target="_blank" rel="noopener" className={lienStyle}>
            Aperçu
          </a>
        )}
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
