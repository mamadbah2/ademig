import Image from "next/image";

// Logo officiel de l'amicale (source : chaîne YouTube ADEMIG SN, fond blanc rendu transparent).
export function Logo({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/logo/ademig.png"
      alt="Logo de l'ADEMIG"
      width={992}
      height={659}
      priority={priority}
      sizes="(min-width: 640px) 260px, 180px"
      className={className}
    />
  );
}
