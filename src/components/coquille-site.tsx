import { draftMode } from "next/headers";
import type { ReactNode } from "react";
import { Animations } from "@/components/animations";
import { BandeauApercu } from "@/components/bandeau-apercu";
import { Chargement } from "@/components/chargement";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { JsonLd } from "@/components/ui";
import { getReglages } from "@/lib/content/reglages";
import { absoluteUrl, site } from "@/lib/site";

// Posé avant le contenu : masque les cadres que GSAP fera entrer, sans flash de contenu.
// Si les scripts ne démarrent pas, tout redevient visible au bout de dix secondes.
const amorceAnimations = `(function(){var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("anim");setTimeout(function(){if(!("animPret" in d.dataset))d.classList.remove("anim")},10000)})()`;

// En-tête, pied de page, données structurées et animations du site public.
export async function CoquilleSite({ children }: { children: ReactNode }) {
  const apercu = (await draftMode()).isEnabled;
  const { contact, reseaux } = await getReglages();
  const organisation = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organisation"),
    name: site.fullName,
    alternateName: site.name,
    url: site.url,
    slogan: site.motto,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address.street,
      postOfficeBoxNumber: contact.address.postalBox,
      addressLocality: contact.address.city,
      addressCountry: "SN",
    },
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "École nationale supérieure des mines et de la géologie (ENSMG)",
      url: "https://ensmg.ucad.sn/",
    },
    sameAs: reseaux.map((r) => r.url),
  };

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: amorceAnimations }} />
      <noscript>
        <style>{`[data-cadre]{opacity:1!important}#chargement{display:none}`}</style>
      </noscript>
      <Chargement />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brun focus:px-4 focus:py-2 focus:text-papier"
      >
        Aller au contenu
      </a>
      <JsonLd data={organisation} />
      <SiteHeader email={contact.email} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Animations />
      {apercu && <BandeauApercu />}
    </>
  );
}
