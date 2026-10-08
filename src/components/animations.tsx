"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger, SplitText);

// Toutes les animations du site. Les pages restent des composants serveur :
// elles exposent des attributs `data-*`, et ce composant les anime à chaque navigation.

// Résolue quand l'écran de chargement commence à se lever : les animations de page attendent ce signal.
let leverLeRideau: () => void = () => {};
const chargementFini = new Promise<void>((resolve) => {
  leverLeRideau = resolve;
});

const COULEURS_ECLATS = ["#e3ad46", "#ebcb91", "#bd9b68", "#5d4433", "#e3ad46"];
const FORMES_ECLATS = [
  "polygon(50% 0, 100% 40%, 80% 100%, 15% 90%, 0 35%)",
  "polygon(20% 0, 90% 10%, 100% 70%, 45% 100%, 0 60%)",
  "polygon(0 20%, 60% 0, 100% 50%, 70% 100%, 10% 85%)",
];

// Gerbe de pépites soumises à la gravité, partant du point (x, y) de la fenêtre.
function eclats(x: number, y: number, nombre: number, force: number) {
  const petitEcran = window.innerWidth < 768;
  if (petitEcran) {
    nombre = Math.ceil(nombre * 0.6);
    force *= 0.75;
  }
  for (let i = 0; i < nombre; i++) {
    const el = document.createElement("span");
    const taille = gsap.utils.random(6, 18);
    el.className = "eclat";
    Object.assign(el.style, {
      left: `${x}px`,
      top: `${y}px`,
      width: `${taille}px`,
      height: `${taille}px`,
      background: gsap.utils.random(COULEURS_ECLATS),
      clipPath: gsap.utils.random(FORMES_ECLATS),
    });
    document.body.appendChild(el);

    const angle = gsap.utils.random(-Math.PI * 0.95, -Math.PI * 0.05);
    const vitesse = gsap.utils.random(0.45, 1) * force;
    const vx = Math.cos(angle) * vitesse;
    const vy = Math.sin(angle) * vitesse;
    const spin = gsap.utils.random(-540, 540);
    const duree = gsap.utils.random(0.9, 1.5);
    const etat = { t: 0 };
    gsap.to(etat, {
      t: duree,
      duration: duree,
      ease: "none",
      onUpdate: () => {
        const t = etat.t;
        gsap.set(el, {
          x: vx * t,
          y: vy * t + 0.5 * 1900 * t * t,
          rotation: spin * t,
          opacity: 1 - Math.max(0, t / duree - 0.7) / 0.3,
        });
      },
      onComplete: () => el.remove(),
    });
  }
}

