import type { Metadata } from "next";
import { TitrePage } from "@/components/admin/ui";
import { LIBELLES_ROLES } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulaireMotDePasse, FormulaireNom } from "./formulaires";

export const metadata: Metadata = { title: "Mon compte" };

export default async function MonCompte() {
  const session = await exigerSession();
  return (
    <>
      <TitrePage>Mon compte</TitrePage>
      <p>
        {session.email} · {LIBELLES_ROLES[session.role]}
      </p>
      <div className="mt-8 grid max-w-4xl gap-8 lg:grid-cols-2">
        <section aria-labelledby="titre-nom" className="border-[1.5px] border-encre p-5 sm:p-6">
          <h2 id="titre-nom" className="font-titre text-2xl">
            Nom affiché
          </h2>
          <FormulaireNom nom={session.nom} />
        </section>
        <section aria-labelledby="titre-mdp" className="border-[1.5px] border-encre p-5 sm:p-6">
          <h2 id="titre-mdp" className="font-titre text-2xl">
            Mot de passe
          </h2>
          <FormulaireMotDePasse />
        </section>
      </div>
    </>
  );
}
