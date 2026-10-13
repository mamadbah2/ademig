"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BadgeCompte } from "@/components/admin/badge-compte";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Bouton } from "@/components/admin/ui";
import type { CompteDuMembre } from "@/db/requetes/admin/membres";
import { copierLienInvitation, desactiverMembre, reactiverMembre, renvoyerInvitationMembre } from "@/lib/admin/invitations";
import type { Resultat } from "@/lib/admin/resultat";

const LIEN_COPIE =
  "Lien copié : valable 30 jours, ne le partagez qu'avec ce membre. Les liens précédents ne fonctionnent plus.";

export function EncadreCompte({ compte, nom }: { compte: CompteDuMembre; nom: string }) {
  const router = useRouter();
  const [resultat, setResultat] = useState<Resultat | null>(null);
  // Si le navigateur refuse la copie, le lien est affiché pour être copié à la main.
  const [lienManuel, setLienManuel] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const executer = (fn: () => Promise<Resultat>) =>
    demarrer(async () => {
      setLienManuel(null);
      setResultat(await fn());
      router.refresh();
    });

  const copier = () =>
    demarrer(async () => {
      setLienManuel(null);
      const r = await copierLienInvitation(compte.userId);
      if (!r.ok || !r.donnees) {
        setResultat({ ok: false, message: r.message ?? "Le lien n'a pas pu être créé." });
        return;
      }
      try {
        await navigator.clipboard.writeText(r.donnees.url);
        setResultat({ ok: true, message: LIEN_COPIE });
      } catch {
        setLienManuel(r.donnees.url);
        setResultat({ ok: true, message: "Copiez le lien ci-dessous : valable 30 jours, ne le partagez qu'avec ce membre. Les liens précédents ne fonctionnent plus." });
      }
      router.refresh();
    });

  const activee = compte.aMotDePasse;

  return (
    <section aria-labelledby="compte" className="mb-8 max-w-2xl border-[1.5px] border-encre p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="compte" className="font-titre text-2xl">
          Compte
        </h2>
        <div className="flex flex-wrap gap-2">
          <BadgeCompte suivi={compte.suivi} />
        </div>
      </div>
      <p className="mt-2 break-all">{compte.email}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        {!activee && !compte.desactive && (
          <>
            <Bouton type="button" variante="secondaire" disabled={enCours} onClick={() => executer(() => renvoyerInvitationMembre(compte.userId))}>
              Renvoyer l&apos;invitation
            </Bouton>
            <Bouton type="button" variante="secondaire" disabled={enCours} onClick={copier}>
              Copier le lien
            </Bouton>
          </>
        )}
        {compte.desactive ? (
          <Bouton type="button" variante="secondaire" disabled={enCours} onClick={() => executer(() => reactiverMembre(compte.userId))}>
            Réactiver le compte
          </Bouton>
        ) : (
          <BoutonConfirmation
            libelle="Désactiver le compte"
            question={`Désactiver le compte de ${nom} ? La personne sera déconnectée immédiatement.`}
            confirmer="Désactiver"
            disabled={enCours}
            onConfirmer={() => executer(() => desactiverMembre(compte.userId))}
          />
        )}
      </div>
      {!activee && !compte.desactive && (
        <p className="mt-3 text-sm">« Copier le lien » crée un nouveau lien : le précédent, y compris celui d&apos;un email encore en file, cesse de fonctionner.</p>
      )}
      {resultat && (
        <div className="mt-3">
          <Alerte resultat={resultat} />
        </div>
      )}
      {lienManuel && (
        <input readOnly aria-label="Lien d'invitation" value={lienManuel} onFocus={(e) => e.currentTarget.select()} className="mt-3 block min-h-11 w-full border-[1.5px] border-encre bg-white px-3 py-2" />
      )}
    </section>
  );
}
