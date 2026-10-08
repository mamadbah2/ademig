import type { Metadata } from "next";
import Link from "next/link";
import { IconeCarre, ordreTons, type IconeName } from "@/components/illustration";
import { Vignette } from "@/components/photos";
import { Cadre, DateTexte, PageHeader } from "@/components/ui";
import { getActualites } from "@/lib/content/actualites";

export const metadata: Metadata = {
  title: "Actualités",
  description:
    "Les prises de position, communiqués et activités de l'ADEMIG sur les mines, la géologie, le pétrole, le gaz et le contenu local au Sénégal.",
  alternates: { canonical: "/actualites" },
};

const icones: IconeName[] = ["strates", "mineur", "minerai"];

export default async function Actualites() {
  const actualites = await getActualites();
  return (
    <>
      <PageHeader
        title="Actualités"
        intro="Communiqués, prises de position et activités de l'amicale"
        illustration="jackhammer-cable"
      />
      <Cadre as="div">
        <ul className="space-y-10">
          {actualites.map((a, i) => (
            <li key={a.slug} className="flex flex-col gap-5 sm:flex-row">
              {a.photos?.[0] ? (
                <Vignette photo={a.photos[0]} />
              ) : (
                <IconeCarre icone={icones[i % 3]} ton={ordreTons[i % 3]} taille="sm" />
              )}
              <div>
                <h2 className="font-titre text-3xl leading-tight">
                  <Link href={`/actualites/${a.slug}`} className="hover:text-brun">
                    {a.titre}
                  </Link>
                </h2>
                <p className="mt-1 font-bold">
                  <DateTexte iso={a.date} />
                </p>
                <p className="mt-2 max-w-3xl text-lg leading-relaxed">{a.resume}</p>
              </div>
            </li>
          ))}
        </ul>
      </Cadre>
    </>
  );
}
