import type { Metadata } from "next";
import Image from "next/image";
import { IconeCarre, type IconeName, type Ton } from "@/components/illustration";
import { Cadre, PageHeader, SectionTitle } from "@/components/ui";
import { partenaires } from "@/lib/content/organisation";
import type { Partenaire } from "@/lib/content/types";

export const metadata: Metadata = {
  title: "Partenaires",
  description:
    "Les institutions et entreprises qui accompagnent l'ADEMIG : ENSMG, ministère des Mines et de la Géologie, CNSCL, entreprises du secteur extractif.",
  alternates: { canonical: "/partenaires" },
};

const categories: { cle: Partenaire["categorie"]; titre: string; icone: IconeName; ton: Ton }[] = [
  { cle: "Institution", titre: "Institutions", icone: "lanterne", ton: "brun" },
  { cle: "Entreprise", titre: "Entreprises", icone: "pelleteuse", ton: "moutarde" },
  { cle: "Événement", titre: "Organisateurs d'événements", icone: "explosion", ton: "ocre" },
];

export default function Partenaires() {
  return (
    <>
      <PageHeader
        title="Partenaires"
        intro="Les institutions et entreprises qui accompagnent l'amicale"
        illustration="bulldozer"
      />
      {categories.map(({ cle, titre, icone, ton }) => (
        <Cadre key={cle} aria-label={titre}>
          <SectionTitle>{titre}</SectionTitle>
          <ul className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {partenaires
              .filter((p) => p.categorie === cle)
              .map((p) => (
                <li key={p.nom} className="flex gap-5">
                  {p.logo ? (
                    <span
                      data-anim
                      className="flex h-24 w-36 shrink-0 items-center justify-center border-[1.5px] border-encre bg-papier p-3"
                    >
                      <Image
                        src={p.logo.src}
                        alt={`Logo ${p.nom}`}
                        width={p.logo.width}
                        height={p.logo.height}
                        sizes="144px"
                        unoptimized={p.logo.src.endsWith(".svg")}
                        className="max-h-full w-auto object-contain"
                      />
                    </span>
                  ) : (
                    <IconeCarre icone={icone} ton={ton} taille="sm" />
                  )}
                  <div>
                    <p className="font-titre text-2xl leading-tight">
                      {p.url ? (
                        <a href={p.url} className="hover:text-brun" rel="noopener">
                          {p.nom}
                        </a>
                      ) : (
                        p.nom
                      )}
                    </p>
                    <p className="mt-1 leading-relaxed">{p.description}</p>
                  </div>
                </li>
              ))}
          </ul>
        </Cadre>
      ))}
    </>
  );
}