function centre(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function secousse(cible: gsap.TweenTarget, amplitude: number) {
  gsap.fromTo(
    cible,
    { x: -amplitude },
    { x: 0, duration: 0.5, ease: `elastic.out(1.2, 0.18)`, overwrite: "auto", clearProps: "x" },
  );
}

// Éléments de contenu d'un cadre à faire entrer en cascade, sans doublon parent/enfant.
function contenuDe(cadre: HTMLElement) {
  const candidats = Array.from(
    cadre.querySelectorAll<HTMLElement>(
      "li, p, h3, dl > div, address, label, [data-anim], [data-magnet], .texte-long p",
    ),
  ).filter((el) => !el.closest("[data-marquee], [data-hero], nav ul"));
  return candidats.filter((el) => !candidats.some((autre) => autre !== el && autre.contains(el)));
}

function animerCadres() {
  gsap.utils.toArray<HTMLElement>("[data-cadre]").forEach((cadre) => {
    if (cadre.dataset.cadre === "hero") return;

    const titres = cadre.querySelectorAll("h1, h2");
    const split = titres.length
      ? SplitText.create(titres, { type: "lines,words", mask: "lines", linesClass: "ligne" })
      : null;
    const filet = (cote: string) => cadre.querySelector(`:scope > [data-filet="${cote}"]`);

    const tl = gsap.timeline({
      defaults: { ease: "power3.out" },
      scrollTrigger: { trigger: cadre, start: "top 84%", once: true },
    });
    tl.set(cadre, { opacity: 1 })
      .from(filet("haut"), { scaleX: 0, duration: 0.7, ease: "power2.inOut" }, 0)
      .from(filet("droite"), { scaleY: 0, duration: 0.5, ease: "power2.inOut" }, 0.25)
      .from(filet("bas"), { scaleX: 0, duration: 0.7, ease: "power2.inOut" }, 0.4)
      .from(filet("gauche"), { scaleY: 0, duration: 0.5, ease: "power2.inOut" }, 0.65);
    if (split) {
      tl.from(split.words, { yPercent: 115, rotation: 4, duration: 0.85, stagger: 0.045 }, 0.15);
    }
    const contenu = contenuDe(cadre);
    const decor = cadre.querySelectorAll('[data-anim-role="decor"]');
    const illus = cadre.querySelectorAll('[data-anim-role="illu"], [data-tnt]');
    if (contenu.length) {
      tl.from(contenu, { y: 34, opacity: 0, duration: 0.75, stagger: 0.055 }, 0.35);
    }
    if (decor.length) {
      tl.from(
        decor,
        { scale: 0, rotation: -30, duration: 0.7, ease: "back.out(2.4)", stagger: 0.09 },
        0.45,
      );
    }
    if (illus.length) {
      tl.from(
        illus,
        { y: 70, opacity: 0, scale: 0.8, rotation: 6, duration: 1.1, ease: "back.out(1.5)" },
        0.3,
      );
    }
  });
}

function animerParallaxe() {
  gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((el) => {
    gsap.to(el, {
      yPercent: Number(el.dataset.parallax),
      ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
    });
  });
}

function animerGraphiques() {
  gsap.utils.toArray<HTMLElement>("[data-compte]").forEach((el) => {
    const cible = Number(el.dataset.compte);
    const decimales = Number(el.dataset.decimales ?? 0);
    const etat = { v: 0 };
    const ecrire = () => {
      el.textContent = etat.v.toLocaleString("fr-FR", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      });
    };
    gsap.to(etat, {
      v: cible,
      duration: 2,
      ease: "power2.out",
      onUpdate: ecrire,
      scrollTrigger: { trigger: el, start: "top 88%", once: true },
    });
    ecrire();
  });

  gsap.utils.toArray<HTMLElement>("[data-barre]").forEach((el) => {
    gsap.from(el, {
      scaleX: 0,
      duration: 1.4,
      ease: "power3.inOut",
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });
  });

  gsap.utils.toArray<HTMLElement>("[data-camembert]").forEach((el) => {
    gsap.fromTo(
      el,
      { "--p": 0, rotation: -120, scale: 0.7 },
      {
        "--p": 1,
        rotation: 0,
        scale: 1,
        duration: 1.8,
        ease: "power3.inOut",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      },
    );
  });
}

// Bandeau défilant dont la vitesse et l'inclinaison suivent la vitesse de défilement.
function animerBandeaux() {
  gsap.utils.toArray<HTMLElement>("[data-marquee]").forEach((bandeau) => {
    const piste = bandeau.querySelector<HTMLElement>("[data-marquee-piste]");
    if (!piste) return;
    const boucle = gsap.to(piste, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
    const incliner = gsap.quickTo(piste, "skewX", { duration: 0.4, ease: "power3.out" });
    ScrollTrigger.create({
      trigger: bandeau,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        const v = gsap.utils.clamp(-3000, 3000, self.getVelocity());
        gsap.to(boucle, { timeScale: 1 + Math.abs(v) / 250, duration: 0.2, overwrite: true });
        gsap.to(boucle, { timeScale: 1, duration: 1.2, delay: 0.2 });
        incliner(v / -180);
      },
    });
  });
}

