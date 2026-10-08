import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Galerie } from "@/components/photos";
import { Cadre, DateTexte, Etiquette, JsonLd, LienSouligne, SectionTitle } from "@/components/ui";
import { Videos } from "@/components/video-youtube";
import { getEvenement, getEvenements } from "@/lib/content/evenements";
import { absoluteUrl } from "@/lib/site";

export async function generateStaticParams() {
  const evenements = await getEvenements();
  return evenements.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/evenements/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEvenement(slug);
  if (!e) return {};
  return {
    title: e.titre,
    description: e.resume,
    alternates: { canonical: `/evenements/${e.slug}` },
    openGraph: { title: e.titre, description: e.resume },
  };
}

export default async function PageEvenement({ params }: PageProps<"/evenements/[slug]">) {
  const { slug } = await params;
  const e = await getEvenement(slug);
  if (!e) notFound();

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: e.titre,
          description: e.resume,
          startDate: e.debut,
          endDate: e.fin ?? e.debut,
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          eventStatus: "https://schema.org/EventScheduled",
          location: {
            "@type": "Place",
            name: e.lieu.nom,
            address: { "@type": "PostalAddress", addressLocality: e.lieu.ville, addressCountry: "SN" },
          },
          organizer: { "@id": absoluteUrl("/#organisation") },
          url: absoluteUrl(`/evenements/${e.slug}`),
          image: e.affiche ? absoluteUrl(e.affiche.src) : undefined,
        }}
      />
      <Cadre
        as="div"
        decor={[
          { name: "gold", className: "-top-6 right-[12%]" },
          { name: "tree", className: "-bottom-8 right-[30%]" },
        ]}
      >
        <LienSouligne href="/evenements" className="text-sm">
          Tous les événements
        </LienSouligne>
        <h1 className="font-titre relative mt-4 max-w-4xl text-4xl leading-[1.08] text-balance sm:text-6xl">
          {e.titre}
        </h1>
        <dl className="relative mt-8 grid max-w-3xl gap-6 sm:grid-cols-2">
          <div>
            <dt>
              <Etiquette>Date</Etiquette>
            </dt>
            <dd className="font-titre mt-2 text-2xl text-brun">
              <DateTexte iso={e.debut} />
              {e.fin && (
                <>
                  {" au "}
                  <DateTexte iso={e.fin} />
                </>
              )}
            </dd>
          </div>
          <div>
            <dt>
              <Etiquette>Lieu</Etiquette>
            </dt>
            <dd className="font-titre mt-2 text-2xl text-brun">
              {e.lieu.nom}, {e.lieu.ville}
            </dd>
          </div>
        </dl>
      </Cadre>

      {e.theme && (
        <Cadre as="div" className="py-14 sm:py-20">
          <p className="ml-auto max-w-3xl text-right text-2xl leading-snug sm:text-3xl">« {e.theme} »</p>
          <p className="mt-4 text-right">
            <Etiquette className="font-titre text-xl">Le thème de la journée</Etiquette>
          </p>
        </Cadre>
      )}

      <Cadre as="div" className={e.affiche ? "grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start" : ""}>
        {e.affiche && (
          <Image
            src={e.affiche.src}
            alt={e.affiche.alt}
            width={e.affiche.width}
            height={e.affiche.height}
            data-anim
            sizes="(min-width: 1024px) 560px, 92vw"
            className="w-full border-[1.5px] border-encre lg:order-2"
          />
        )}
        <div>
        <div className="texte-long">
          <p>{e.resume}</p>
          {/* HTML nettoyé à l'enregistrement (voir src/lib/html.ts). */}
          <div dangerouslySetInnerHTML={{ __html: e.corps }} />
        </div>
        {e.partenaires && (
          <div className="mt-12">
            <h2 className="font-titre text-2xl">Partenaires</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {e.partenaires.map((p) => (
                <li key={p} className="border border-encre bg-papier/60 px-3 py-1 font-bold">
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>
      </Cadre>

      {e.photos && (
        <Cadre aria-labelledby="photos">
          <SectionTitle id="photos">En images</SectionTitle>
          <div className="mt-8">
            <Galerie photos={e.photos} />
          </div>
        </Cadre>
      )}

      {e.videos && (
        <Cadre aria-labelledby="videos">
          <SectionTitle id="videos">En vidéo</SectionTitle>
          <div className="mt-8">
            <Videos videos={e.videos} />
          </div>
        </Cadre>
      )}
    </article>
  );
}
