import type { ReactNode } from "react";
import { NavigationMembre } from "@/components/membre/navigation";

// Onglets communs aux pages connectées. /espace-membre/activer est hors de ce groupe : le lien d'invitation
// s'ouvre sans compte. Le `pb-20` laisse la place à la barre fixe du mobile.
export default function LayoutEspaceMembre({ children }: { children: ReactNode }) {
  return (
    <div className="pb-20 md:pb-0">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <NavigationMembre />
      </div>
      {children}
    </div>
  );
}