function animerHero(nettoyages: (() => void)[]) {
  const scene = document.querySelector<HTMLElement>("[data-hero-scene]");
  if (!scene) return;
  const q = (nom: string) => scene.querySelector<HTMLElement>(`[data-hero="${nom}"]`);
  const titre = q("titre");
  const texte = q("texte");
  const fond = scene.querySelector<HTMLElement>("[data-hero-fond]");
  if (!titre || !texte || !fond) return;

  const etiquette = texte.querySelector(":scope > span");
  const boutons = scene.querySelectorAll('[data-hero="boutons"] > *');
  const diapos = gsap.utils.toArray<HTMLElement>(scene.querySelectorAll("[data-hero-diapo]"));
  const reperes = gsap.utils.toArray<HTMLElement>(scene.querySelectorAll("[data-hero-repere]"));
  const jauges = gsap.utils.toArray<HTMLElement>(scene.querySelectorAll("[data-hero-jauge]"));
  const split = SplitText.create(titre, { type: "words,chars" });

  // 1. Entrée : le paysage se pose, les lettres tombent comme des blocs et soulèvent des pépites.
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.set(texte, { opacity: 1 })
    .fromTo(fond, { scale: 1.18 }, { scale: 1, duration: 2.6, ease: "power3.out" }, 0)
    .from(
      split.chars,
      {
        y: () => gsap.utils.random(-320, -140),
        rotation: () => gsap.utils.random(-50, 50),
        opacity: 0,
        duration: 1,
        ease: "bounce.out",
        stagger: { each: 0.022, from: "random" },
      },
      0.1,
    )
    .add(() => {
      const r = titre.getBoundingClientRect();
      eclats(r.left + r.width * 0.35, r.bottom, 22, 800);
    }, 0.75)
    .from(etiquette, { clipPath: "inset(0 100% 0 0)", duration: 0.7, ease: "power3.inOut" }, 0.9)
    .from(boutons, { y: 26, opacity: 0, duration: 0.6, stagger: 0.1 }, 1.15);
  if (reperes.length) tl.from(reperes, { y: 20, opacity: 0, duration: 0.6, stagger: 0.08 }, 1.3);

  // 2. Diaporama : chaque univers reste six secondes, avec un lent zoom arrière et un fondu.
  if (diapos.length > 1) {
    const DUREE = 6;
    let courant = 0;
    const montrer = (i: number, immediat = false) => {
      reperes.forEach((r, k) => gsap.to(r, { opacity: k === i ? 1 : 0.6, duration: 0.4 }));
      jauges.forEach((j, k) => k !== i && gsap.set(j, { scaleX: 0 }));
      gsap.fromTo(jauges[i], { scaleX: 0 }, { scaleX: 1, duration: DUREE, ease: "none" });
      gsap.fromTo(diapos[i], { scale: 1.12 }, { scale: 1, duration: DUREE + 2, ease: "none" });
      if (!immediat) {
        gsap.set(diapos[i], { zIndex: 1 });
        gsap.fromTo(diapos[i], { opacity: 0 }, { opacity: 1, duration: 1.6, ease: "power2.inOut" });
        const precedent = diapos[courant];
        gsap.set(precedent, { zIndex: 0 });
        gsap.to(precedent, { opacity: 0, duration: 0.1, delay: 1.6 });
      }
      courant = i;
    };
    montrer(0, true);
    const boucle = gsap.delayedCall(DUREE, function suivant() {
      montrer((courant + 1) % diapos.length);
      boucle.restart(true);
    });
    // Le diaporama s'arrête quand le hero sort de l'écran.
    ScrollTrigger.create({
      trigger: scene,
      start: "top bottom",
      end: "bottom top",
      onLeave: () => boucle.pause(),
      onEnterBack: () => boucle.resume(),
    });
  }

  // 3. Au pointeur ou à l'inclinaison du téléphone : le paysage glisse légèrement.
  const fx = gsap.quickTo(fond, "x", { duration: 1.2, ease: "power3.out" });
  const fy = gsap.quickTo(fond, "y", { duration: 1.2, ease: "power3.out" });
  const orienter = (nx: number, ny: number) => {
    fx(nx * -22);
    fy(ny * -14);
  };
  const surPointeur = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    orienter(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
  };
  window.addEventListener("pointermove", surPointeur);
  nettoyages.push(() => window.removeEventListener("pointermove", surPointeur));

  const surInclinaison = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    orienter(
      gsap.utils.clamp(-0.5, 0.5, e.gamma / 50),
      gsap.utils.clamp(-0.5, 0.5, (e.beta - 40) / 50),
    );
  };
  type AvecPermission = { requestPermission?: () => Promise<"granted" | "denied"> };
  const demande = (window.DeviceOrientationEvent as unknown as AvecPermission | undefined)
    ?.requestPermission;
  // Sur iOS, le gyroscope exige une autorisation : on s'en passe plutôt que d'afficher une alerte.
  if (window.matchMedia("(hover: none)").matches && window.DeviceOrientationEvent && !demande) {
    window.addEventListener("deviceorientation", surInclinaison);
    nettoyages.push(() => window.removeEventListener("deviceorientation", surInclinaison));
  }

  // 4. Au défilement : le paysage descend moins vite que la page, le titre s'efface.
  const scrub = { trigger: scene, start: "top top", end: "bottom top", scrub: 0.6 };
  gsap.to(diapos, { yPercent: 12, ease: "none", scrollTrigger: scrub });
  gsap.to(texte, { yPercent: -30, opacity: 0.1, ease: "none", scrollTrigger: scrub });
}

