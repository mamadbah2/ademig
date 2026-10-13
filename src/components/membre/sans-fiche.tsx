import { Cadre } from "@/components/ui";

// Compte connecté sans fiche rattachée (ou fiche introuvable) : on explique au lieu d'échouer.
export function SansFiche({ titre }: { titre: string }) {
  return (
    <Cadre as="div" className="mx-auto max-w-xl">
      <h1 className="font-titre text-4xl text-marine sm:text-5xl">{titre}</h1>
      <p className="mt-4">Aucune fiche membre n&apos;est liée à votre compte : contactez le bureau.</p>
    </Cadre>
  );
}
