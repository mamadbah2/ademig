import { Etiquette } from "./ui";

// Grand chiffre brun et son étiquette moutarde.
export function GrandChiffre({ valeur, legende }: { valeur: number; legende: string }) {
  return (
    <div className="text-center">
      <p className="font-titre text-6xl leading-none text-brun tabular-nums sm:text-7xl" data-compte={valeur}>
        {valeur.toLocaleString("fr-FR")}
      </p>
      <Etiquette className="mt-3">{legende}</Etiquette>
    </div>
  );
}

// Pourcentage avec barre de progression encadrée.
export function BarrePourcentage({
  pourcentage,
  titre,
  texte,
}: {
  pourcentage: number;
  titre: string;
  texte: string;
}) {
  return (
    <div className="text-center">
      <p className="font-titre text-6xl leading-none text-brun tabular-nums">
        <span data-compte={pourcentage}>{pourcentage.toLocaleString("fr-FR")}</span> %
      </p>
      <div
        role="img"
        aria-label={`${pourcentage.toLocaleString("fr-FR")} %`}
        className="mx-auto mt-4 h-8 w-48 border border-encre bg-papier"
      >
        <div
          data-barre
          className="h-full origin-left border-r border-encre bg-moutarde"
          style={{ width: `${pourcentage}%` }}
        />
      </div>
      <h3 className="font-titre mt-5 text-2xl">{titre}</h3>
      <p className="mx-auto mt-2 max-w-xs leading-relaxed">{texte}</p>
    </div>
  );
}

type Part = { label: string; detail: string; pourcentage: number; couleur: "moutarde" | "ocre" | "brun" };

const couleurs = { moutarde: "#e3ad46", ocre: "#bd9b68", brun: "#5d4433" };
const couleursTexte = { moutarde: "text-moutarde", ocre: "text-ocre", brun: "text-brun" };

// Camembert à aplats, avec la légende chiffrée à gauche.
export function Camembert({ parts, titre }: { parts: Part[]; titre: string }) {
  const arrets = parts
    .map((p, i) => {
      const debut = parts.slice(0, i).reduce((somme, q) => somme + q.pourcentage, 0);
      return `${couleurs[p.couleur]} calc(${debut}% * var(--p, 1)) calc(${debut + p.pourcentage}% * var(--p, 1))`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-10 md:flex-row md:justify-center md:gap-16">
      <dl className="space-y-6">
        {parts.map((p) => (
          <div key={p.label} className="flex items-center justify-end gap-4 sm:gap-5">
            <div className="text-right">
              <dt className="font-titre text-2xl">{p.label}</dt>
              <dd className="max-w-52">{p.detail}</dd>
            </div>
            <dd className={`font-titre w-52 text-5xl leading-none whitespace-nowrap sm:w-64 sm:text-6xl ${couleursTexte[p.couleur]}`}>
              <span data-compte={p.pourcentage} data-decimales="1">
                {p.pourcentage.toLocaleString("fr-FR")}
              </span>{" "}
              %
            </dd>
          </div>
        ))}
      </dl>
      <div
        role="img"
        aria-label={titre}
        data-camembert
        className="size-56 shrink-0 rounded-full sm:size-64"
        style={{ background: `conic-gradient(${arrets}, transparent 0)` }}
      />
    </div>
  );
}
