import type { Metadata } from "next";
import { versCarte } from "@/components/carte-membre";
import { Cadre, PageHeader } from "@/components/ui";
import { getMembres } from "@/lib/content/membres";
import { AnnuaireMembres } from "./annuaire";

export const metadata: Metadata = {
  title: "Membres",
  description:
    "L'annuaire des ingénieurs diplômés de l'ENSMG membres de l'ADEMIG : géologues, ingénieurs des mines, du pétrole et du gaz, avec leur profil LinkedIn.",
  alternates: { canonical: "/membres" },
};

export default async function Membres() {
  const membres = await getMembres();
  return (
    <>
      <PageHeader
        title="Les membres"
        intro="Les ingénieurs diplômés de l'ENSMG"
        illustration="tools"
      />
      <Cadre as="div">
        <AnnuaireMembres membres={membres.map(versCarte)} />
      </Cadre>
    </>
  );
}
