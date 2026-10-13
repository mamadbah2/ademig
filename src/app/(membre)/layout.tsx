import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CoquilleSite } from "@/components/coquille-site";

export const metadata: Metadata = { robots: { index: false, follow: false } };

// Même habillage que le site, sans l'écran de chargement : l'espace membre se parcourt page à page.
export default function LayoutMembre({ children }: { children: ReactNode }) {
  return <CoquilleSite chargement={false}>{children}</CoquilleSite>;
}
