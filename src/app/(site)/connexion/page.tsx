import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormulaireConnexion } from "@/components/connexion";
import { Cadre } from "@/components/ui";
import { retourValide } from "@/lib/membres/retour";
import { destinationApresConnexion, lireSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Connexion",
  robots: { index: false, follow: false },
};

export default async function Connexion({
  searchParams,
}: PageProps<"/connexion">) {
  const retour = retourValide((await searchParams).retour) ?? undefined;
  const session = await lireSession();
  if (session) redirect(retour ?? destinationApresConnexion(session.role));
  return (
    <Cadre as="div" className="mx-auto max-w-xl">
      <h1 className="font-titre text-4xl sm:text-5xl">Connexion</h1>
      <p className="mt-4">
        Espace réservé aux membres de l&apos;ADEMIG. Vous n&apos;avez pas encore
        de compte ? Le bureau vous envoie un lien d&apos;activation par email.
      </p>
      <FormulaireConnexion variante="site" retour={retour} />
    </Cadre>
  );
}
