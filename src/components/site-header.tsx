"use client";

import gsap from "gsap";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { navigation, site } from "@/lib/site";
import { Illustration } from "./illustration";
import { Logo } from "./logo";

function estActif(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [cache, setCache] = useState(false);
  const [decolle, setDecolle] = useState(false);
  const menu = useRef<HTMLDivElement>(null);

  // La barre se range quand on descend et revient dès qu'on remonte.
  useEffect(() => {
    let dernier = window.scrollY;
    const surDefilement = () => {
      const y = window.scrollY;
      setCache(y > dernier && y > 160);
      setDecolle(y > 24);
      dernier = y;
    };
    window.addEventListener("scroll", surDefilement, { passive: true });
    return () => window.removeEventListener("scroll", surDefilement);
  }, []);

  // Menu plein écran : les strates balaient l'écran, puis les liens montent un à un.
  useEffect(() => {
    const el = menu.current;
    if (!el) return;
    document.documentElement.style.overflow = ouvert ? "hidden" : "";
    if (!ouvert) return;

    const surTouche = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", surTouche);
    el.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });

    const ctx = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap
        .timeline({ defaults: { ease: "power4.out" } })
        .fromTo(
          "[data-menu-strate]",
          { yPercent: 100 },
          { yPercent: 0, duration: 0.55, stagger: 0.07, ease: "power4.inOut" },
        )
        .fromTo(
          "[data-menu-lien]",
          { yPercent: 120, rotation: 5 },
          { yPercent: 0, rotation: 0, duration: 0.7, stagger: 0.05 },
          0.35,
        )
        .fromTo(
          "[data-menu-pied] > *",
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.08 },
          0.6,
        )
        .fromTo("[data-menu-engin]", { x: 260 }, { x: 0, duration: 1, ease: "power3.out" }, 0.55);
    }, el);

    return () => {
      window.removeEventListener("keydown", surTouche);
      ctx.revert();
      document.documentElement.style.overflow = "";
    };
  }, [ouvert]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-transform duration-300 ${
          cache && !ouvert ? "-translate-y-full" : ""
        }`}
      >
        <div
          className={`transition-[background-color,box-shadow] duration-300 ${
            decolle || ouvert ? "bg-papier shadow-[0_1.5px_0_var(--color-encre)]" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-6 px-5 py-3 sm:px-10 lg:px-16 lg:py-4 2xl:px-24">
            <Link href="/" aria-label="ADEMIG, accueil" className="flex items-center gap-3" onClick={() => setOuvert(false)}>
              <Logo priority className="h-14 w-auto sm:h-16" />
              <span className="hidden text-sm whitespace-nowrap sm:inline lg:hidden">
                Ingénieurs diplômés de l&apos;ENSMG
              </span>
            </Link>

            <button
              type="button"
              className="flex h-11 items-center gap-2.5 border-[1.5px] border-encre bg-moutarde px-3.5 font-bold transition-transform active:scale-95 lg:hidden"
              aria-expanded={ouvert}
              aria-controls="menu-principal"
              onClick={() => setOuvert((v) => !v)}
            >
              <span aria-hidden className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 h-[2px] w-full bg-encre transition-all duration-300 ${
                    ouvert ? "top-[5px] rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 h-[2px] w-full bg-encre transition-all duration-300 ${
                    ouvert ? "top-[5px] -rotate-45" : "top-[10px]"
                  }`}
                />
              </span>
              {ouvert ? "Fermer" : "Menu"}
            </button>

            <nav aria-label="Navigation principale" className="hidden lg:block">
              <ul className="flex gap-1">
                {navigation.slice(1).map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={estActif(pathname, item.href) ? "page" : undefined}
                      className="block border border-transparent px-2.5 py-1 whitespace-nowrap hover:border-encre aria-[current=page]:border-encre aria-[current=page]:bg-moutarde"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      {ouvert && (
        <div
          ref={menu}
          id="menu-principal"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-lenis-prevent
          className="fixed inset-0 z-40 overflow-hidden lg:hidden"
        >
          <span aria-hidden data-menu-strate className="absolute inset-0 bg-brun" />
          <span aria-hidden data-menu-strate className="absolute inset-0 bg-moutarde" />
          <div
            data-menu-strate
            className="absolute inset-0 flex flex-col overflow-y-auto bg-papier bg-[url(/illustrations/paper.webp)] bg-[length:1400px_auto] px-5 pt-24 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <nav aria-label="Navigation principale">
              <ul>
                {navigation.map((item) => (
                  <li key={item.href} className="overflow-hidden py-0.5">
                    <Link
                      data-menu-lien
                      href={item.href}
                      onClick={() => setOuvert(false)}
                      aria-current={estActif(pathname, item.href) ? "page" : undefined}
                      className="font-titre inline-block origin-left py-1.5 text-[clamp(2rem,9.5vw,3.25rem)] leading-tight active:text-brun aria-[current=page]:text-brun aria-[current=page]:underline aria-[current=page]:decoration-moutarde aria-[current=page]:decoration-4 aria-[current=page]:underline-offset-8"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div data-menu-pied className="relative mt-auto pt-10">
              <p>
                <span className="inline-block border border-encre bg-moutarde px-3 py-1.5">
                  {site.motto}
                </span>
              </p>
              <p className="mt-4">
                <a href={`mailto:${site.contact.email}`} className="font-bold underline underline-offset-4">
                  {site.contact.email}
                </a>
              </p>
              <div data-menu-engin className="absolute right-0 bottom-0 w-36">
                <Illustration name="excavator" role="libre" className="w-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
