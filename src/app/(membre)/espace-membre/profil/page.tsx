import type { Metadata } from "next";
import { db } from "@/db";
import { lireProfil } from "@/db/operations/profil";
import { NavigationMembre } from "@/components/membre/navigation";
import { Cadre } from "@/components/ui";
import { exigerMembre } from "@/lib/session";
import { FormulaireProfil } from "./formulaire";

export const metadata: Metadata = { title: "Mon profil" };

export default async function Profil() {
  const m = await exigerMembre();
  if ("sansFiche" in m) {
    return (
      <div className="pb-20 md:pb-0">
        <Cadre as="div" className="mx-auto max-w-xl">
          <h1 className="font-titre text-4xl text-marine sm:text-5xl">Mon profil</h1>
          <p className="mt-4">Aucune fiche membre n&apos;est liée à votre compte : contactez le bureau.</p>
        </Cadre>
      </div>
    );
  }
  const profil = (await lireProfil(db, m.userId))!;
  return (
    <div className="pb-20 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <NavigationMembre />
      </div>
      <Cadre as="div" className="mx-auto max-w-2xl">
        <h1 className="font-titre text-4xl text-marine sm:text-5xl">Mon profil</h1>
        <FormulaireProfil profil={profil} />
      </Cadre>
    </div>
  );
}
