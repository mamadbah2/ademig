"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const ONGLETS = [
  { href: "/espace-membre", libelle: "Accueil" },
  { href: "/espace-membre/profil", libelle: "Profil" },
  { href: "/espace-membre/annuaire", libelle: "Annuaire" },
  { href: "/espace-membre/mot-de-passe", libelle: "Mot de passe" },
];

const base = "flex min-h-12 items-center justify-center px-1 text-center text-xs font-bold leading-tight sm:text-sm md:text-base";
const focus = "focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-moutarde";

// Onglets de l'espace membre : barre fixe en bas sur mobile, ligne sous l'en-tête sur grand écran.
// Les pages réservent `pb-20 md:pb-0` pour que la barre fixe ne cache pas leur fin.
export function NavigationMembre() {
  const chemin = usePathname();
  const router = useRouter();

  async function deconnecter() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const onglets = (
    <>
      {ONGLETS.map((o) => {
        const actif = o.href === "/espace-membre" ? chemin === o.href : chemin.startsWith(o.href);
        return (
          <li key={o.href} className="flex-1 md:flex-none">
            <Link
              href={o.href}
              aria-current={actif ? "page" : undefined}
              className={`${base} ${focus} md:px-5 ${actif ? "bg-marine text-papier" : "hover:bg-sable"}`}
            >
              {o.libelle}
            </Link>
          </li>
        );
      })}
      <li className="flex-1 md:flex-none">
        <button type="button" onClick={deconnecter} className={`${base} ${focus} w-full hover:bg-sable md:px-5`}>
          Déconnexion
        </button>
      </li>
    </>
  );

  return (
    <nav aria-label="Espace membre">
      <ul className="mx-auto mt-6 hidden max-w-6xl border-[1.5px] border-encre bg-papier md:flex">{onglets}</ul>
      <ul className="fixed inset-x-0 bottom-0 z-40 flex pb-[env(safe-area-inset-bottom)] border-t-[1.5px] border-encre bg-papier md:hidden">{onglets}</ul>
    </nav>
  );
}
