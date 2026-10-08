import Image from "next/image";

// Portrait d'un membre en médaillon ovale, comme sur les fiches officielles du bureau.
// Sans photo, le médaillon affiche les initiales.
export function Portrait({
  nom,
  photo,
  taille = "md",
  priority = false,
}: {
  nom: string;
  photo?: string;
  taille?: "md" | "lg";
  priority?: boolean;
}) {
  const dimensions = taille === "lg" ? "w-36 sm:w-40" : "w-20";
  const cadre = `aspect-[3/4] shrink-0 overflow-hidden rounded-[50%] border-[1.5px] border-encre bg-sable ${dimensions}`;

  if (photo) {
    return (
      <span data-anim className={`block ${cadre}`}>
        <Image
          src={photo}
          alt={`Portrait de ${nom}`}
          width={360}
          height={480}
          sizes={taille === "lg" ? "160px" : "80px"}
          priority={priority}
          className="size-full object-cover"
        />
      </span>
    );
  }

  const initiales = nom
    .replace(/^Dr\.?\s+/, "")
    .split(/\s+/)
    .map((mot) => mot[0])
    .slice(0, 2)
    .join("");
  return (
    <span
      aria-hidden
      data-anim
      className={`font-titre flex items-center justify-center text-brun ${cadre} ${
        taille === "lg" ? "text-5xl" : "text-2xl"
      }`}
    >
      {initiales}
    </span>
  );
}
