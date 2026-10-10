import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EtatVide, TitrePage } from "@/components/admin/ui";
import { exigerSession } from "@/lib/session";

const rubriques: Record<string, string> = {
  evenements: "Événements",
  membres: "Membres",
  bureau: "Bureau et commissions",
  partenaires: "Partenaires",
  reglages: "Réglages",
};

export async function generateMetadata({ params }: PageProps<"/admin/[rubrique]">): Promise<Metadata> {
  const { rubrique } = await params;
  return { title: Object.hasOwn(rubriques, rubrique) ? rubriques[rubrique] : "Introuvable" };
}

export default async function Rubrique({ params }: PageProps<"/admin/[rubrique]">) {
  await exigerSession();
  const { rubrique } = await params;
  if (!Object.hasOwn(rubriques, rubrique)) notFound();
  const titre = rubriques[rubrique];
  return (
    <>
      <TitrePage>{titre}</TitrePage>
      <EtatVide>Bientôt disponible : cette rubrique arrive avec la prochaine étape du back office.</EtatVide>
    </>
  );
}
