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
import { Logo } from "@/components/logo";
import { Vignette } from "@/components/photos";
import { CarteMembre } from "@/components/carte-membre";
import {
  Bouton,
  Cadre,
  DateTexte,
  Etiquette,
  JsonLd,
  LienSouligne,
  SectionTitle,
} from "@/components/ui";
import { getActualites } from "@/lib/content/actualites";
import { getEvenements } from "@/lib/content/evenements";
import { faqAffichee, jsonLdFaq } from "@/lib/content/faq";
import { choisirDiaposHero } from "@/lib/content/hero";
import { getMembres } from "@/lib/content/membres";
import { getPartenaires } from "@/lib/content/organisation";
import { getReglages } from "@/lib/content/reglages";
import { type CleTexte, fusionnerTextes } from "@/lib/content/textes";
import { site } from "@/lib/site";

const devise: { verbe: string; icone: IconeName; texte: CleTexte }[] = [
  { verbe: "Réfléchir", icone: "lampe", texte: "accueil.devise.reflechir" },
  { verbe: "Proposer", icone: "partage", texte: "accueil.devise.proposer" },
  { verbe: "Agir", icone: "casque", texte: "accueil.devise.agir" },
];

const iconesActualites: IconeName[] = ["strates", "mineur", "minerai"];

// Recalculée chaque heure : un événement passé quitte le hero même sans modification dans l'admin.
export const revalidate = 3600;

