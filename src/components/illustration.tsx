// Illustrations et icônes extraites de docs/ref-design.pptx (public/illustrations).

const illustrations = {
  bulldozer: [135, 114],
  excavator: [193, 136],
  tree: [68, 62],
  gold: [68, 49],
  tnt: [184, 317],
  wagon: [190, 167],
  tools: [248, 314],
  jackhammer: [82, 154],
  "jackhammer-cable": [252, 154],
  mountain: [234, 284],
  "gold-big": [267, 191],
  worldmap: [439, 235],
  "mine-block": [287, 230],
  helmet: [158, 148],
} as const;

export type IllustrationName = keyof typeof illustrations;

export function Illustration({
  name,
  className = "",
  parallax,
  role = "illu",
}: {
  name: IllustrationName;
  className?: string;
  // Déplacement vertical au défilement, en pourcentage de la hauteur de l'image.
  parallax?: number;
  role?: "illu" | "decor" | "libre";
}) {
  const [width, height] = illustrations[name];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG décoratif, inutile de l'optimiser
    <img
      src={`/illustrations/${name}.svg`}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      data-anim-role={role}
      data-parallax={parallax}
      className={`select-none ${role === "libre" ? "pointer-events-none" : "cursor-pointer"} ${className}`}
    />
  );
}

const icones = {
  pioche: "00",
  rails: "01",
  lanterne: "02",
  wagonnets: "03",
  corde: "04",
  dynamite: "05",
  minerai: "06",
  marteau: "07",
  feu: "08",
  explosion: "09",
  pic: "10",
  engrenage: "11",
  lampe: "12",
  wagonnet: "13",
  perforateur: "14",
  convoyeur: "15",
  wagon: "16",
  pelleteuse: "17",
  partage: "18",
  masque: "19",
  lingots: "20",
  strates: "21",
  mineur: "22",
  casque: "28",
  tamis: "29",
  barriere: "30",
  gemmes: "31",
  diamant: "32",
  brouette: "34",
} as const;

export type IconeName = keyof typeof icones;

const tons = {
  moutarde: "bg-moutarde text-encre",
  brun: "bg-brun text-papier",
  ocre: "bg-ocre text-encre",
  sable: "bg-sable text-encre",
} as const;

export type Ton = keyof typeof tons;
export const ordreTons: Ton[] = ["moutarde", "ocre", "brun"];

// Carré de couleur avec icône au trait, comme sur les diapositives de contenu.
export function IconeCarre({
  icone,
  ton = "moutarde",
  taille = "md",
}: {
  icone: IconeName;
  ton?: Ton;
  taille?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      data-anim
      className={`flex shrink-0 items-center justify-center ${tons[ton]} ${
        taille === "md" ? "size-20" : "size-12"
      }`}
    >
      <span
        className={`icone ${taille === "md" ? "size-11" : "size-7"}`}
        style={{ "--src": `url(/illustrations/icons/icon-${icones[icone]}.svg)` } as React.CSSProperties}
      />
    </span>
  );
}

type Pose = { name: "gold" | "tree"; className: string };

// Tas d'or et arbres semés autour des cadres, comme sur les diapositives de section.
export function Decor({ poses }: { poses: Pose[] }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {poses.map((p, i) => (
        <Illustration
          key={p.className}
          name={p.name}
          role="decor"
          parallax={[-70, 45, -35, 60, -50, 30][i % 6]}
          // Sur mobile, seuls les éléments à cheval sur le filet haut ou bas restent : ils ne gênent jamais le texte.
          className={`pointer-events-auto absolute ${p.name === "gold" ? "w-12 md:w-[72px]" : "w-[52px] md:w-[76px]"} ${
            /(^|\s)-(top|bottom)-/.test(p.className) ? "" : "max-md:hidden"
          } ${p.className}`}
        />
      ))}
    </div>
  );
}
