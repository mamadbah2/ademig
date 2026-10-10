"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { quitterApercu } from "@/lib/admin/apercu-actions";

// Barre fixe en bas d'écran : ne gêne ni l'en-tête du site ni ses animations.
export function BandeauApercu() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-center gap-3 border-t-[1.5px] border-encre bg-moutarde px-4 py-3 text-encre">
      <p className="font-bold">Aperçu : ce contenu n&apos;est peut-être pas publié.</p>
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            await quitterApercu();
            router.refresh();
          })
        }
        className="min-h-11 border-[1.5px] border-encre bg-papier px-4 font-bold focus-visible:outline-3 focus-visible:outline-brun"
      >
        Quitter l&apos;aperçu
      </button>
    </div>
  );
}
