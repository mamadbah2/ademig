import Image from "next/image";

// Logo officiel de l'amicale (source : chaîne YouTube ADEMIG SN, fond blanc rendu transparent).
// `alt=""` quand le logo double un texte voisin (le titre du hero, par exemple).
export function Logo({
  className = "",
  priority = false,
  alt = "Logo de l'ADEMIG",
}: {
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src="/logo/ademig.png"
      alt={alt}
      width={992}
      height={659}
      priority={priority}
      sizes="(min-width: 640px) 260px, 180px"
      className={className}
    />
  );
}
