import type { Metadata } from "next";
import { IconeCarre, Illustration, type IconeName, type Ton } from "@/components/illustration";
import { Bouton, Cadre, Etiquette, PageHeader, SectionTitle } from "@/components/ui";
import { getReglages } from "@/lib/content/reglages";
import { type CleTexte, fusionnerTextes } from "@/lib/content/textes";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "L'Amicale",
  description:
    "Qui est l'ADEMIG, l'Amicale des ingénieurs diplômés de l'ENSMG de Dakar : ses missions, son école et sa devise « Réfléchir, proposer, agir ».",
  alternates: { canonical: "/amicale" },
};

const missions: { titre: CleTexte; texte: CleTexte; icone: IconeName; ton: Ton }[] = [
  { titre: "amicale.mission1.titre", texte: "amicale.mission1.texte", icone: "mineur", ton: "ocre" },
  { titre: "amicale.mission2.titre", texte: "amicale.mission2.texte", icone: "partage", ton: "moutarde" },
  { titre: "amicale.mission3.titre", texte: "amicale.mission3.texte", icone: "lampe", ton: "brun" },
  { titre: "amicale.mission4.titre", texte: "amicale.mission4.texte", icone: "lingots", ton: "ocre" },
];

export default async function Amicale() {
  const t = fusionnerTextes((await getReglages()).textes);
  return (
    <>
      <PageHeader
        title="L'Amicale"
        intro={t["amicale.intro"]}
        illustration="mountain"
      />

      <Cadre aria-labelledby="ecole" className="grid gap-10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <SectionTitle id="ecole">Une école, un réseau</SectionTitle>
          <div className="texte-long mt-6">
            <p className="whitespace-pre-line">{t["amicale.ecole.paragraphe1"]}</p>
            <p className="whitespace-pre-line">{t["amicale.ecole.paragraphe2"]}</p>
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
                <h3 className="font-titre text-2xl leading-tight">{t[m.titre]}</h3>
                <p className="mt-2 leading-relaxed whitespace-pre-line">{t[m.texte]}</p>
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
