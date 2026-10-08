import Link from "next/link";
import { navigation, site } from "@/lib/site";
import { Illustration } from "./illustration";
import { Logo } from "./logo";
import { Cadre, Etiquette } from "./ui";

// Reprend la diapositive de clôture du modèle : grand titre centré, casque et tas d'or.
export function SiteFooter() {
  const { address, email } = site.contact;
  return (
    <footer className="pb-16">
      <Cadre
        as="div"
        className="mt-16 text-center"
        decor={[
          { name: "tree", className: "-top-8 left-[14%]" },
          { name: "gold", className: "top-10 left-6" },
          { name: "gold", className: "bottom-24 left-[12%]" },
          { name: "tree", className: "bottom-10 left-2" },
          { name: "gold", className: "bottom-8 -right-6" },
        ]}
      >
        <Illustration
          name="helmet"
          className="absolute top-6 -right-4 hidden w-40 lg:block xl:-right-10 xl:w-48"
        />
        <Logo className="relative mx-auto h-auto w-60 sm:w-80" />
        <p className="relative mx-auto mt-3 max-w-xl text-lg">{site.fullName}</p>
        <Etiquette className="relative mt-5 text-lg">{site.motto}</Etiquette>

        <nav aria-label="Plan du site" className="relative mt-8">
          <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="underline-offset-4 hover:underline">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="relative mt-8 flex flex-wrap justify-center gap-3">
          {site.social.map((r) => (
            <li key={r.label}>
              <a
                href={r.url}
                rel="me noopener"
                className="inline-block border-[1.5px] border-encre bg-brun px-4 py-2 font-bold text-papier transition-[background-color,scale] hover:bg-encre active:scale-95"
              >
                {r.label}
              </a>
            </li>
          ))}
        </ul>

        <address className="relative mt-8 not-italic leading-relaxed">
          {address.street}, {address.postalBox}, {address.country}
          <br />
          <a href={`mailto:${email}`} className="font-bold underline underline-offset-4">
            {email}
          </a>
        </address>

        <p className="relative mt-8 text-sm">
          © {new Date().getFullYear()} ADEMIG. Illustrations et icônes : Slidesgo, Freepik et
          Flaticon.
        </p>
      </Cadre>
    </footer>
  );
}
