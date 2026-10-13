import type { Metadata } from "next";
import { db } from "@/db";
import { lireProfil } from "@/db/operations/profil";
import { SansFiche } from "@/components/membre/sans-fiche";
import { Cadre } from "@/components/ui";
import { exigerMembre } from "@/lib/session";
import { FormulaireProfil } from "./formulaire";

export const metadata: Metadata = { title: "Mon profil" };

export default async function Profil() {
  const m = await exigerMembre();
  const profil = "sansFiche" in m ? undefined : await lireProfil(db, m.userId);
  if (!profil) return <SansFiche titre="Mon profil" />;
  return (
    <Cadre as="div" className="mx-auto max-w-2xl">
      <h1 className="font-titre text-4xl text-marine sm:text-5xl">Mon profil</h1>
      <FormulaireProfil profil={profil} />
    </Cadre>
  );
}
