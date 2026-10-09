import type { Metadata } from "next";
import { IconeCarre, Illustration, type IconeName, type Ton } from "@/components/illustration";
import { Bouton, Cadre, Etiquette, PageHeader, SectionTitle } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "L'Amicale",
  description:
    "Qui est l'ADEMIG, l'Amicale des ingénieurs diplômés de l'ENSMG de Dakar : ses missions, son école et sa devise « Réfléchir, proposer, agir ».",
  alternates: { canonical: "/amicale" },
};

const missions: { titre: string; texte: string; icone: IconeName; ton: Ton }[] = [
  {
    titre: "Soutenir l'ENSMG",
    icone: "mineur",
    ton: "ocre",
    texte:
      "Encadrement des stagiaires, cours et séminaires donnés par des ingénieurs en activité, aides matérielles et financières à l'école.",
  },
  {
    titre: "Ouvrir les portes de l'emploi",
    icone: "partage",
    ton: "moutarde",
    texte:
      "Mise en relation des jeunes diplômés avec les entreprises, comme lors du forum de recrutement minier du SIM Sénégal 2025.",
  },
  {
    titre: "Éclairer le débat public",
    icone: "lampe",
    ton: "brun",
    texte:
      "Des prises de position fondées sur la science, pour que les décisions sur les ressources naturelles reposent sur des faits géologiques exacts.",
  },
  {
    titre: "Faire vivre le contenu local",
    icone: "lingots",
    ton: "ocre",
    texte:
      "Des propositions pour que les compétences, les entreprises et le financement sénégalais prennent toute leur place dans le secteur extractif.",
  },
];

export default function Amicale() {
  return (
    <>
      <PageHeader
        title="L'Amicale"
        intro="Les ingénieurs formés à Dakar aux métiers des mines et de la géologie"
        illustration="mountain"
      />

      <Cadre aria-labelledby="ecole" className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <SectionTitle id="ecole">Une école, un réseau</SectionTitle>
          <div className="texte-long mt-6">
            <p>
              L&apos;École nationale supérieure des mines et de la géologie (ENSMG) de
              l&apos;Université Cheikh Anta Diop forme depuis des décennies les cadres du Sénégal et
              de la sous-région dans l&apos;ingénierie et la géologie. Elle est l&apos;héritière de
              l&apos;Institut des sciences de la Terre (IST), devenu école nationale supérieure par
              décrets en 2021 et 2022.
            </p>
            <p>
              Ses diplômés travaillent dans l&apos;exploration et l&apos;exploitation minière, le
              pétrole et le gaz, l&apos;hydrogéologie, le génie civil, l&apos;environnement et
              l&apos;administration. L&apos;ADEMIG les réunit pour entretenir la solidarité entre
              promotions, soutenir l&apos;école et peser, par l&apos;expertise, sur l&apos;avenir du
              secteur extractif sénégalais.
            </p>
          </div>
        </div>
        <Illustration name="mine-block" className="mx-auto w-72" />
      </Cadre>

      <Cadre
        as="div"
        className="py-16 text-center sm:py-24"
        decor={[
          { name: "gold", className: "top-8 left-10" },
          { name: "tree", className: "top-1/2 left-[6%]" },
          { name: "gold", className: "bottom-6 left-[30%]" },
          { name: "tree", className: "-top-8 right-[22%]" },
          { name: "gold", className: "top-1/3 right-10" },
          { name: "tree", className: "bottom-8 right-[12%]" },
        ]}
      >
        <p className="font-titre relative text-5xl leading-tight sm:text-7xl">{site.motto}</p>
        <Etiquette className="relative mt-5 text-lg">La devise de l&apos;amicale</Etiquette>
      </Cadre>

      <Cadre aria-labelledby="missions">
        <SectionTitle id="missions">Nos missions</SectionTitle>
        <ul className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {missions.map((m) => (
            <li key={m.titre} className="flex gap-5">
              <IconeCarre icone={m.icone} ton={m.ton} taille="sm" />
              <div>
                <h3 className="font-titre text-2xl leading-tight">{m.titre}</h3>
                <p className="mt-2 leading-relaxed">{m.texte}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-12">
          <Bouton href="/bureau">Voir le bureau et les commissions</Bouton>
        </p>
      </Cadre>
    </>
  );
}
