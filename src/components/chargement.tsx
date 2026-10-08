import { site } from "@/lib/site";

const tas = [18, 34, 50, 66, 82];

// Écran de chargement, rendu côté serveur pour s'afficher dès le premier octet.
// Ses animations d'attente sont en CSS ; la progression et la sortie sont pilotées
// par `animations.tsx`.
export function Chargement() {
  return (
    <div id="chargement" role="status" aria-label="Chargement du site">
      {/* Strates découvertes une à une à la sortie. */}
      <span aria-hidden className="chargement-strate bg-brun" />
      <span aria-hidden className="chargement-strate bg-moutarde" />
      <span aria-hidden className="chargement-strate bg-ocre" />

      <div className="chargement-papier" aria-hidden>
        <div className="chargement-cadre" />

        <div className="chargement-centre">
          <p className="chargement-mot font-titre">
            <span className="chargement-mot-fond">ADEMIG</span>
            <span className="chargement-mot-plein">ADEMIG</span>
          </p>

          <div className="chargement-rail" data-chargement="rail">
            {tas.map((gauche) => (
              // eslint-disable-next-line @next/next/no-img-element -- SVG décoratif
              <img
                key={gauche}
                data-chargement="tas"
                src="/illustrations/gold.svg"
                alt=""
                width={68}
                height={49}
                className="chargement-tas"
                style={{ left: `${gauche}%`, animationDelay: `${gauche * 12}ms` }}
              />
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element -- SVG décoratif */}
            <img
              data-chargement="wagon"
              src="/illustrations/wagon.svg"
              alt=""
              width={190}
              height={167}
              className="chargement-wagon"
            />
          </div>
        </div>

        <p className="chargement-devise">
          <span className="inline-block border border-encre bg-moutarde px-3 py-1.5">{site.motto}</span>
        </p>
        <p className="chargement-compteur font-titre">
          <span data-chargement="compteur">0</span> %
        </p>
      </div>
    </div>
  );
}
