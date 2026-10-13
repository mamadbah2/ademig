import type { Metadata } from "next";
import Link from "next/link";
import { AccesRefusePage, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireReglagesAdmin } from "@/db/requetes/admin/reglages";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { faqAffichee } from "@/lib/content/faq";
import { FormulaireCoordonnees } from "./coordonnees";
import { FormulaireFaq } from "./faq";
import { FormulaireReseaux } from "./reseaux";
import { FormulaireTextes } from "./textes";

export const metadata: Metadata = { title: "Réglages" };

const ONGLETS = [
  { valeur: "coordonnees", libelle: "Coordonnées" },
  { valeur: "reseaux", libelle: "Réseaux sociaux" },
  { valeur: "textes", libelle: "Textes du site" },
  { valeur: "faq", libelle: "FAQ" },
] as const;

// Chaque onglet est une page à part : en changer recharge la version à jour de la ligne.
export default async function Reglages({ searchParams }: PageProps<"/admin/reglages">) {
  const session = await exigerSession();
  if (!aLeRole(session.role, "editeur")) return <AccesRefusePage />;
  const { onglet: demande } = await searchParams;
  const onglet = ONGLETS.find((o) => o.valeur === demande)?.valeur ?? "coordonnees";
  const reglages = await lireReglagesAdmin(db);

  return (
    <>
      <TitrePage>Réglages</TitrePage>
      <nav aria-label="Rubriques des réglages" className="mb-8 flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <Link
            key={o.valeur}
            href={`/admin/reglages?onglet=${o.valeur}`}
            aria-current={o.valeur === onglet ? "page" : undefined}
            className={`inline-flex min-h-11 items-center border-[1.5px] border-encre px-4 py-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-moutarde ${
              o.valeur === onglet ? "bg-marine text-papier" : "bg-papier hover:bg-sable"
            }`}
          >
            {o.libelle}
          </Link>
        ))}
      </nav>
      {onglet === "coordonnees" && <FormulaireCoordonnees contact={reglages.contact} version={reglages.version} />}
      {onglet === "reseaux" && <FormulaireReseaux reseaux={reglages.reseaux} version={reglages.version} />}
      {onglet === "textes" && <FormulaireTextes textes={reglages.textes} version={reglages.version} />}
      {onglet === "faq" && <FormulaireFaq faq={faqAffichee(reglages.faq)} version={reglages.version} />}
    </>
  );
}
