import Image from "next/image";
import Link from "next/link";
import {
  BarrePourcentage,
  Camembert,
  GrandChiffre,
} from "@/components/graphiques";
import {
  IconeCarre,
  Illustration,
  ordreTons,
  type IconeName,
} from "@/components/illustration";
import { Vignette } from "@/components/photos";
import { Portrait } from "@/components/portrait";
import {
  Bouton,
  Cadre,
  DateTexte,
  Etiquette,
  LienSouligne,
  SectionTitle,
} from "@/components/ui";
import { getActualites } from "@/lib/content/actualites";
import { getEvenements } from "@/lib/content/evenements";
import { getMembres } from "@/lib/content/membres";
import { getPartenaires } from "@/lib/content/organisation";
import { site } from "@/lib/site";

const devise: { verbe: string; icone: IconeName; texte: string }[] = [
  {
    verbe: "Réfléchir",
    icone: "lampe",
    texte:
      "Des journées de réflexion sur le contenu local, la souveraineté sur les ressources et le transfert de compétences.",
  },
  {
    verbe: "Proposer",
    icone: "partage",
    texte:
      "Des recommandations remises aux autorités et une parole d'experts dans le débat public.",
  },
  {
    verbe: "Agir",
    icone: "casque",
    texte:
      "L'encadrement des stagiaires de l'ENSMG, l'appui à l'école et l'emploi des jeunes diplômés.",
  },
];

const diapositives = [
  {
    src: "/hero/mine-strates.jpg",
    alt: "Un tombereau au pied du front de taille d'une mine à ciel ouvert, dont les strates sont bien visibles",
    univers: "Mines",
    position: "object-[70%_60%]",
  },
  {
    src: "/hero/offshore-plateforme.jpg",
    alt: "Une plateforme pétrolière en mer, éclairée par le soleil couchant",
    univers: "Pétrole et gaz",
    position: "object-[75%_55%]",
  },
  {
    src: "/hero/mine-tombereau.jpg",
    alt: "Un tombereau chargé de minerai soulève la poussière sur une piste minière",
    univers: "Géologie",
    position: "object-[70%_70%]",
  },
];

const iconesActualites: IconeName[] = ["strates", "mineur", "minerai"];

