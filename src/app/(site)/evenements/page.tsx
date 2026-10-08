import type { Metadata } from "next";
import Link from "next/link";
import { IconeCarre, ordreTons, type IconeName } from "@/components/illustration";
import { Vignette } from "@/components/photos";
import { Cadre, DateTexte, LienSouligne, PageHeader, SectionTitle } from "@/components/ui";
import { getEvenements } from "@/lib/content/evenements";
import type { Evenement } from "@/lib/content/types";

// Recalculée chaque heure pour qu'un événement passé change de section.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Événements",
  description:
    "Journées de réflexion, forums de recrutement et rencontres organisés par l'ADEMIG dans le secteur des mines, du pétrole et du gaz au Sénégal.",
  alternates: { canonical: "/evenements" },
};

const icones: IconeName[] = ["explosion", "mineur", "convoyeur"];

function Liste({ evenements }: { evenements: Evenement[] }) {
  return (
    <ul className="mt-8 grid gap-10 md:grid-cols-2">
      {evenements.map((e, i) => (
        <li key={e.slug} className="flex flex-col gap-4">
          {e.photos?.[0] ? (
            <Vignette photo={e.photos[0]} className="sm:w-full" />
          ) : (
            <IconeCarre icone={icones[i % 3]} ton={ordreTons[i % 3]} taille="sm" />
          )}
          <div>
            <h3 className="font-titre text-2xl leading-tight">
              <Link href={`/evenements/${e.slug}`} className="hover:text-brun">
                {e.titre}
              </Link>
            </h3>
            <p className="mt-1 font-bold">
              <DateTexte iso={e.debut} />, {e.lieu.ville}
            </p>
            <p className="mt-2 leading-relaxed">{e.resume}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function Evenements() {
  const evenements = await getEvenements();
  const maintenant = new Date().toISOString();
  const aVenir = evenements.filter((e) => (e.fin ?? e.debut) >= maintenant).reverse();
  const passes = evenements.filter((e) => (e.fin ?? e.debut) < maintenant);

  return (
    <>
      <PageHeader
        title="Événements"
        intro="Journées de réflexion, forums de recrutement et rencontres"
        illustration="tnt"
      />
      <Cadre aria-labelledby="a-venir">
        <SectionTitle id="a-venir">À venir</SectionTitle>
        {aVenir.length > 0 ? (
          <Liste evenements={aVenir} />
        ) : (
          <p className="mt-6 max-w-xl text-lg leading-relaxed">
            Aucun événement n&apos;est programmé pour le moment. Les prochains rendez-vous seront
            annoncés ici et dans les <LienSouligne href="/actualites">actualités</LienSouligne>.
          </p>
        )}
      </Cadre>
      {passes.length > 0 && (
        <Cadre aria-labelledby="passes">
          <SectionTitle id="passes">Événements passés</SectionTitle>
          <Liste evenements={passes} />
        </Cadre>
      )}
    </>
  );
}
