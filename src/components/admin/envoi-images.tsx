"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { enregistrerMedia } from "@/lib/admin/media";
import { preparerImage } from "@/lib/admin/preparer-image";
import { TYPES_IMAGES, verifierFichier } from "@/lib/validation/media";
import { Bouton, Champ } from "./ui";

type Element = {
  cle: string;
  fichier: File;
  apercu: string;
  alt: string;
  credit: string;
  etat: "attente" | "envoi" | "erreur";
  erreur?: string;
  // Fichier déjà envoyé au Blob : un nouvel essai ne le renvoie pas.
  envoye?: { url: string; pathname: string; width: number; height: number; mime: string; taille: number };
};

export function EnvoiImages({ onEnvoye }: { onEnvoye?: (id: string) => void }) {
  const router = useRouter();
  const [elements, setElements] = useState<Element[]>([]);
  const [refus, setRefus] = useState<string[]>([]);
  const enCours = useRef<Set<string>>(new Set());

  const maj = (cle: string, changement: Partial<Element>) =>
    setElements((liste) => liste.map((e) => (e.cle === cle ? { ...e, ...changement } : e)));

  function retirer(cle: string) {
    setElements((liste) => {
      const element = liste.find((e) => e.cle === cle);
      if (element) URL.revokeObjectURL(element.apercu);
      return liste.filter((e) => e.cle !== cle);
    });
  }

  function choisir(fichiers: FileList | null) {
    const acceptes: Element[] = [];
    const refuses: string[] = [];
    for (const fichier of Array.from(fichiers ?? [])) {
      const erreur = verifierFichier(fichier);
      if (erreur) refuses.push(`${fichier.name} : ${erreur}`);
      else
        acceptes.push({
          cle: crypto.randomUUID(),
          fichier,
          apercu: URL.createObjectURL(fichier),
          alt: "",
          credit: "",
          etat: "attente",
        });
    }
    setRefus(refuses);
    setElements((liste) => [...liste, ...acceptes]);
  }

  async function envoyer(element: Element) {
    if (enCours.current.has(element.cle)) return;
    if (element.alt.trim().length < 3) {
      return maj(element.cle, { etat: "erreur", erreur: "Décrivez l'image en quelques mots (texte alternatif)." });
    }
    enCours.current.add(element.cle);
    maj(element.cle, { etat: "envoi", erreur: undefined });
    try {
      let envoye = element.envoye;
      if (!envoye) {
        const prete = await preparerImage(element.fichier);
        const blob = await upload(`medias/${prete.fichier.name}`, prete.fichier, {
          access: "public",
          handleUploadUrl: "/api/media/upload",
          contentType: prete.fichier.type,
        });
        envoye = {
          url: blob.url,
          pathname: blob.pathname,
          width: prete.width,
          height: prete.height,
          mime: prete.fichier.type,
          taille: prete.fichier.size,
        };
        maj(element.cle, { envoye });
      }
      const resultat = await enregistrerMedia({
        ...envoye,
        alt: element.alt,
        credit: element.credit,
      });
      if (!resultat.ok) {
        return maj(element.cle, { etat: "erreur", erreur: resultat.erreurs?.alt?.[0] ?? resultat.message ?? "Envoi refusé." });
      }
      retirer(element.cle);
      if (resultat.donnees) onEnvoye?.(resultat.donnees.id);
      router.refresh();
    } catch {
      maj(element.cle, { etat: "erreur", erreur: "L'envoi a échoué. Vérifiez la connexion puis réessayez." });
    } finally {
      enCours.current.delete(element.cle);
    }
  }

  async function toutEnvoyer() {
    for (const element of elements.filter((e) => e.etat !== "envoi" && !enCours.current.has(e.cle))) await envoyer(element);
  }

  return (
    <div className="mt-4 space-y-4">
      <label className="inline-flex min-h-11 cursor-pointer items-center border-[1.5px] border-encre bg-papier px-4 py-2 font-bold hover:bg-sable has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-moutarde">
        Choisir des images
        <input
          type="file"
          multiple
          accept={TYPES_IMAGES.join(",")}
          className="sr-only"
          onChange={(e) => {
            choisir(e.currentTarget.files);
            e.currentTarget.value = "";
          }}
        />
      </label>

      {refus.length > 0 && (
        <ul role="alert" className="space-y-1 border-l-4 border-rouge bg-rouge/10 px-4 py-3 font-bold">
          {refus.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {elements.length > 0 && (
        <>
          <ul className="space-y-4">
            {elements.map((e) => (
              <li key={e.cle} className="grid gap-4 border-[1.5px] border-encre p-4 sm:grid-cols-[8rem_1fr]">
                {/* Aperçu local (URL blob:), hors du pipeline next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.apercu} alt="" className="aspect-square w-32 border border-encre bg-white object-contain" />
                <div className="min-w-0 space-y-3">
                  <p className="truncate font-bold">{e.fichier.name}</p>
                  <Champ
                    id={`alt-${e.cle}`}
                    label="Texte alternatif (obligatoire)"
                    name="alt"
                    aide="Ce que montre l'image, pour les personnes qui ne la voient pas."
                    value={e.alt}
                    onChange={(ev) => maj(e.cle, { alt: ev.target.value })}
                    disabled={e.etat === "envoi"}
                  />
                  <Champ
                    id={`credit-${e.cle}`}
                    label="Crédit photo (facultatif)"
                    name="credit"
                    value={e.credit}
                    onChange={(ev) => maj(e.cle, { credit: ev.target.value })}
                    disabled={e.etat === "envoi"}
                  />
                  {e.erreur && (
                    <p role="alert" className="border-l-4 border-rouge pl-2 font-bold">
                      {e.erreur}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Bouton type="button" disabled={e.etat === "envoi"} onClick={() => envoyer(e)}>
                      {e.etat === "envoi" ? "Envoi…" : e.etat === "erreur" ? "Réessayer" : "Envoyer"}
                    </Bouton>
                    <Bouton type="button" variante="secondaire" disabled={e.etat === "envoi"} onClick={() => retirer(e.cle)}>
                      Retirer
                    </Bouton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {elements.length > 1 && (
            <Bouton type="button" onClick={toutEnvoyer}>
              Tout envoyer ({elements.length})
            </Bouton>
          )}
        </>
      )}
    </div>
  );
}
