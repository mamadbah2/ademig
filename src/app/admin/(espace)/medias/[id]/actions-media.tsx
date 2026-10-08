"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { mettreAJourMedia, supprimerMediaAction } from "@/lib/admin/media";
import type { Resultat } from "@/lib/admin/resultat";

export function FormulaireMedia({ id, alt, credit }: { id: string; alt: string; credit: string }) {
  const [resultat, envoyer, enCours] = useActionState(mettreAJourMedia.bind(null, id), null);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  return (
    <form action={envoyer} className="space-y-5">
      <Alerte resultat={resultat} />
      <Champ
        label="Texte alternatif"
        name="alt"
        defaultValue={alt}
        aide="Ce que montre l'image, pour les personnes qui ne la voient pas."
        erreurs={erreurs?.alt}
        required
      />
      <Champ label="Crédit photo" name="credit" defaultValue={credit} erreurs={erreurs?.credit} />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}

export function CopierUrl({ url }: { url: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <div>
      <Bouton
        type="button"
        variante="secondaire"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopie(true);
        }}
      >
        Copier l&apos;adresse de l&apos;image
      </Bouton>
      <p role="status" className="mt-1 text-sm">
        {copie ? "Adresse copiée." : ""}
      </p>
    </div>
  );
}

export function ZoneSuppression({ id, bloquee }: { id: string; bloquee: boolean }) {
  const router = useRouter();
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="space-y-3">
      <Alerte resultat={resultat} />
      <BoutonConfirmation
        libelle="Supprimer l'image"
        question="Supprimer définitivement cette image ?"
        confirmer="Supprimer"
        disabled={bloquee || enCours}
        onConfirmer={() =>
          demarrer(async () => {
            const r = await supprimerMediaAction(id);
            if (r.ok) router.push("/admin/medias");
            else setResultat(r);
          })
        }
      />
      {bloquee && <p className="text-sm">Retirez d&apos;abord l&apos;image des contenus qui l&apos;utilisent.</p>}
    </div>
  );
}
