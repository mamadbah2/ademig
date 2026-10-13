"use client";

import { useState, useTransition } from "react";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte } from "@/components/admin/ui";
import { inviterTousLesNonInvites } from "@/lib/admin/invitations";
import type { Resultat } from "@/lib/admin/resultat";

export function InviterTous() {
  const [resultat, setResultat] = useState<Resultat<{ invites: number }> | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="space-y-3">
      <BoutonConfirmation
        libelle="Inviter tous les membres pas encore invités"
        question="Mettre en file une invitation pour chaque membre pas encore invité ? Les emails partent par lots chaque jour."
        confirmer="Mettre en file"
        variante="principal"
        disabled={enCours}
        onConfirmer={() => demarrer(async () => setResultat(await inviterTousLesNonInvites()))}
      />
      <Alerte resultat={resultat} />
    </div>
  );
}