function animerObjetsReactifs(nettoyages: (() => void)[]) {
  // Tas d'or et arbres : ils sursautent au survol, l'or perd quelques pépites.
  gsap.utils.toArray<HTMLImageElement>('[data-anim-role="decor"]').forEach((el) => {
    const estOr = el.src.includes("gold");
    const surEntree = () => {
      if (gsap.isTweening(el)) return;
      gsap
        .timeline()
        .to(el, { y: "-=22", scaleY: 1.12, scaleX: 0.92, duration: 0.18, ease: "power2.out" })
        .to(el, { y: "+=22", scaleY: 1, scaleX: 1, duration: 0.55, ease: "bounce.out" })
        .fromTo(el, { rotation: estOr ? -10 : 8 }, { rotation: 0, duration: 0.8, ease: "elastic.out(1.4, 0.3)" }, 0);
      if (estOr) {
        const c = centre(el);
        eclats(c.x, c.y, 6, 520);
      }
    };
    el.addEventListener("pointerenter", surEntree);
    nettoyages.push(() => el.removeEventListener("pointerenter", surEntree));
  });

  // Illustrations : un toucher les fait gigoter comme de la gelée.
  gsap.utils.toArray<HTMLElement>('[data-anim-role="illu"]').forEach((el) => {
    const surClic = () => {
      if (gsap.isTweening(el)) return;
      gsap
        .timeline()
        .to(el, { scaleX: 1.12, scaleY: 0.88, duration: 0.12, ease: "power2.out" })
        .to(el, { scaleX: 1, scaleY: 1, duration: 0.9, ease: "elastic.out(1.3, 0.25)" });
      const c = centre(el);
      eclats(c.x, c.y, 10, 650);
    };
    el.addEventListener("click", surClic);
    nettoyages.push(() => el.removeEventListener("click", surClic));
  });

  // Le décor penche dans le sens du défilement, d'autant plus qu'on fait défiler vite.
  const pencher = gsap.utils
    .toArray<HTMLElement>('[data-anim-role="decor"]')
    .map((el) => gsap.quickTo(el, "skewX", { duration: 0.5, ease: "power3.out" }));
  if (pencher.length) {
    let retour: gsap.core.Tween | undefined;
    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const angle = gsap.utils.clamp(-14, 14, self.getVelocity() / -140);
        pencher.forEach((p) => p(angle));
        retour?.kill();
        retour = gsap.delayedCall(0.15, () => pencher.forEach((p) => p(0)));
      },
    });
  }

  // Dynamite : la mèche frémit, puis tout saute.
  gsap.utils.toArray<HTMLElement>("[data-tnt]").forEach((tnt) => {
    let occupe = false;
    const surClic = () => {
      if (occupe) return;
      occupe = true;
      gsap
        .timeline({ onComplete: () => void (occupe = false) })
        .to(tnt, { scale: 1.12, duration: 0.5, ease: "power1.in" })
        .to(tnt, { x: 5, duration: 0.04, yoyo: true, repeat: 11, ease: "none" }, 0)
        .add(() => {
          const c = centre(tnt);
          eclats(c.x, c.y, 70, 1500);
          secousse("#contenu", 22);
        })
        .to(tnt, { scale: 0, rotation: 25, duration: 0.15, ease: "power2.in" })
        .set(tnt, { x: 0, rotation: 0 })
        .to(tnt, { scale: 1, duration: 0.9, ease: "elastic.out(1, 0.4)" }, "+=1.2");
    };
    tnt.addEventListener("click", surClic);
    nettoyages.push(() => tnt.removeEventListener("click", surClic));
  });

  // Boutons magnétiques.
  if (window.matchMedia("(hover: hover)").matches) {
    gsap.utils.toArray<HTMLElement>("[data-magnet]").forEach((el) => {
      const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      const bouger = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.3);
        y((e.clientY - r.top - r.height / 2) * 0.4);
      };
      const lacher = () => {
        x(0);
        y(0);
      };
      el.addEventListener("pointermove", bouger);
      el.addEventListener("pointerleave", lacher);
      nettoyages.push(() => {
        el.removeEventListener("pointermove", bouger);
        el.removeEventListener("pointerleave", lacher);
      });
    });
  }
}

