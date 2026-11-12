import { draftMode } from "next/headers";
import type { ReactNode } from "react";
import { Animations } from "@/components/animations";
import { BandeauApercu } from "@/components/bandeau-apercu";
import { Chargement } from "@/components/chargement";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { JsonLd } from "@/components/ui";
import { getReglages } from "@/lib/content/reglages";
import { jsonLdOrganisation } from "@/lib/seo";

// Posé avant le contenu : masque les cadres que GSAP fera entrer, sans flash de contenu.
// Si les scripts ne démarrent pas, tout redevient visible au bout de dix secondes.
const amorceAnimations = `(function(){var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("anim");setTimeout(function(){if(!("animPret" in d.dataset))d.classList.remove("anim")},10000)})()`;

// En-tête, pied de page, données structurées et animations du site public.
export async function CoquilleSite({
  children,
  chargement = true,
  rail = true,
}: {
  children: ReactNode;
  // Écran de chargement : réservé au site public.
  chargement?: boolean;
  // Rail et wagonnet de progression, fixés en bas de l'écran : absents de l'espace membre.
  rail?: boolean;
}) {
  const apercu = (await draftMode()).isEnabled;
  const { contact, reseaux } = await getReglages();
  const organisation = jsonLdOrganisation({ contact, reseaux });

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: amorceAnimations }} />
      <noscript>
        <style>{`[data-cadre]{opacity:1!important}#chargement{display:none}`}</style>
      </noscript>
      {chargement && <Chargement />}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-marine focus:px-4 focus:py-2 focus:text-papier"
      >
        Aller au contenu
      </a>
      <JsonLd data={organisation} />
      <SiteHeader email={contact.email} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Animations rail={rail} />
      {apercu && <BandeauApercu />}
    </>
  );
}
