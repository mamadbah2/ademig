"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BarrePublication } from "@/components/admin/champs/barre-publication";
import { ChampMedia, GaleriePhotos } from "@/components/admin/champs/champ-media";
import { ChampSlug } from "@/components/admin/champs/champ-slug";
import { EditeurRiche } from "@/components/admin/champs/editeur-riche";
import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Champ } from "@/components/admin/ui";
import type { EvenementAdmin } from "@/db/requetes/admin/evenements";
import { creerEvenement, enregistrerEvenement, supprimerEvenementAction } from "@/lib/admin/evenements";
import type { Resultat } from "@/lib/admin/resultat";
import type { Video } from "@/lib/content/types";

export function FormulaireEvenement({
  evenement,
  suggestions,
  messageInitial,
}: {
  evenement?: EvenementAdmin;
  suggestions: string[];
  messageInitial?: string;
}) {
  const router = useRouter();
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(
    evenement ? enregistrerEvenement.bind(null, evenement.id) : creerEvenement,
  );
  const [titre, setTitre] = useState(evenement?.titre ?? "");
  const [suppression, setSuppression] = useState<Resultat | null>(null);
  const [suppressionEnCours, demarrer] = useTransition();
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || evenement?.version;
  const message = resultat ?? suppression ?? (messageInitial ? { ok: true as const, message: messageInitial } : null);

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="space-y-6">
      <Alerte resultat={message} />
      {version && <input type="hidden" name="version" value={version} />}
      <Champ label="Titre" name="titre" value={titre} onChange={(e) => setTitre(e.target.value)} erreurs={erreurs?.titre} required />
      <ChampSlug titre={titre} valeurInitiale={evenement?.slug ?? ""} verrouille={evenement?.dejaPublie ?? false} erreurs={erreurs?.slug} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label="Début" name="debut" type="datetime-local" defaultValue={evenement?.debut} erreurs={erreurs?.debut} required />
        <Champ label="Fin" name="fin" type="datetime-local" defaultValue={evenement?.fin ?? ""} aide="Facultative. Heure de Dakar." erreurs={erreurs?.fin} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label="Lieu" name="lieuNom" defaultValue={evenement?.lieuNom} erreurs={erreurs?.lieuNom} />
        <Champ label="Ville" name="lieuVille" defaultValue={evenement?.lieuVille} erreurs={erreurs?.lieuVille} />
      </div>
      <Champ label="Thème" name="theme" defaultValue={evenement?.theme} erreurs={erreurs?.theme} />
      <div>
        <label htmlFor="champ-resume" className="block font-bold">
          Résumé
        </label>
        <textarea
          id="champ-resume"
          name="resume"
          rows={3}
          defaultValue={evenement?.resume}
          aria-invalid={erreurs?.resume ? true : undefined}
          aria-describedby="champ-resume-aide"
          className="mt-1 block w-full border-[1.5px] border-encre bg-white px-3 py-2 aria-invalid:border-rouge focus-visible:outline-3 focus-visible:outline-moutarde"
        />
        <p id="champ-resume-aide" className="mt-1 text-sm">
          Deux ou trois phrases, affichées dans les listes et en tête de la page.
        </p>
        {erreurs?.resume && <p className="mt-1 border-l-4 border-rouge pl-2 text-sm font-bold">{erreurs.resume.join(" ")}</p>}
      </div>
      <EditeurRiche libelle="Présentation" name="corps" valeurInitiale={evenement?.corps ?? ""} erreurs={erreurs?.corps} />
      <ChampMedia libelle="Affiche" name="afficheId" valeurInitiale={evenement?.affiche ?? null} erreurs={erreurs?.afficheId} />
      <GaleriePhotos libelle="Photos" name="photos" valeurInitiale={evenement?.photos ?? []} erreurs={erreurs?.photos} />
      <datalist id="suggestions-partenaires">
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <ListeEditable<{ nom: string }>
        libelle="Partenaires de l'événement"
        name="partenaires"
        valeurInitiale={(evenement?.partenaires ?? []).map((nom) => ({ nom }))}
        nouvelElement={() => ({ nom: "" })}
        libelleAjout="Ajouter un partenaire"
        erreurs={erreurs?.partenaires}
        rendu={(p, modifier, i, idElement) => (
          <Champ
            id={`${idElement}-nom`}
            label="Nom du partenaire"
            name={`${idElement}-nom`}
            form=""
            list="suggestions-partenaires"
            value={p.nom}
            onChange={(e) => modifier({ nom: e.target.value })}
          />
        )}
      />
      <ListeEditable<Video>
        libelle="Vidéos YouTube"
        name="videos"
        valeurInitiale={evenement?.videos ?? []}
        nouvelElement={() => ({ id: "", titre: "" })}
        libelleAjout="Ajouter une vidéo"
        erreurs={erreurs?.videos}
        rendu={(v, modifier, i, idElement) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`${idElement}-id`} label="Adresse ou identifiant YouTube" name={`${idElement}-id`} form="" value={v.id} onChange={(e) => modifier({ id: e.target.value })} />
            <Champ id={`${idElement}-titre`} label="Titre de la vidéo" name={`${idElement}-titre`} form="" value={v.titre} onChange={(e) => modifier({ titre: e.target.value })} />
          </div>
        )}
      />
      {evenement && <p className="text-sm">L&apos;aperçu montre la dernière version enregistrée.</p>}
      <BarrePublication
        statut={evenement?.statut ?? null}
        enCours={enCours || suppressionEnCours}
        apercu={evenement ? `/api/apercu?type=evenement&id=${evenement.id}` : undefined}
        libelleSupprimer="Supprimer l'événement"
        onSupprimer={
          evenement
            ? () =>
                demarrer(async () => {
                  const r = await supprimerEvenementAction(evenement.id);
                  if (r.ok) router.push("/admin/evenements");
                  else setSuppression(r);
                })
            : undefined
        }
      />
    </form>
  );
}
