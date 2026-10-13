"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, type FormEvent, startTransition, useActionState, useRef, useState } from "react";
import { Alerte, Bouton, Champ, ZoneTexte } from "@/components/admin/ui";
import type { ProfilMembre } from "@/db/operations/profil";
import type { Resultat } from "@/lib/admin/resultat";
import { enregistrerProfil } from "@/lib/membres/actions-profil";
import { recadrerCarre, TYPES_PORTRAIT } from "@/lib/membres/recadrer";
import { LIBELLES_VISIBILITE, VISIBILITES } from "@/lib/membres/visibilite";

const MAX_RESUME = 500;

type Selection = { blob: Blob; cote: number; apercu: string; resultatAuChoix: Resultat | null };

function Initiales({ nom }: { nom: string }) {
  const initiales = nom
    .replace(/^Dr\.?\s+/, "")
    .split(/\s+/)
    .map((mot) => mot[0])
    .slice(0, 2)
    .join("");
  return (
    <span aria-hidden className="font-titre flex size-full items-center justify-center text-4xl text-brun">
      {initiales}
    </span>
  );
}

export function FormulaireProfil({ profil }: { profil: ProfilMembre }) {
  const [resultat, envoyer, enCours] = useActionState<Resultat | null, FormData>(enregistrerProfil, null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [longueur, setLongueur] = useState(profil.resume.length);
  const entree = useRef<HTMLInputElement>(null);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;

  // Une photo choisie est consommée dès qu'un enregistrement réussit après son choix.
  const enAttente = selection && !(resultat?.ok && resultat !== selection.resultatAuChoix) ? selection : null;
  const photoAffichee = enAttente?.apercu ?? profil.photo;

  async function choisir(e: ChangeEvent<HTMLInputElement>) {
    const fichier = e.currentTarget.files?.[0];
    e.currentTarget.value = "";
    if (!fichier) return;
    setErreurPhoto(null);
    if (!TYPES_PORTRAIT.includes(fichier.type)) {
      return setErreurPhoto("Format non pris en charge : utilisez une photo JPEG, PNG ou WebP.");
    }
    try {
      const { blob, cote } = await recadrerCarre(fichier);
      if (selection) URL.revokeObjectURL(selection.apercu);
      setSelection({ blob, cote, apercu: URL.createObjectURL(blob), resultatAuChoix: resultat });
    } catch {
      setErreurPhoto("Cette image n'a pas pu être lue. Essayez une autre photo.");
    }
  }

  // Le portrait n'est envoyé dans Blob qu'à l'enregistrement : choisir puis abandonner ne laisse aucun fichier.
  // Pas de `action` sur le formulaire : React le réinitialiserait après l'envoi et effacerait la saisie d'un formulaire refusé.
  async function envoi(donnees: FormData) {
    if (enAttente) {
      setErreurPhoto(null);
      setEnvoiPhoto(true);
      try {
        const extension = enAttente.blob.type === "image/webp" ? "webp" : "png";
        const envoye = await upload(`membres/portrait.${extension}`, enAttente.blob, {
          access: "public",
          handleUploadUrl: "/api/media/upload",
        });
        donnees.set("photoUrl", envoye.url);
        donnees.set("photoPathname", envoye.pathname);
        donnees.set("photoLargeur", String(enAttente.cote));
        donnees.set("photoHauteur", String(enAttente.cote));
      } catch {
        setErreurPhoto("La photo n'a pas pu être envoyée. Vérifiez votre connexion puis réessayez.");
        return;
      } finally {
        setEnvoiPhoto(false);
      }
    }
    startTransition(() => envoyer(donnees));
  }

  function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void envoi(new FormData(e.currentTarget));
  }

  const occupe = enCours || envoiPhoto;

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-6">
      <Alerte resultat={resultat} />

      <div className="flex items-center gap-4">
        <span className="size-28 shrink-0 overflow-hidden rounded-full border-[1.5px] border-encre bg-sable">
          {photoAffichee ? (
            <Image
              src={photoAffichee}
              alt={`Portrait de ${profil.nom}`}
              width={224}
              height={224}
              unoptimized={photoAffichee.startsWith("blob:")}
              priority
              className="size-full object-cover"
            />
          ) : (
            <Initiales nom={profil.nom} />
          )}
        </span>
        <div>
          <input ref={entree} type="file" accept={TYPES_PORTRAIT.join(",")} onChange={choisir} className="sr-only" tabIndex={-1} aria-label="Choisir une photo" />
          <Bouton type="button" variante="secondaire" onClick={() => entree.current?.click()}>
            {photoAffichee ? "Changer" : "Ajouter une photo"}
          </Bouton>
          <p className="mt-1 text-sm">JPEG, PNG ou WebP. Recadrée en carré.</p>
          {enAttente && <p className="mt-1 text-sm font-bold">Nouvelle photo : elle sera envoyée à l&apos;enregistrement.</p>}
          {erreurPhoto && <p role="alert" className="mt-1 border-l-4 border-rouge pl-2 text-sm font-bold">{erreurPhoto}</p>}
        </div>
      </div>

      <dl className="space-y-3">
        <div>
          <dt className="font-bold">Nom</dt>
          <dd>{profil.nom}</dd>
        </div>
        <div>
          <dt className="font-bold">Email</dt>
          <dd className="break-all">{profil.email}</dd>
        </div>
        <p className="text-sm">Pour les modifier, contactez le bureau.</p>
      </dl>

      <div>
        <ZoneTexte
          label="Présentation"
          name="resume"
          rows={5}
          maxLength={MAX_RESUME}
          required
          defaultValue={profil.resume}
          onChange={(e) => setLongueur(e.currentTarget.value.length)}
          erreurs={erreurs?.resume}
        />
        <p aria-live="polite" className="mt-1 text-sm font-bold">
          {longueur} / {MAX_RESUME} caractères
        </p>
      </div>

      <Champ
        label="LinkedIn"
        name="linkedin"
        type="url"
        inputMode="url"
        placeholder="https://www.linkedin.com/in/…"
        defaultValue={profil.linkedin}
        erreurs={erreurs?.linkedin}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Champ label="Promotion" name="promotion" inputMode="numeric" placeholder="2008" defaultValue={profil.promotion} erreurs={erreurs?.promotion} />
        <Champ label="Spécialité" name="specialite" required maxLength={120} defaultValue={profil.specialite} erreurs={erreurs?.specialite} />
        <Champ label="Entreprise" name="organisation" maxLength={120} defaultValue={profil.organisation} erreurs={erreurs?.organisation} />
        <Champ label="Ville" name="ville" maxLength={100} defaultValue={profil.ville} erreurs={erreurs?.ville} />
        <Champ
          label="Téléphone"
          name="telephone"
          type="tel"
          autoComplete="tel"
          defaultValue={profil.telephone}
          aide="Visible uniquement par le bureau."
          erreurs={erreurs?.telephone}
          className="sm:col-span-2"
        />
      </div>

      <fieldset>
        <legend className="font-bold">Qui voit votre fiche ?</legend>
        <div className="mt-2 space-y-2">
          {VISIBILITES.map((v) => (
            <label key={v} className="flex min-h-11 cursor-pointer items-start gap-3 border-[1.5px] border-encre bg-white p-3 has-checked:bg-sable">
              <input type="radio" name="visibilite" value={v} defaultChecked={profil.visibilite === v} required className="mt-1 size-5 accent-marine" />
              <span>
                <span className="block font-bold">{LIBELLES_VISIBILITE[v].titre}</span>
                <span className="block text-sm">{LIBELLES_VISIBILITE[v].aide}</span>
              </span>
            </label>
          ))}
        </div>
        {erreurs?.visibilite && <p className="mt-1 border-l-4 border-rouge pl-2 text-sm font-bold">{erreurs.visibilite.join(" ")}</p>}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4">
        <Bouton type="submit" disabled={occupe}>
          {envoiPhoto ? "Envoi de la photo…" : enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
        {profil.visibilite === "publique" && (
          <Link href={`/membres/${profil.slug}`} className="font-bold underline underline-offset-4">
            Voir ma fiche publique
          </Link>
        )}
      </div>
    </form>
  );
}
