import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Galerie, PhotoCadre } from "@/components/photos";
import { Cadre, DateTexte, Etiquette, JsonLd, LienSouligne, SectionTitle } from "@/components/ui";
import { Videos } from "@/components/video-youtube";
import { getActualite, getActualites } from "@/lib/content/actualites";
import { absoluteUrl, site } from "@/lib/site";

export async function generateStaticParams() {
  const actualites = await getActualites();
  return actualites.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/actualites/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = await getActualite(slug);
  if (!a) return {};
  return {
    title: a.titre,
    description: a.resume,
    alternates: { canonical: `/actualites/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.titre,
      description: a.resume,
      publishedTime: a.date,
      images: a.photos?.[0] ? [a.photos[0].src] : undefined,
    },
  };
}

export default async function Article({ params }: PageProps<"/actualites/[slug]">) {
  const { slug } = await params;
  const a = await getActualite(slug);
  if (!a) notFound();

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: a.titre,
          description: a.resume,
          datePublished: a.date,
          inLanguage: "fr",
          image: a.photos?.map((p) => absoluteUrl(p.src)),
          mainEntityOfPage: absoluteUrl(`/actualites/${a.slug}`),
          author: { "@id": absoluteUrl("/#organisation") },
          publisher: { "@type": "Organization", name: site.fullName, url: site.url },
        }}
      />
      <Cadre
        as="div"
        decor={[
          { name: "gold", className: "-top-6 right-[12%]" },
          { name: "tree", className: "-bottom-8 right-[30%]" },
        ]}
      >
        <LienSouligne href="/actualites" className="text-sm">
          Toutes les actualités
        </LienSouligne>
        <h1 className="font-titre relative mt-4 max-w-4xl text-4xl leading-[1.08] text-balance sm:text-6xl">
          {a.titre}
        </h1>
        <Etiquette className="relative mt-5">
          <DateTexte iso={a.date} />
        </Etiquette>
      </Cadre>
      <Cadre as="div">
        {a.photos?.[0] && <PhotoCadre photo={a.photos[0]} priority className="mb-10" />}
        <p className="max-w-3xl text-xl leading-relaxed font-bold">{a.resume}</p>
        {/* HTML nettoyé à l'enregistrement (voir src/lib/html.ts). */}
        <div className="texte-long mt-8" dangerouslySetInnerHTML={{ __html: a.corps }} />
        {a.sources && (
          <p className="mt-12 text-sm">
            Sources :{" "}
            {a.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ", "}
                <a href={s.url} className="underline underline-offset-4" rel="noopener">
                  {s.label}
                </a>
              </span>
            ))}
          </p>
        )}
      </Cadre>

      {a.photos && a.photos.length > 1 && (
        <Cadre aria-labelledby="photos">
          <SectionTitle id="photos">En images</SectionTitle>
          <div className="mt-8">
            <Galerie photos={a.photos.slice(1)} />
          </div>
        </Cadre>
      )}

      {a.videos && (
        <Cadre aria-labelledby="videos">
          <SectionTitle id="videos">En vidéo</SectionTitle>
          <div className="mt-8">
            <Videos videos={a.videos} />
          </div>
        </Cadre>
      )}
    </article>
  );
}
