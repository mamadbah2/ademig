import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Decor, Illustration, type IllustrationName } from "./illustration";

// Un « cadre » reprend une diapositive du modèle : filet fin tout autour du contenu.
export function Cadre({
  children,
  className = "",
  decor,
  as: Tag = "section",
  hero = false,
  ...aria
}: {
  children: ReactNode;
  className?: string;
  decor?: ComponentProps<typeof Decor>["poses"];
  as?: "section" | "article" | "div";
  hero?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <div className="mx-auto mt-8 max-w-6xl px-4 sm:mt-10 sm:px-6">
      <Tag
        {...aria}
        data-cadre={hero ? "hero" : ""}
        className={`relative px-5 py-10 sm:px-12 sm:py-14 ${className}`}
      >
        {/* Le filet du cadre est fait de quatre traits pour pouvoir se dessiner à l'écran. */}
        {(["haut", "droite", "bas", "gauche"] as const).map((cote) => (
          <span key={cote} aria-hidden data-filet={cote} className={`filet filet-${cote}`} />
        ))}
        {decor && <Decor poses={decor} />}
        {children}
      </Tag>
    </div>
  );
}

export function Etiquette({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block border border-encre bg-moutarde px-3 py-1.5 leading-snug ${className}`}>
      {children}
    </span>
  );
}

export function Bouton({
  href,
  children,
  variante = "plein",
}: {
  href: string;
  children: ReactNode;
  variante?: "plein" | "contour";
}) {
  return (
    <Link
      href={href}
      data-magnet
      className={`inline-block border-[1.5px] border-encre px-5 py-3 font-bold transition-[color,background-color,scale] active:scale-95 ${
        variante === "plein"
          ? "bg-brun text-papier hover:bg-encre"
          : "bg-papier/60 hover:bg-sable"
      }`}
    >
      {children}
    </Link>
  );
}

export function LienSouligne(props: ComponentProps<typeof Link>) {
  return (
    <Link
      {...props}
      className={`font-bold underline decoration-moutarde decoration-2 underline-offset-4 hover:decoration-brun ${props.className ?? ""}`}
    />
  );
}

export function PageHeader({
  title,
  intro,
  illustration,
}: {
  title: string;
  intro?: ReactNode;
  illustration: IllustrationName;
}) {
  return (
    <Cadre
      as="div"
      className="flex flex-col gap-8 md:min-h-[22rem] md:flex-row md:items-center md:justify-between"
      decor={[
        { name: "gold", className: "-top-6 left-[38%]" },
        { name: "tree", className: "-bottom-7 left-[52%]" },
        { name: "gold", className: "top-8 -right-8" },
      ]}
    >
      <div className="relative max-w-2xl">
        <h1 className="font-titre text-5xl leading-[1.05] text-balance sm:text-7xl">{title}</h1>
        {intro && <Etiquette className="mt-6 text-lg">{intro}</Etiquette>}
      </div>
      <Illustration
        name={illustration}
        parallax={-18}
        className="relative -mb-16 max-h-44 w-auto self-end md:-mr-4 md:-mb-20 md:max-h-80"
      />
    </Cadre>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-titre text-3xl leading-tight sm:text-[2.6rem]">
      {children}
    </h2>
  );
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Africa/Dakar",
});

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}

export function DateTexte({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatDate(iso)}</time>;
}
