"use client";

import { Bouton, TitrePage } from "@/components/admin/ui";

export default function ErreurAdmin({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <TitrePage>Une erreur est survenue</TitrePage>
      <p className="max-w-xl text-lg">
        L&apos;opération n&apos;a pas pu aboutir. Réessayez dans un instant ; si le problème continue, transmettez ce
        code à l&apos;équipe technique : <code>{error.digest ?? "inconnu"}</code>.
      </p>
      <Bouton type="button" className="mt-6" onClick={() => retry()}>
        Réessayer
      </Bouton>
    </>
  );
}
