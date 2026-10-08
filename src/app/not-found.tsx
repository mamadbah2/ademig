import { Illustration } from "@/components/illustration";
import { Bouton, Cadre, Etiquette } from "@/components/ui";

export default function NotFound() {
  return (
    <Cadre as="div" className="py-20 text-center">
      <h1 className="font-titre text-6xl sm:text-8xl">Page introuvable</h1>
      <Etiquette className="mt-5 text-lg">
        Cette adresse ne correspond à aucune page du site. Elle a peut-être été déplacée.
      </Etiquette>
      <p className="mt-8">
        <Bouton href="/">Revenir à l&apos;accueil</Bouton>
      </p>
      <Illustration name="excavator" className="absolute -top-10 -right-6 hidden w-52 md:block" />
    </Cadre>
  );
}