// Attend les polices, l'image du hero et l'événement `load`, fait rouler le wagonnet
// au rythme de la progression, puis lève l'écran strate par strate.
function lancerChargement(lenis: Lenis | null) {
  const ecran = document.getElementById("chargement");
  if (!ecran || getComputedStyle(ecran).display === "none") {
    leverLeRideau();
    return;
  }
  const q = (nom: string) => ecran.querySelector<HTMLElement>(`[data-chargement="${nom}"]`);
  const papier = ecran.querySelector<HTMLElement>(".chargement-papier");
  const rail = q("rail");
  const wagon = q("wagon");
  const compteur = q("compteur");
  const tas = gsap.utils.toArray<HTMLElement>(ecran.querySelectorAll('[data-chargement="tas"]'));
  if (!papier || !rail || !wagon || !compteur) {
    ecran.style.display = "none";
    leverLeRideau();
    return;
  }

  lenis?.stop();
  ecran.style.animation = "none";
  const dejaVu = sessionStorage.getItem("chargement-vu") === "1";
  sessionStorage.setItem("chargement-vu", "1");
  const dureeMin = dejaVu ? 900 : 2200;
  const debut = performance.now();
  const ramasses = new Set<HTMLElement>();
  const etat = { v: 0 };

  const afficher = () => {
    compteur.textContent = String(Math.round(etat.v));
    papier.style.setProperty("--progres", `${etat.v}%`);
    const course = rail.clientWidth - wagon.offsetWidth;
    gsap.set(wagon, { x: (etat.v / 100) * course });
    // Le wagonnet ramasse chaque tas d'or qu'il dépasse.
    const avant = wagon.getBoundingClientRect().right - 20;
    tas.forEach((t) => {
      if (ramasses.has(t) || t.getBoundingClientRect().left > avant) return;
      ramasses.add(t);
      t.style.animation = "none";
      const c = centre(t);
      eclats(c.x, c.y, 7, 420);
      gsap.to(t, { y: -34, scale: 0, rotation: 40, duration: 0.35, ease: "power2.in" });
      gsap.fromTo(wagon, { scaleY: 0.9 }, { scaleY: 1, duration: 0.5, ease: "elastic.out(1.2, 0.3)" });
    });
  };

  // Tant que tout n'est pas prêt, la progression avance d'elle-même sans jamais atteindre 100 %.
  gsap.to(etat, { v: 88, duration: 6, ease: "power2.out", onUpdate: afficher });

  const heroImage = document.querySelector<HTMLImageElement>("[data-hero-diapo]");
  const pret = Promise.all([
    document.fonts.ready,
    new Promise<void>((r) => {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", () => r(), { once: true });
    }),
    heroImage ? heroImage.decode().catch(() => undefined) : undefined,
    new Promise((r) => setTimeout(r, dureeMin)),
  ]);

  pret.then(() => {
    const restant = Math.max(0, dureeMin - (performance.now() - debut));
    gsap.to(etat, {
      v: 100,
      duration: 0.7,
      delay: restant / 1000,
      ease: "power2.inOut",
      overwrite: true,
      onUpdate: afficher,
      onComplete: sortir,
    });
  });

  function sortir() {
    const strates = gsap.utils.toArray<HTMLElement>(ecran!.querySelectorAll(".chargement-strate"));
    gsap
      .timeline({
        onComplete: () => {
          // Nœud rendu par React : on le masque, on ne le retire pas du DOM.
          ecran!.style.display = "none";
          lenis?.start();
        },
      })
      .to(wagon, { x: `+=${window.innerWidth * 1.2}`, duration: 0.7, ease: "power3.in" }, 0.1)
      .to(".chargement-mot", { scale: 1.06, duration: 0.25, ease: "power2.out" }, 0)
      .to(".chargement-mot", { yPercent: -60, opacity: 0, duration: 0.5, ease: "power3.in" }, 0.25)
      .to(
        ".chargement-devise, .chargement-compteur, .chargement-rail",
        { y: 40, opacity: 0, duration: 0.4, ease: "power2.in", stagger: 0.05 },
        0.3,
      )
      // Le papier puis les trois strates remontent en cascade et dévoilent la page.
      .to(papier, { yPercent: -100, duration: 0.85, ease: "power4.inOut" }, 0.65)
      .to([...strates].reverse(), { yPercent: -100, duration: 0.85, ease: "power4.inOut", stagger: 0.11 }, 0.76)
      .add(leverLeRideau, 1.15);
  }
}

