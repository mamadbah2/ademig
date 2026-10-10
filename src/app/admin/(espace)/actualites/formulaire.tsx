"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BarrePublication } from "@/components/admin/champs/barre-publication";
import { GaleriePhotos } from "@/components/admin/champs/champ-media";
import { ChampSlug } from "@/components/admin/champs/champ-slug";
import { EditeurRiche } from "@/components/admin/champs/editeur-riche";
import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Champ } from "@/components/admin/ui";
import type { ActualiteAdmin } from "@/db/requetes/admin/actualites";
import { creerActualite, enregistrerActualite, supprimerActualiteAction } from "@/lib/admin/actualites";
import type { Resultat } from "@/lib/admin/resultat";
import type { Source, Video } from "@/lib/content/types";

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function FormulaireActualite({ actualite, messageInitial }: { actualite?: ActualiteAdmin; messageInitial?: string }) {
  const router = useRouter();
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(
    actualite ? enregistrerActualite.bind(null, actualite.id) : creerActualite,
  );
  const [titre, setTitre] = useState(actualite?.titre ?? "");
  const [suppression, setSuppression] = useState<Resultat | null>(null);
  const [suppressionEnCours, demarrer] = useTransition();
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || actualite?.version;
  const message = resultat ?? suppression ?? (messageInitial ? { ok: true as const, message: messageInitial } : null);

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="space-y-6">
      <Alerte resultat={message} />
      {version && <input type="hidden" name="version" value={version} />}
      <Champ label="Titre" name="titre" value={titre} onChange={(e) => setTitre(e.target.value)} erreurs={erreurs?.titre} required />
      <ChampSlug titre={titre} valeurInitiale={actualite?.slug ?? ""} verrouille={actualite?.dejaPubliee ?? false} erreurs={erreurs?.slug} />
      <Champ label="Date" name="date" type="date" defaultValue={actualite?.date ?? aujourdhui()} erreurs={erreurs?.date} required className="max-w-xs" />
      <div>
        <label htmlFor="champ-resume" className="block font-bold">
          Résumé
        </label>
        <textarea
          id="champ-resume"
          name="resume"
          rows={3}
          defaultValue={actualite?.resume}
          aria-invalid={erreurs?.resume ? true : undefined}
          aria-describedby="champ-resume-aide"
          className="mt-1 block w-full border-[1.5px] border-encre bg-white px-3 py-2 aria-invalid:border-rouge focus-visible:outline-3 focus-visible:outline-moutarde"
        />
        <p id="champ-resume-aide" className="mt-1 text-sm">
          Deux ou trois phrases, affichées dans les listes et en tête de l&apos;article.
        </p>
        {erreurs?.resume && <p className="mt-1 border-l-4 border-rouge pl-2 text-sm font-bold">{erreurs.resume.join(" ")}</p>}
      </div>
      <EditeurRiche libelle="Texte" name="corps" valeurInitiale={actualite?.corps ?? ""} erreurs={erreurs?.corps} />
      <GaleriePhotos libelle="Photos" name="photos" valeurInitiale={actualite?.photos ?? []} erreurs={erreurs?.photos} />
      <ListeEditable<Source>
        libelle="Sources"
        name="sources"
        valeurInitiale={actualite?.sources ?? []}
        nouvelElement={() => ({ label: "", url: "" })}
        libelleAjout="Ajouter une source"
        erreurs={erreurs?.sources}
        rendu={(s, modifier, i) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`source-${i}-label`} label="Nom de la source" name={`source-${i}-label`} form="" value={s.label} onChange={(e) => modifier({ label: e.target.value })} />
            <Champ id={`source-${i}-url`} label="Adresse" name={`source-${i}-url`} form="" type="url" value={s.url} onChange={(e) => modifier({ url: e.target.value })} />
          </div>
        )}
      />
      <ListeEditable<Video>
        libelle="Vidéos YouTube"
        name="videos"
        valeurInitiale={actualite?.videos ?? []}
        nouvelElement={() => ({ id: "", titre: "" })}
        libelleAjout="Ajouter une vidéo"
        erreurs={erreurs?.videos}
        rendu={(v, modifier, i) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`video-${i}-id`} label="Adresse ou identifiant YouTube" name={`video-${i}-id`} form="" value={v.id} onChange={(e) => modifier({ id: e.target.value })} />
            <Champ id={`video-${i}-titre`} label="Titre de la vidéo" name={`video-${i}-titre`} form="" value={v.titre} onChange={(e) => modifier({ titre: e.target.value })} />
          </div>
        )}
      />
      {actualite && <p className="text-sm">L&apos;aperçu montre la dernière version enregistrée.</p>}
      <BarrePublication
        statut={actualite?.statut ?? null}
        enCours={enCours || suppressionEnCours}
        apercu={actualite ? `/api/apercu?type=actualite&id=${actualite.id}` : undefined}
        libelleSupprimer="Supprimer l'actualité"
        onSupprimer={
          actualite
            ? () =>
                demarrer(async () => {
                  const r = await supprimerActualiteAction(actualite.id);
                  if (r.ok) router.push("/admin/actualites");
                  else setSuppression(r);
                })
            : undefined
        }
      />
    </form>
  );
}
