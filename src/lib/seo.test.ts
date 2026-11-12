import { describe, expect, it } from "vitest";
import {
  IMAGE_PARTAGE,
  jsonLdArticle,
  jsonLdEvenement,
  jsonLdFilAriane,
  jsonLdOrganisation,
  jsonLdSiteWeb,
  metadonneesPage,
} from "./seo";
import { absoluteUrl, site } from "./site";

describe("metadonneesPage", () => {
  const m = metadonneesPage({
    titre: "Membres",
    description: "L'annuaire des membres.",
    chemin: "/membres",
  });

  it("donne à la page son titre, sa description et son URL canonique", () => {
    expect(m.title).toBe("Membres");
    expect(m.description).toBe("L'annuaire des membres.");
    expect(m.alternates?.canonical).toBe("/membres");
  });

  it("remplit tout Open Graph pour la page, pas pour l'accueil", () => {
    expect(m.openGraph).toMatchObject({
      type: "website",
      url: "/membres",
      title: "Membres",
      description: "L'annuaire des membres.",
      siteName: site.name,
      locale: site.locale,
    });
  });

  it("garde l'image de partage par défaut quand la page n'en a pas", () => {
    expect(m.openGraph?.images).toEqual([IMAGE_PARTAGE]);
    expect(m.twitter).toMatchObject({ card: "summary_large_image", images: [IMAGE_PARTAGE] });
  });

  it("prend l'image de la page quand elle en a une", () => {
    const photo = { url: "/actualites/a.jpg", width: 800, height: 600, alt: "Salle" };
    const article = metadonneesPage({
      titre: "A",
      description: "B",
      chemin: "/actualites/a",
      type: "article",
      publie: "2025-01-02",
      image: photo,
    });
    expect(article.openGraph).toMatchObject({ type: "article", publishedTime: "2025-01-02" });
    expect(article.openGraph?.images).toEqual([photo]);
  });

  it("l'accueil garde le titre complet, sans le modèle « | ADEMIG »", () => {
    const accueil = metadonneesPage({ titre: "ADEMIG, accueil", description: "x", chemin: "/", titreAbsolu: true });
    expect(accueil.title).toEqual({ absolute: "ADEMIG, accueil" });
    expect(accueil.openGraph?.title).toBe("ADEMIG, accueil");
  });
});

describe("données structurées", () => {
  it("l'organisation porte son logo, sa description et ses réseaux", () => {
    const o = jsonLdOrganisation({
      contact: {
        email: "contact@ademig.com",
        phone: "+221 77 000 00 00",
        press: { name: "", phone: "" },
        address: { street: "UCAD", postalBox: "BP 1", city: "Dakar", country: "Sénégal" },
      },
      reseaux: [{ label: "LinkedIn", url: "https://www.linkedin.com/company/ademig" }],
    });
    expect(o.telephone).toBe("+221 77 000 00 00");
    expect(o["@type"]).toBe("Organization");
    expect(o["@id"]).toBe(absoluteUrl("/#organisation"));
    expect(o.logo).toMatchObject({ "@type": "ImageObject", url: absoluteUrl("/logo/ademig.png") });
    expect(o.description).toBe(site.description);
    expect(o.sameAs).toEqual(["https://www.linkedin.com/company/ademig"]);
    expect(o.address).toMatchObject({ addressLocality: "Dakar", addressCountry: "SN" });
  });

  it("le site web se rattache à l'organisation", () => {
    const w = jsonLdSiteWeb();
    expect(w).toMatchObject({
      "@type": "WebSite",
      name: site.name,
      url: absoluteUrl("/"),
      inLanguage: "fr",
      publisher: { "@id": absoluteUrl("/#organisation") },
    });
  });

  it("le fil d'Ariane numérote ses étapes en URL absolues", () => {
    const f = jsonLdFilAriane([
      { nom: "Actualités", chemin: "/actualites" },
      { nom: "Titre", chemin: "/actualites/titre" },
    ]);
    expect(f.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Accueil", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Actualités", item: absoluteUrl("/actualites") },
      { "@type": "ListItem", position: 3, name: "Titre", item: absoluteUrl("/actualites/titre") },
    ]);
  });

  it("l'article nomme son auteur et son éditeur sans dépendre d'un autre bloc", () => {
    const a = jsonLdArticle({
      slug: "titre",
      titre: "Titre",
      date: "2025-03-01",
      resume: "Résumé",
      photos: [{ src: "/actualites/a.jpg", alt: "a", width: 1, height: 1 }],
    });
    expect(a).toMatchObject({
      "@type": "NewsArticle",
      headline: "Titre",
      datePublished: "2025-03-01",
      image: [absoluteUrl("/actualites/a.jpg")],
      mainEntityOfPage: absoluteUrl("/actualites/titre"),
      author: { "@type": "Organization", name: site.name, url: absoluteUrl("/") },
      publisher: { "@type": "Organization", name: site.name, logo: { url: absoluteUrl("/logo/ademig.png") } },
    });
  });

  it("l'événement nomme son organisateur et prend l'affiche, sinon la première photo", () => {
    const base = {
      slug: "forum",
      titre: "Forum",
      debut: "2025-05-01T09:00:00Z",
      resume: "Résumé",
      lieu: { nom: "CICAD", ville: "Diamniadio" },
    };
    const sansImage = jsonLdEvenement(base);
    expect(sansImage).toMatchObject({
      "@type": "Event",
      startDate: base.debut,
      endDate: base.debut,
      organizer: { "@type": "Organization", name: site.name, url: absoluteUrl("/") },
      location: { name: "CICAD", address: { addressLocality: "Diamniadio", addressCountry: "SN" } },
    });
    expect(sansImage.image).toBeUndefined();

    const avecPhoto = jsonLdEvenement({
      ...base,
      photos: [{ src: "https://x.public.blob.vercel-storage.com/p.jpg", alt: "", width: 1, height: 1 }],
    });
    expect(avecPhoto.image).toEqual(["https://x.public.blob.vercel-storage.com/p.jpg"]);

    const avecAffiche = jsonLdEvenement({
      ...base,
      affiche: { src: "/evenements/affiche.jpg", alt: "", width: 1, height: 1 },
    });
    expect(avecAffiche.image).toEqual([absoluteUrl("/evenements/affiche.jpg")]);
  });
});
