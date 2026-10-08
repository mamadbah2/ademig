import type { Metadata, Viewport } from "next";
import { Lato, Lilita_One } from "next/font/google";
import { Animations } from "@/components/animations";
import { Chargement } from "@/components/chargement";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { JsonLd } from "@/components/ui";
import { absoluteUrl, site } from "@/lib/site";
import "./globals.css";

const lilita = Lilita_One({
  variable: "--font-lilita",
  subsets: ["latin"],
  weight: "400",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name}, ${site.shortDescription}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "ADEMIG",
    "ENSMG",
    "ingénieurs des mines",
    "géologie",
    "Sénégal",
    "secteur extractif",
    "contenu local",
    "UCAD",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    url: "/",
    title: `${site.name}, ${site.shortDescription}`,
    description: site.description,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#f3f0e7",
  viewportFit: "cover",
};

const organisation = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": absoluteUrl("/#organisation"),
  name: site.fullName,
  alternateName: site.name,
  url: site.url,
  slogan: site.motto,
  email: site.contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.contact.address.street,
    postOfficeBoxNumber: site.contact.address.postalBox,
    addressLocality: site.contact.address.city,
    addressCountry: "SN",
  },
  parentOrganization: {
    "@type": "CollegeOrUniversity",
    name: "École nationale supérieure des mines et de la géologie (ENSMG)",
    url: "https://ensmg.ucad.sn/",
  },
  sameAs: site.social.map((s) => s.url),
};

// Posé avant le premier rendu : masque les cadres que GSAP fera entrer, sans flash de contenu.
// Si les scripts ne démarrent pas, tout redevient visible au bout de dix secondes.
const amorceAnimations = `(function(){var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("anim");setTimeout(function(){if(!("animPret" in d.dataset))d.classList.remove("anim")},10000)})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${lilita.variable} ${lato.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: amorceAnimations }} />
        <noscript>
          <style>{`[data-cadre]{opacity:1!important}#chargement{display:none}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Chargement />
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brun focus:px-4 focus:py-2 focus:text-papier"
        >
          Aller au contenu
        </a>
        <JsonLd data={organisation} />
        <SiteHeader />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <Animations />
      </body>
    </html>
  );
}