export function Animations() {
  const pathname = usePathname();
  const lenis = useRef<Lenis | null>(null);
  const curseur = useRef<HTMLSpanElement>(null);
  const wagon = useRef<HTMLImageElement>(null);

  // Défilement fluide, curseur et wagonnet de progression : une seule fois pour tout le site.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      leverLeRideau();
      return;
    }

    const instance = new Lenis({ lerp: 0.1, anchors: true });
    lenis.current = instance;
    lancerChargement(instance);
    instance.on("scroll", ScrollTrigger.update);
    const tic = (t: number) => instance.raf(t * 1000);
    gsap.ticker.add(tic);
    gsap.ticker.lagSmoothing(0);

    const point = curseur.current;
    let surPointeur: ((e: PointerEvent) => void) | undefined;
    if (point && window.matchMedia("(hover: hover)").matches) {
      const x = gsap.quickTo(point, "x", { duration: 0.25, ease: "power3.out" });
      const y = gsap.quickTo(point, "y", { duration: 0.25, ease: "power3.out" });
      surPointeur = (e) => {
        x(e.clientX);
        y(e.clientY);
        const actif = (e.target as Element).closest?.(
          'a, button, input, select, [data-anim-role="decor"], [data-anim-role="illu"]',
        );
        gsap.to(point, { scale: actif ? 4 : 1, opacity: actif ? 0.55 : 0.9, duration: 0.3, overwrite: "auto" });
      };
      window.addEventListener("pointermove", surPointeur);
    }

    return () => {
      gsap.ticker.remove(tic);
      instance.destroy();
      lenis.current = null;
      if (surPointeur) window.removeEventListener("pointermove", surPointeur);
    };
  }, []);

  // Animations de page, reconstruites à chaque navigation.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ctx: gsap.Context | undefined;
    let annule = false;
    const nettoyages: (() => void)[] = [];
    lenis.current?.scrollTo(0, { immediate: true });

    Promise.all([document.fonts.ready, chargementFini]).then(() => {
      if (annule) return;
      ctx = gsap.context(() => {
        animerHero(nettoyages);
        animerCadres();
        animerParallaxe();
        animerGraphiques();
        animerBandeaux();
        animerObjetsReactifs(nettoyages);

        // Le wagonnet roule sur son rail au rythme du défilement.
        if (wagon.current) {
          gsap.fromTo(
            wagon.current,
            { x: 0 },
            {
              x: () => window.innerWidth - (wagon.current?.offsetWidth ?? 46),
              ease: "none",
              scrollTrigger: { start: 0, end: "max", scrub: 0.5, invalidateOnRefresh: true },
            },
          );
        }
      });
      document.documentElement.dataset.animPret = "";
      ScrollTrigger.refresh();
    });

    return () => {
      annule = true;
      nettoyages.forEach((n) => n());
      ctx?.revert();
    };
  }, [pathname]);

  return (
    <>
      <span ref={curseur} aria-hidden className="curseur" />
      <div aria-hidden className="rail">
        {/* eslint-disable-next-line @next/next/no-img-element -- SVG décoratif */}
        <img ref={wagon} src="/illustrations/wagon.svg" alt="" width={190} height={167} />
      </div>
    </>
  );
}
