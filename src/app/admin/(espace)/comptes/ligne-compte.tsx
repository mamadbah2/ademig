"use client";

import { useState, useTransition } from "react";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Badge, Bouton, Selection } from "@/components/admin/ui";
import type { Compte } from "@/db/operations/comptes";
import { modifierActivation, modifierRole, renvoyerInvitation } from "@/lib/admin/comptes";
import type { Resultat } from "@/lib/admin/resultat";
import { LIBELLES_ROLES, ROLES } from "@/lib/roles";

export function LigneCompte({ compte, estMoi }: { compte: Compte; estMoi: boolean }) {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  const executer = (fn: () => Promise<Resultat>) => demarrer(async () => setResultat(await fn()));

  return (
    <li className="border-[1.5px] border-encre p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">
            {compte.nom} {estMoi && <span className="font-normal">(vous)</span>}
          </p>
          <p className="break-all">{compte.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {compte.actif ? <Badge ton="vert">Actif</Badge> : <Badge ton="rouge">Désactivé</Badge>}
          {!compte.aMotDePasse && <Badge ton="moutarde">Invitation en attente</Badge>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Selection
          label="Rôle"
          name={`role-${compte.id}`}
          value={compte.role}
          disabled={estMoi || enCours}
          onChange={(e) => executer(() => modifierRole(compte.id, e.target.value))}
          options={ROLES.map((r) => ({ valeur: r, libelle: LIBELLES_ROLES[r] }))}
          className="w-48"
        />
        {!compte.aMotDePasse && (
          <Bouton type="button" variante="secondaire" disabled={enCours} onClick={() => executer(() => renvoyerInvitation(compte.id))}>
            Renvoyer l&apos;invitation
          </Bouton>
        )}
        {!estMoi &&
          (compte.actif ? (
            <BoutonConfirmation
              libelle="Désactiver"
              question={`Désactiver le compte de ${compte.nom} ? La personne sera déconnectée immédiatement.`}
              confirmer="Désactiver"
              disabled={enCours}
              onConfirmer={() => executer(() => modifierActivation(compte.id, false))}
            />
          ) : (
            <Bouton type="button" variante="secondaire" disabled={enCours} onClick={() => executer(() => modifierActivation(compte.id, true))}>
              Réactiver
            </Bouton>
          ))}
      </div>
      {resultat && (
        <div className="mt-3">
          <Alerte resultat={resultat} />
        </div>
      )}
    </li>
  );
}