export default async function Accueil() {
  const [actualites, evenements, membres, partenaires, reglages] = await Promise.all([
    getActualites(),
    getEvenements(),
    getMembres(),
    getPartenaires(),
    getReglages(),
  ]);
  const dernierEvenement = evenements[0];
  const t = fusionnerTextes(reglages.textes);
  const diapositives = choisirDiaposHero({ actualites, evenements, maintenant: new Date() });
  const aLaUne = diapositives.some((d) => d.une);
  // Plusieurs photos d'une même actualité : « Actualité 1, 2, 3 » n'apprendrait rien, les repères restent muets.
  const reperesNommes = new Set(diapositives.map((d) => d.une?.href ?? d.src)).size > 1;
  const faq = faqAffichee(reglages.faq);

  return (
    <>
      {/* Hero pleine largeur : les photos de l'actualité récente (ou, à défaut, une par univers de l'amicale) se relaient en fondu lent. */}
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

        <div className="w-full px-5 pt-4 pb-16 sm:px-10 sm:py-14 lg:px-16 2xl:px-24">
          <div data-cadre="hero" data-hero="texte" className="max-w-3xl">
            {/* Médaillon papier : le logo garde ses couleurs sur n'importe quelle photo. Il porte le sigle. */}
            <div
              data-hero="logo"
              className="mb-4 inline-block rounded-2xl bg-papier px-3 py-2 shadow-[0_8px_24px_-6px_rgb(22_65_93/0.35)] sm:mb-8 sm:px-4 sm:py-3"
            >
              <Logo alt={site.name} priority className="h-12 w-auto sm:h-20" />
            </div>
            {/* Sur mobile, la taille suit la largeur de l'écran pour que le nom complet reste compact. */}
            <h1
              data-hero="titre"
              className="font-titre text-[clamp(1.5rem,8vw,2.2rem)] leading-[1.08] text-balance sm:text-5xl sm:leading-[1.05] xl:text-6xl"
            >
              {t["accueil.accroche"]}
            </h1>
            {/* Mobile : l'action principale en pleine largeur, les deux autres côte à côte. */}
            <div
              data-hero="boutons"
              className="mt-6 grid grid-cols-2 gap-2 sm:mt-10 sm:flex sm:flex-wrap sm:gap-3"
            >
              <Bouton href="/membres" className="col-span-2 px-5 py-3 text-center">
                Découvrir les membres
              </Bouton>
              <Bouton
                href="/amicale"
                variante="contour"
                className="px-2 py-2.5 text-center text-sm sm:px-5 sm:py-3 sm:text-base"
              >
                Connaître l&apos;amicale
              </Bouton>
              <Bouton
                href={site.ecole.url}
                variante="contour"
                externe
                className="px-2 py-2.5 text-center text-sm sm:px-5 sm:py-3 sm:text-base"
              >
                Site de{" "}
                <span className="whitespace-nowrap">
                  l&apos;{site.ecole.nom} <span aria-hidden>↗</span>
                </span>
              </Bouton>
            </div>
            {aLaUne && (
              // Une légende par photo, superposées : le diaporama montre celle de la photo affichée.
              <div data-hero="une" className="mt-4 grid grid-cols-[minmax(0,1fr)] sm:mt-8">
                {diapositives.map((d, i) =>
                  d.une ? (
                    <Link
                      key={d.src}
                      href={d.une.href}
                      data-hero-une
                      aria-hidden={i === 0 ? undefined : true}
                      tabIndex={i === 0 ? undefined : -1}
                      className={`group inline-flex max-w-full items-center gap-2 justify-self-start border-[1.5px] border-encre bg-papier/90 py-1 pr-2.5 pl-1 text-[0.8125rem] [grid-area:1/1] sm:py-1.5 sm:pr-3 sm:pl-1.5 sm:text-base ${i === 0 ? "" : "invisible opacity-0"}`}
                    >
                      <span className="shrink-0 bg-eau px-1.5 py-0.5 font-bold sm:px-2">À la une</span>
                      <span className="min-w-0 truncate font-bold group-hover:underline">{d.une.titre}</span>
                      <span aria-hidden>→</span>
                    </Link>
                  ) : (
                    <span key={d.src} data-hero-une aria-hidden className="invisible [grid-area:1/1]" />
                  ),
                )}
              </div>
            )}
          </div>
        </div>

        {/* Repère du diaporama : la photo affichée et sa progression. Sur mobile, de simples traits sans libellé. */}
        {diapositives.length > 1 && (
          <ol
            role="img"
            aria-label={`Diaporama de ${diapositives.length} photos`}
            data-hero="reperes"
            className="absolute right-5 bottom-6 flex gap-2 sm:right-10 sm:bottom-10 sm:gap-4 lg:right-16 2xl:right-24"
          >
            {diapositives.map((d) => (
              <li key={d.src} data-hero-repere className="w-7 opacity-60 sm:w-28">
                <span className="block h-[3px] bg-encre/25">
                  <span data-hero-jauge className="block h-full origin-left scale-x-0 bg-marine" />
                </span>
                {reperesNommes && (
                  <span className="font-titre mt-1.5 hidden text-base sm:block">{d.univers}</span>
                )}
              </li>
            ))}
          </ol>
        )}
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
              <p className="mt-2 max-w-xs leading-relaxed whitespace-pre-line">{t[d.texte]}</p>
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
        <SectionTitle id="forum">{t["accueil.forum.titre"]}</SectionTitle>
        <div className="relative mt-10 grid gap-10 md:grid-cols-3">
          <GrandChiffre valeur={1000} legende={t["accueil.forum.candidatures"]} />
          <GrandChiffre valeur={188} legende={t["accueil.forum.postes"]} />
          <GrandChiffre valeur={16} legende={t["accueil.forum.entreprises"]} />
        </div>
        <Illustration
          name="mountain"
          className="absolute -right-10 -bottom-px hidden w-36 xl:block"
        />
      </Cadre>

      <Cadre aria-labelledby="valeur">
        <SectionTitle id="valeur">{t["accueil.valeur.titre"]}</SectionTitle>
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
            titre={t["accueil.valeur.achats.titre"]}
            texte={t["accueil.valeur.achats.texte"]}
          />
          <BarrePourcentage
            pourcentage={10}
            titre={t["accueil.valeur.candidats.titre"]}
            texte={t["accueil.valeur.candidats.texte"]}
          />
        </div>
        <p className="mt-10 text-center text-sm whitespace-pre-line">{t["accueil.valeur.source"]}</p>
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
              className="w-[62%] shrink-0 snap-center sm:w-auto"
            >
              <CarteMembre membre={m} avecFonction />
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

      {faq.length > 0 && (
        <Cadre aria-labelledby="faq">
          <JsonLd data={jsonLdFaq(faq)} />
          <SectionTitle id="faq">Questions fréquentes</SectionTitle>
          <ul className="mt-8 border-t-[1.5px] border-encre">
            {faq.map((q) => (
              <li key={q.question} className="border-b-[1.5px] border-encre">
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 hover:bg-eau/15 focus-visible:outline-offset-[-2px] [&::-webkit-details-marker]:hidden">
                    <span className="font-titre text-xl leading-snug text-marine sm:text-2xl">{q.question}</span>
                    <span
                      aria-hidden
                      className="flex size-9 shrink-0 items-center justify-center border-[1.5px] border-encre bg-moutarde text-2xl leading-none group-open:bg-eau"
                    >
                      <span className="transition-[rotate] duration-300 group-open:rotate-45">+</span>
                    </span>
                  </summary>
                  <p className="max-w-3xl pb-5 leading-relaxed whitespace-pre-line">{q.reponse}</p>
                </details>
              </li>
            ))}
          </ul>
          <p className="mt-6">
            Une autre question ? <LienSouligne href="/contact">Écrivez au bureau</LienSouligne>
          </p>
        </Cadre>
      )}
    </>
  );
}
