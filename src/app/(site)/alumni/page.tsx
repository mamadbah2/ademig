import type { Metadata } from "next";
import { Cadre, LienSouligne, PageHeader } from "@/components/ui";
import { getAlumni } from "@/lib/content/alumni";
import { AnnuaireAlumni } from "./annuaire";
import { metadonneesPage } from "@/lib/seo";

export const metadata: Metadata = metadonneesPage({
  titre: "Alumni",
  description:
    "La liste des anciens de l'ENSMG (ex-IST) et de l'ADEMIG, promotion par promotion, depuis 1986 : géologues, ingénieurs des mines, du pétrole et du gaz.",
  chemin: "/alumni",
});

export default async function Alumni() {
  const alumni = await getAlumni();
  return (
    <>
      <PageHeader title="Les alumni" intro="Les anciens, promotion par promotion" illustration="tools" />
      <Cadre as="div">
        <AnnuaireAlumni alumni={alumni} />
        <p className="mt-12 border-t border-encre pt-6">
          Une information à corriger, ou vous préférez ne pas figurer sur cette liste ?{" "}
          <LienSouligne href="/contact">Contactez-nous</LienSouligne>.
        </p>
      </Cadre>
    </>
  );
}
