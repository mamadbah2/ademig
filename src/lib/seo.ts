// Référencement : métadonnées des pages et données structurées (schema.org).
// Une seule source pour que chaque page publique annonce correctement son titre, son URL et son image
// aux moteurs de recherche et aux réseaux sociaux.
import type { Metadata } from "next";
import type { Actualite, Contact, Evenement, Reseau } from "@/lib/content/types";
import { absoluteUrl, site } from "@/lib/site";

// Image servie par src/app/opengraph-image.tsx (1200 × 630).
export const IMAGE_PARTAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${site.name}, ${site.shortDescription}`,
};

const LOGO = { src: "/logo/ademig.png", width: 992, height: 659 };

type ImagePartage = { url: string; width?: number; height?: number; alt?: string };

// Next fusionne les métadonnées des segments de façon superficielle : une page qui ne redéfinit pas
// `openGraph` hérite de celui de l'accueil (titre et URL compris). Chaque page passe donc par ici.
export function metadonneesPage({
  titre,
  description,
  chemin,
  image,
  type = "website",
  publie,
  titreAbsolu = false,
}: {
  titre: string;
  description: string;
  chemin: string;
  image?: ImagePartage;
  type?: "website" | "article";
  publie?: string;
  // Accueil : le titre complet, sans le suffixe « | ADEMIG » du modèle.
  titreAbsolu?: boolean;
}): Metadata {
  const images = [image ?? IMAGE_PARTAGE];
  return {
    title: titreAbsolu ? { absolute: titre } : titre,
    description,
    alternates: { canonical: chemin },
    openGraph: {
      type,
      locale: site.locale,
      siteName: site.name,
      url: chemin,
      title: titre,
      description,
      images,
      ...(type === "article" && publie ? { publishedTime: publie } : {}),
    },
    twitter: { card: "summary_large_image", title: titre, description, images },
  };
}

const organisationCourte = () => ({
  "@type": "Organization",
  "@id": absoluteUrl("/#organisation"),
  name: site.name,
  url: absoluteUrl("/"),
  logo: { "@type": "ImageObject", url: absoluteUrl(LOGO.src), width: LOGO.width, height: LOGO.height },
});

export function jsonLdOrganisation({ contact, reseaux }: { contact: Contact; reseaux: Reseau[] }) {
  return {
    "@context": "https://schema.org",
    ...organisationCourte(),
    legalName: site.fullName,
    alternateName: [site.fullName, site.shortDescription],
    description: site.description,
    slogan: site.motto,
    image: absoluteUrl(LOGO.src),
    email: contact.email,
    ...(contact.phone ? { telephone: contact.phone } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address.street,
      postOfficeBoxNumber: contact.address.postalBox,
      addressLocality: contact.address.city,
      addressCountry: "SN",
    },
    areaServed: { "@type": "Country", name: "Sénégal" },
    knowsAbout: ["Mines", "Géologie", "Pétrole", "Gaz", "Géomatique", "Environnement", "Contenu local"],
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "École nationale supérieure des mines et de la géologie (ENSMG)",
      url: site.ecole.url,
    },
    sameAs: reseaux.map((r) => r.url),
  };
}

// Aide Google à afficher « ADEMIG » comme nom du site dans ses résultats.
export function jsonLdSiteWeb() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#site"),
    name: site.name,
    alternateName: site.fullName,
    url: absoluteUrl("/"),
    inLanguage: "fr",
    publisher: { "@id": absoluteUrl("/#organisation") },
  };
}

export function jsonLdFilAriane(etapes: { nom: string; chemin: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ nom: "Accueil", chemin: "/" }, ...etapes].map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: e.nom,
      item: absoluteUrl(e.chemin),
    })),
  };
}

// Les blocs JSON-LD d'une page sont lus séparément : auteur et organisateur sont décrits en entier
// plutôt que par un simple renvoi à l'organisation du pied de page.
export function jsonLdArticle(a: Pick<Actualite, "slug" | "titre" | "date" | "resume" | "photos">) {
  const images = a.photos?.map((p) => absoluteUrl(p.src));
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: a.titre,
    description: a.resume,
    datePublished: a.date,
    inLanguage: "fr",
    ...(images?.length ? { image: images } : {}),
    mainEntityOfPage: absoluteUrl(`/actualites/${a.slug}`),
    author: organisationCourte(),
    publisher: organisationCourte(),
  };
}

export function jsonLdEvenement(
  e: Pick<Evenement, "slug" | "titre" | "debut" | "fin" | "resume" | "lieu" | "affiche" | "photos">,
) {
  const visuel = e.affiche ?? e.photos?.[0];
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.titre,
    description: e.resume,
    startDate: e.debut,
    endDate: e.fin ?? e.debut,
    inLanguage: "fr",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: e.lieu.nom,
      address: { "@type": "PostalAddress", addressLocality: e.lieu.ville, addressCountry: "SN" },
    },
    organizer: organisationCourte(),
    url: absoluteUrl(`/evenements/${e.slug}`),
    ...(visuel ? { image: [absoluteUrl(visuel.src)] } : {}),
  };
}
