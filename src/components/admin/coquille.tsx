"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { LIBELLES_ROLES, type Role } from "@/lib/roles";

const liens: { href: string; libelle: string; superadmin?: boolean }[] = [
  { href: "/admin", libelle: "Tableau de bord" },
  { href: "/admin/actualites", libelle: "Actualités" },
  { href: "/admin/evenements", libelle: "Événements" },
  { href: "/admin/membres", libelle: "Membres" },
  { href: "/admin/bureau", libelle: "Bureau" },
  { href: "/admin/partenaires", libelle: "Partenaires" },
  { href: "/admin/medias", libelle: "Médiathèque" },
  { href: "/admin/reglages", libelle: "Réglages" },
  { href: "/admin/comptes", libelle: "Comptes", superadmin: true },
];

const lienStyle = "block min-h-11 px-3 py-2.5 font-bold focus-visible:outline-3 focus-visible:outline-moutarde";

export function CoquilleAdmin({ nom, role, children }: { nom: string; role: Role; children: ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);

  async function deconnecter() {
    await authClient.signOut();
    router.push("/admin/connexion");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <header className="flex items-center justify-between border-b-[1.5px] border-encre px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-titre text-xl">
          ADEMIG · Admin
        </Link>
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls="menu-admin"
          onClick={() => setOuvert(!ouvert)}
          className="min-h-11 border-[1.5px] border-encre px-4 font-bold"
        >
          {ouvert ? "Fermer" : "Menu"}
        </button>
      </header>

      <nav
        id="menu-admin"
        aria-label="Administration"
        className={`${ouvert ? "block" : "hidden"} border-b-[1.5px] border-encre bg-sable lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto lg:border-r-[1.5px] lg:border-b-0`}
      >
        <div className="hidden px-6 pt-8 lg:block">
          <Link href="/admin" className="font-titre text-3xl">
            ADEMIG
          </Link>
          <p className="text-sm">Administration</p>
        </div>
        <ul className="px-3 py-4">
          {liens
            .filter((l) => !l.superadmin || role === "superadmin")
            .map((l) => {
              const actif = l.href === "/admin" ? chemin === "/admin" : chemin.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={actif ? "page" : undefined}
                    onClick={() => setOuvert(false)}
                    className={`${lienStyle} ${actif ? "bg-brun text-papier" : "hover:bg-papier"}`}
                  >
                    {l.libelle}
                  </Link>
                </li>
              );
            })}
        </ul>
        <div className="border-t-[1.5px] border-encre px-3 py-4">
          <p className="px-3 text-sm">
            {nom} · {LIBELLES_ROLES[role]}
          </p>
          <ul className="mt-2">
            <li>
              <Link href="/admin/mon-compte" onClick={() => setOuvert(false)} className={`${lienStyle} hover:bg-papier`}>
                Mon compte
              </Link>
            </li>
            <li>
              <a href="/" target="_blank" rel="noopener" className={`${lienStyle} hover:bg-papier`}>
                Voir le site
              </a>
            </li>
            <li>
              <button type="button" onClick={deconnecter} className={`${lienStyle} w-full text-left hover:bg-papier`}>
                Se déconnecter
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <main id="contenu-admin" className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