export default async function Accueil() {
  const [actualites, evenements, membres, partenaires] = await Promise.all([
    getActualites(),
    getEvenements(),
    getMembres(),
    getPartenaires(),
  ]);
  const dernierEvenement = evenements[0];

  return (
    <>
      {/* Hero pleine largeur : trois photos se relaient en fondu lent, une par univers de l'amicale. */}
      <section
        data-hero-scene
        className="relative isolate -mt-20 flex min-h-svh items-center overflow-clip pt-20 sm:-mt-[5.5rem] sm:pt-[5.5rem] lg:-mt-24 lg:pt-24"
      >
        <div data-hero-fond className="absolute -inset-4 -z-10">
          {/* Les photos ont leur propre calque : le fondu ne passe jamais au-dessus des voiles. */}
          <div className="absolute inset-0 isolate">
            {diapositives.map((d, i) => (
              <Image
                key={d.src}
                data-hero-diapo
                src={d.src}
                alt={i === 0 ? d.alt : ""}
                fill
                priority={i === 0}
                sizes="100vw"
                className={`object-cover ${d.position} ${i === 0 ? "" : "opacity-0"}`}
              />
            ))}
          </div>
          {/* Voile papier à gauche pour la lisibilité du titre, fondu vers la page en bas. */}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(243_240_231/0.96)_0%,rgb(243_240_231/0.88)_30%,rgb(243_240_231/0.45)_52%,transparent_72%)] max-md:bg-papier/70" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-papier/95 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-papier to-transparent" />
        </div>

        <div className="w-full px-5 py-14 sm:px-10 lg:px-16 2xl:px-24">
          <div data-cadre="hero" data-hero="texte" className="max-w-3xl">
            <h1
              data-hero="titre"
              className="font-titre text-[2.9rem] leading-[1.02] text-balance sm:text-7xl xl:text-[5.5rem]"
            >
              Les ingénieurs des mines et de la géologie du Sénégal
            </h1>
            <Etiquette className="mt-6 sm:text-lg">{site.fullName}</Etiquette>
            <div data-hero="boutons" className="mt-8 flex flex-wrap gap-3">
              <Bouton href="/membres">Découvrir les membres</Bouton>
              <Bouton href="/amicale" variante="contour">
                Connaître l&apos;amicale
              </Bouton>
            </div>
          </div>
        </div>

        {/* Repère du diaporama : l'univers affiché et sa progression. */}
        <ol
          aria-hidden
          data-hero="reperes"
          className="absolute right-5 bottom-10 flex gap-4 sm:right-10 lg:right-16 2xl:right-24"
        >
          {diapositives.map((d) => (
            <li
              key={d.src}
              data-hero-repere
              className="w-20 opacity-60 sm:w-28"
            >
              <span className="block h-[3px] bg-encre/25">
                <span
                  data-hero-jauge
                  className="block h-full origin-left scale-x-0 bg-brun"
                />
              </span>
              <span className="font-titre mt-1.5 block text-sm sm:text-base">
                {d.univers}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <Cadre aria-labelledby="devise">
        <SectionTitle id="devise">{site.motto}</SectionTitle>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {devise.map((d, i) => (
            <div
              key={d.verbe}
              className="flex flex-col items-center text-center"
            >
              <IconeCarre icone={d.icone} ton={ordreTons[i]} />
              <h3 className="font-titre mt-4 text-2xl">{d.verbe}</h3>
              <p className="mt-2 max-w-xs leading-relaxed">{d.texte}</p>
            </div>
          ))}
        </div>
      </Cadre>

      <Cadre
        aria-labelledby="forum"
        decor={[
          { name: "tree", className: "-top-8 left-[30%]" },
          { name: "gold", className: "top-10 -left-8" },
          { name: "gold", className: "-bottom-5 left-[44%]" },
        ]}
      >
        <SectionTitle id="forum">
          Le forum de recrutement 2025 en chiffres
        </SectionTitle>
        <div className="relative mt-10 grid gap-10 md:grid-cols-3">
          <GrandChiffre valeur={1000} legende="candidatures reçues, et plus" />
          <GrandChiffre valeur={188} legende="postes proposés" />
          <GrandChiffre valeur={16} legende="entreprises présentes" />
        </div>
        <Illustration
          name="mountain"
          className="absolute -right-10 -bottom-px hidden w-36 xl:block"
        />
      </Cadre>

      <Cadre aria-labelledby="valeur">
        <SectionTitle id="valeur">
          Contenu local : où va la valeur extraite ?
        </SectionTitle>
        <div className="mt-10">
          <Camembert
            titre="86,4 % de la valeur de la production extractive quitte le Sénégal, 13,6 % y reste"
            parts={[
              {
                label: "Quitte le pays",
                detail: "Part de la valeur de la production extractive",
                pourcentage: 86.4,
                couleur: "moutarde",
              },
              {
                label: "Reste au Sénégal",
                detail: "L'enjeu du contenu local",
                pourcentage: 13.6,
                couleur: "brun",
              },
            ]}
          />
        </div>
        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <BarrePourcentage
            pourcentage={50}
            titre="Achats locaux"
            texte="Plus de la moitié des volumes d'achats du secteur vont à des fournisseurs sénégalais, soit 1 100 milliards de FCFA."
          />
          <BarrePourcentage
            pourcentage={10}
            titre="Candidats retenus"
            texte="Une centaine de jeunes diplômés, sur plus de 1 000 candidats, ont rencontré les recruteurs au SIM Sénégal 2025."
          />
        </div>
        <p className="mt-10 text-center text-sm">
          Chiffres présentés lors de la Journée nationale sur le contenu local,
          le 12 septembre 2026.
        </p>
      </Cadre>

      <Cadre aria-labelledby="actualites">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <SectionTitle id="actualites">Actualités</SectionTitle>
          <LienSouligne href="/actualites">Toutes les actualités</LienSouligne>
        </div>
        <ul className="mt-10 space-y-8">
          {actualites.slice(0, 3).map((a, i) => (
            <li key={a.slug} className="flex flex-col gap-5 sm:flex-row">
              {a.photos?.[0] ? (
                <Vignette photo={a.photos[0]} />
              ) : (
                <IconeCarre
                  icone={iconesActualites[i % 3]}
                  ton={ordreTons[i % 3]}
                  taille="sm"
                />
              )}
              <div>
                <h3 className="font-titre text-2xl leading-tight">
                  <Link
                    href={`/actualites/${a.slug}`}
                    className="hover:text-brun"
                  >
                    {a.titre}
                  </Link>
                </h3>
                <p className="mt-1 text-sm">
                  <DateTexte iso={a.date} />
                </p>
                <p className="mt-2 max-w-3xl leading-relaxed">{a.resume}</p>
              </div>
            </li>
          ))}
        </ul>
      </Cadre>

      {dernierEvenement && (
        <Cadre
          aria-labelledby="evenement"
          className="max-md:pb-36 md:pr-72"
          decor={[
            { name: "gold", className: "-top-6 left-[20%]" },
            { name: "tree", className: "-bottom-8 left-[8%]" },
          ]}
        >
          <Etiquette>Dernier événement</Etiquette>
          <h2
            id="evenement"
            className="font-titre mt-4 text-4xl leading-tight sm:text-5xl"
          >
            {dernierEvenement.titre}
          </h2>
          <p className="mt-3 font-bold">
            <DateTexte iso={dernierEvenement.debut} />,{" "}
            {dernierEvenement.lieu.nom}, {dernierEvenement.lieu.ville}
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed">
            {dernierEvenement.resume}
          </p>
          <p className="mt-6">
            <Bouton href={`/evenements/${dernierEvenement.slug}`}>
              Voir l&apos;événement
            </Bouton>
          </p>
          <p className="absolute right-32 bottom-5 text-sm md:hidden">
            Touchez la dynamite
          </p>
          <button
            type="button"
            data-tnt
            aria-label="Faire exploser la dynamite"
            className="absolute right-4 -bottom-6 w-24 cursor-pointer md:right-10 md:w-44"
          >
            <Illustration name="tnt" role="libre" className="w-full" />
          </button>
        </Cadre>
      )}

      <Cadre aria-labelledby="reseau">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <SectionTitle id="reseau">Le bureau de l&apos;amicale</SectionTitle>
          <LienSouligne href="/bureau">Tout le bureau</LienSouligne>
        </div>
        <ul className="-mx-5 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-8 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
          {membres.slice(0, 4).map((m) => (
            <li
              key={m.slug}
              className="flex w-[62%] shrink-0 snap-center flex-col items-center text-center sm:w-auto"
            >
              <Portrait nom={m.nom} photo={m.photo} taille="lg" />
              <Link
                href={`/membres/${m.slug}`}
                className="font-titre mt-4 text-2xl leading-tight hover:text-brun"
              >
                {m.nom}
              </Link>
              <p className="mt-1">{m.fonction}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-sm sm:hidden">
          Faites glisser pour voir la suite du bureau
        </p>
      </Cadre>

      <Cadre aria-labelledby="partenaires">
        <SectionTitle id="partenaires">Ils travaillent avec nous</SectionTitle>
        {/* Bandeau défilant : la seconde liste n'existe que pour boucler sans couture. */}
        <div data-marquee className="-mx-5 mt-8 overflow-hidden py-2 sm:-mx-12">
          <div data-marquee-piste className="flex w-max">
            {[0, 1].map((copie) => (
              <ul
                key={copie}
                aria-hidden={copie === 1}
                className="flex shrink-0 items-center"
              >
                {partenaires.map((p) => (
                  <li key={p.nom} className="flex items-center px-7 sm:px-10">
                    {p.logo ? (
                      <Image
                        src={p.logo.src}
                        alt={copie === 0 ? p.nom : ""}
                        width={p.logo.width}
                        height={p.logo.height}
                        sizes="240px"
                        unoptimized={p.logo.src.endsWith(".svg")}
                        className="h-14 w-auto max-w-none object-contain sm:h-20"
                      />
                    ) : (
                      <span className="font-titre text-3xl whitespace-nowrap sm:text-5xl">
                        {p.nom}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
        <Illustration
          name="bulldozer"
          parallax={-25}
          className="absolute -right-6 -bottom-12 hidden w-40 lg:block"
        />
      </Cadre>
    </>
  );
}
