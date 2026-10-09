import type { Metadata } from "next";
import { AccesRefusePage, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerComptes } from "@/db/operations/comptes";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulaireInvitation } from "./formulaire-invitation";
import { LigneCompte } from "./ligne-compte";

export const metadata: Metadata = { title: "Comptes" };

export default async function Comptes() {
  const session = await exigerSession();
  if (!aLeRole(session.role, "superadmin")) return <AccesRefusePage />;
  const comptes = await listerComptes(db);
  return (
    <>
      <TitrePage>Comptes</TitrePage>
      <section aria-labelledby="inviter" className="max-w-2xl border-[1.5px] border-encre p-5 sm:p-6">
        <h2 id="inviter" className="font-titre text-2xl">
          Inviter une personne
        </h2>
        <p className="mt-1">Elle recevra un email pour choisir son mot de passe (lien valable 24 heures).</p>
        <FormulaireInvitation />
      </section>
      <h2 className="font-titre mt-12 text-2xl">Comptes existants</h2>
      <ul className="mt-4 space-y-4">
        {comptes.map((c) => (
          <LigneCompte key={c.id} compte={c} estMoi={c.id === session.userId} />
        ))}
      </ul>
    </>
  );
}
