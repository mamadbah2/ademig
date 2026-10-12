import type { Metadata } from "next";
import { IconeCarre, Illustration, type IconeName, type Ton } from "@/components/illustration";
import { Bouton, Cadre, Etiquette, PageHeader, SectionTitle } from "@/components/ui";
import { getReglages } from "@/lib/content/reglages";
import { type CleTexte, fusionnerTextes } from "@/lib/content/textes";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "L'Amicale",
  description:
    "Qui est l'ADEMIG, l'Amicale des ingénieurs diplômés de l'ENSMG (ex-IST) de Dakar : son histoire depuis la création de l'AIGIST, sa vision pour 2030, ses valeurs, ses missions et son plan stratégique.",
  alternates: { canonical: "/amicale" },
};

const missions: { titre: CleTexte; texte: CleTexte; icone: IconeName; ton: Ton }[] = [
  { titre: "amicale.mission1.titre", texte: "amicale.mission1.texte", icone: "mineur", ton: "ocre" },
  { titre: "amicale.mission2.titre", texte: "amicale.mission2.texte", icone: "partage", ton: "moutarde" },
  { titre: "amicale.mission3.titre", texte: "amicale.mission3.texte", icone: "lampe", ton: "brun" },
  { titre: "amicale.mission4.titre", texte: "amicale.mission4.texte", icone: "lingots", ton: "ocre" },
  { titre: "amicale.mission5.titre", texte: "amicale.mission5.texte", icone: "casque", ton: "moutarde" },
  { titre: "amicale.mission6.titre", texte: "amicale.mission6.texte", icone: "strates", ton: "brun" },
];

const reperes: { date: CleTexte; texte: CleTexte }[] = [
  { date: "amicale.histoire.repere1.date", texte: "amicale.histoire.repere1.texte" },
  { date: "amicale.histoire.repere2.date", texte: "amicale.histoire.repere2.texte" },
  { date: "amicale.histoire.repere3.date", texte: "amicale.histoire.repere3.texte" },
  { date: "amicale.histoire.repere4.date", texte: "amicale.histoire.repere4.texte" },
  { date: "amicale.histoire.repere5.date", texte: "amicale.histoire.repere5.texte" },
];

const axes: { titre: CleTexte; objectifs: CleTexte }[] = [
  { titre: "amicale.axe1.titre", objectifs: "amicale.axe1.objectifs" },
  { titre: "amicale.axe2.titre", objectifs: "amicale.axe2.objectifs" },
  { titre: "amicale.axe3.titre", objectifs: "amicale.axe3.objectifs" },
  { titre: "amicale.axe4.titre", objectifs: "amicale.axe4.objectifs" },
  { titre: "amicale.axe5.titre", objectifs: "amicale.axe5.objectifs" },
];

// Une valeur, un objectif… par ligne non vide.
const lignes = (texte: string) => texte.split("\n").map((l) => l.trim()).filter(Boolean);

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

      <Cadre aria-labelledby="histoire">
        <SectionTitle id="histoire">Notre histoire</SectionTitle>
        <ol className="mt-10 space-y-9 border-l-2 border-brun/30 pl-7 sm:pl-10">
          {reperes.map((r) => (
            <li key={r.date} className="relative">
              <span
                aria-hidden
                className="absolute top-2 -left-[2.2rem] size-3.5 rotate-45 bg-ocre sm:-left-[3.05rem]"
              />
              <p className="font-titre text-2xl leading-tight">{t[r.date]}</p>
              <p className="mt-2 max-w-3xl leading-relaxed whitespace-pre-line">{t[r.texte]}</p>
            </li>
          ))}
        </ol>
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

      <Cadre aria-labelledby="vision" className="grid gap-12 md:grid-cols-[3fr_2fr]">
        <div>
          <Etiquette>Horizon 2030</Etiquette>
          <SectionTitle id="vision">Notre vision</SectionTitle>
          <p className="font-titre mt-6 text-2xl leading-snug whitespace-pre-line sm:text-3xl">
            {t["amicale.vision"]}
          </p>
        </div>
        <div className="space-y-10">
          <div>
            <h3 className="font-titre text-2xl leading-tight">Notre objectif</h3>
            <p className="mt-3 leading-relaxed whitespace-pre-line">{t["amicale.objectif"]}</p>
          </div>
          <div>
            <h3 className="font-titre text-2xl leading-tight">Nos valeurs</h3>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {lignes(t["amicale.valeurs"]).map((v) => (
                <li key={v} className="border border-encre/70 px-3 py-1.5 font-medium">
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
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
      </Cadre>

      <Cadre aria-labelledby="axes">
        <Etiquette>Plan stratégique 2025-2030</Etiquette>
        <SectionTitle id="axes">Cinq axes pour agir</SectionTitle>
        <ol className="mt-10 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {axes.map((a, i) => (
            <li key={a.titre} className="flex gap-5">
              <span aria-hidden className="font-titre text-5xl leading-none text-ocre">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-titre text-2xl leading-tight">{t[a.titre]}</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed marker:text-brun">
                  {lignes(t[a.objectifs]).map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-12">
          <Bouton href="/bureau">Voir le bureau et les commissions</Bouton>
        </p>
      </Cadre>
    </>
  );
}
