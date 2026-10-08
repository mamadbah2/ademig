import type { Metadata } from "next";
import { IconeCarre } from "@/components/illustration";
import { Cadre, PageHeader, SectionTitle } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contacter l'ADEMIG, l'Amicale des ingénieurs diplômés de l'ENSMG, à Dakar.",
  alternates: { canonical: "/contact" },
};

export default function Contact() {
  const { address, email, phone, press } = site.contact;
  return (
    <>
      <PageHeader
        title="Contact"
        intro="Une question, un partenariat, une demande de stage ? Écrivez-nous"
        illustration="wagon"
      />
      <Cadre as="div" className="grid gap-12 md:grid-cols-3">
        <div className="flex flex-col items-center text-center">
          <IconeCarre icone="lampe" ton="moutarde" />
          <h2 className="font-titre mt-4 text-2xl">Écrire à l&apos;amicale</h2>
          <p className="mt-2 text-lg">
            <a href={`mailto:${email}`} className="font-bold underline underline-offset-4">
              {email}
            </a>
          </p>
          {phone && (
            <p className="mt-1 text-lg">
              <a href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
            </p>
          )}
        </div>
        <div className="flex flex-col items-center text-center">
          <IconeCarre icone="explosion" ton="brun" />
          <h2 className="font-titre mt-4 text-2xl">Presse</h2>
          <p className="mt-2 text-lg">{press.name}</p>
          <p className="text-lg">
            <a href={`tel:${press.phone.replace(/\s/g, "")}`} className="font-bold underline underline-offset-4">
              {press.phone}
            </a>
          </p>
        </div>
        <div className="flex flex-col items-center text-center">
          <IconeCarre icone="rails" ton="ocre" />
          <h2 className="font-titre mt-4 text-2xl">Adresse</h2>
          <address className="mt-2 text-lg not-italic leading-relaxed">
            {address.street}
            <br />
            {address.postalBox}
            <br />
            {address.country}
          </address>
        </div>
      </Cadre>

      <Cadre aria-labelledby="reseaux" className="text-center">
        <SectionTitle id="reseaux">Suivre l&apos;amicale</SectionTitle>
        <ul className="mt-8 flex flex-wrap justify-center gap-3">
          {site.social.map((r) => (
            <li key={r.label}>
              <a
                href={r.url}
                rel="me noopener"
                className="inline-block border-[1.5px] border-encre bg-moutarde px-5 py-3 font-bold transition-[background-color,scale] hover:bg-sable active:scale-95"
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>
      </Cadre>
    </>
  );
}
