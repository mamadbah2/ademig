"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte } from "@/components/admin/ui";
import { activerMandatAction, supprimerMandatAction } from "@/lib/admin/bureau";
import type { Resultat } from "@/lib/admin/resultat";

export function ActionsMandat({ id, actif }: { id: string; actif: boolean }) {
  const router = useRouter();
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();

  if (actif) {
    return (
      <div className="mb-6 space-y-3">
        <Alerte resultat={resultat} />
        <p className="border-l-4 border-vert bg-vert/15 px-4 py-3">
          Ce mandat est en place : il est affiché sur la page Bureau du site, et vos modifications y seront visibles dès l&apos;enregistrement.
        </p>
      </div>
    );
  }
  return (
    <div className="mb-6 space-y-3">
      <Alerte resultat={resultat} />
      <p>Ce mandat est en préparation : il n&apos;est pas visible sur le site. Enregistrez vos modifications avant de l&apos;activer.</p>
      <div className="flex flex-wrap gap-3">
        <BoutonConfirmation
          libelle="Activer ce mandat"
          variante="principal"
          question="Activer ce mandat ? Il remplacera le bureau affiché sur le site."
          confirmer="Activer"
          disabled={enCours}
          onConfirmer={() => demarrer(async () => setResultat(await activerMandatAction(id)))}
        />
        <BoutonConfirmation
          libelle="Supprimer le mandat"
          question="Supprimer définitivement ce mandat, ses postes et ses commissions ? Les fiches des membres ne sont pas touchées."
          confirmer="Supprimer"
          disabled={enCours}
          onConfirmer={() =>
            demarrer(async () => {
              const r = await supprimerMandatAction(id);
              if (r.ok) router.push("/admin/bureau");
              else setResultat(r);
            })
          }
        />
      </div>
    </div>
  );
}
