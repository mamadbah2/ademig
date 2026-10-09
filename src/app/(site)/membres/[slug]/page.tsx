import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Portrait } from "@/components/portrait";
import { IconeCarre, ordreTons, type IconeName } from "@/components/illustration";
import { Cadre, Etiquette, JsonLd, LienSouligne, SectionTitle } from "@/components/ui";
import { getMembre, getMembres } from "@/lib/content/membres";
import { absoluteUrl } from "@/lib/site";

const iconesParcours: IconeName[] = ["pic", "strates", "casque"];

export async function generateStaticParams() {
  const membres = await getMembres();
  return membres.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps<"/membres/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const membre = await getMembre(slug);
  if (!membre) return {};
  return {
    title: `${membre.nom}, ${membre.titre}`,
    description: membre.resume,
    alternates: { canonical: `/membres/${membre.slug}` },
    openGraph: {
      type: "profile",
      title: membre.nom,
      description: membre.resume,
      images: membre.photo ? [membre.photo] : undefined,
    },
  };
}

export default async function ProfilMembre({ params }: PageProps<"/membres/[slug]">) {
  const { slug } = await params;
  const m = await getMembre(slug);
  if (!m) notFound();

  const personne = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: m.nom,
    jobTitle: m.titre,
    description: m.resume,
    url: absoluteUrl(`/membres/${m.slug}`),
    alumniOf: { "@type": "CollegeOrUniversity", name: "ENSMG, Université Cheikh Anta Diop de Dakar" },
    memberOf: { "@id": absoluteUrl("/#organisation") },
    worksFor: m.organisation ? { "@type": "Organization", name: m.organisation } : undefined,
    image: m.photo ? absoluteUrl(m.photo) : undefined,
    knowsAbout: m.competences,
    sameAs: m.liens?.linkedin ? [m.liens.linkedin] : undefined,
  };

  return (
    <article>
      <JsonLd data={personne} />
      <Cadre
        as="div"
        className="flex flex-col gap-8 sm:flex-row sm:items-center"
        decor={[
          { name: "gold", className: "-top-6 right-[18%]" },
          { name: "tree", className: "-bottom-8 right-10" },
        ]}
      >
        <Portrait nom={m.nom} photo={m.photo} taille="lg" priority />
        <div className="relative">
          <LienSouligne href="/membres" className="text-sm">
            Tous les membres
          </LienSouligne>
          <h1 className="font-titre mt-3 text-5xl leading-[1.05] sm:text-6xl">{m.nom}</h1>
          {m.fonction && <p className="font-titre mt-2 text-2xl text-brun">{m.fonction}</p>}
          <Etiquette className="mt-4 text-lg">
            {m.titre}
            {m.organisation && `, ${m.organisation}`}
          </Etiquette>
          <p className="mt-3">
            {[m.specialite, m.promotion && `Promotion ${m.promotion}`, m.numero && `Ingénieur n° ${m.numero}`, m.ville]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      </Cadre>

      <Cadre as="div" className="grid gap-14 lg:grid-cols-[2fr_1fr]">
        <div>
          {m.bio ? (
            // HTML nettoyé à l'enregistrement (voir src/lib/html.ts).
            <div className="texte-long" dangerouslySetInnerHTML={{ __html: m.bio }} />
          ) : (
            <div className="texte-long">
              <p>{m.resume}</p>
            </div>
          )}

          <section aria-labelledby="parcours" className="mt-14">
            <SectionTitle id="parcours">Parcours</SectionTitle>
            <ol className="mt-8">
              {m.parcours.map((e, i) => (
                <li key={`${e.periode}-${e.poste}`} className="relative flex gap-5 pb-8 last:pb-0">
                  {i < m.parcours.length - 1 && (
                    <span aria-hidden className="absolute top-12 bottom-0 left-6 w-px bg-encre" />
                  )}
                  <IconeCarre icone={iconesParcours[i % 3]} ton={ordreTons[i % 3]} taille="sm" />
                  <div>
                    <p className="font-titre text-2xl leading-tight text-brun">{e.periode}</p>
                    <p className="mt-1 text-lg font-bold">{e.poste}</p>
                    <p>{e.organisation}</p>
                    {e.description && <p className="mt-2 max-w-xl leading-relaxed">{e.description}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {m.realisations && m.realisations.length > 0 && (
            <section aria-labelledby="realisations" className="mt-14">
              <SectionTitle id="realisations">Réalisations</SectionTitle>
              <ul className="mt-8 space-y-6">
                {m.realisations.map((r) => (
                  <li key={r.titre}>
                    <p className="font-titre text-2xl leading-tight">
                      {r.titre}
                      {r.annee && <span className="text-brun"> ({r.annee})</span>}
                    </p>
                    <p className="mt-1 max-w-xl leading-relaxed">{r.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-10 self-start">
          {m.competences.length > 0 && (
            <div>
              <h2 className="font-titre text-2xl">Compétences</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {m.competences.map((c) => (
                  <li key={c} className="border border-encre bg-moutarde px-3 py-1">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.liens && (
            <div>
              <h2 className="font-titre text-2xl">Contact</h2>
              <ul className="mt-3 space-y-2">
                {m.liens.linkedin && (
                  <li>
                    <a href={m.liens.linkedin} className="font-bold underline underline-offset-4" rel="me noopener">
                      Profil LinkedIn
                    </a>
                  </li>
                )}
                {m.liens.site && (
                  <li>
                    <a href={m.liens.site} className="font-bold underline underline-offset-4" rel="me noopener">
                      Site personnel
                    </a>
                  </li>
                )}
                {m.liens.email && (
                  <li>
                    <a href={`mailto:${m.liens.email}`} className="font-bold underline underline-offset-4">
                      {m.liens.email}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </aside>
      </Cadre>
    </article>
  );
}
