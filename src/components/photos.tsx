import Image from "next/image";
import type { Photo } from "@/lib/content/types";

export function PhotoCadre({
  photo,
  priority = false,
  sizes = "(min-width: 1024px) 1000px, 92vw",
  className = "",
}: {
  photo: Photo;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  return (
    <figure data-anim className={className}>
      <Image
        src={photo.src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        priority={priority}
        sizes={sizes}
        className="w-full border-[1.5px] border-encre object-cover"
      />
      {photo.credit && <figcaption className="mt-1.5 text-sm">Photo : {photo.credit}</figcaption>}
    </figure>
  );
}

// Galerie : les photos gardent une hauteur commune pour s'aligner proprement.
export function Galerie({ photos }: { photos: Photo[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((p) => (
        <figure key={p.src} data-anim>
          <Image
            src={p.src}
            alt={p.alt}
            width={p.width}
            height={p.height}
            sizes="(min-width: 1024px) 340px, (min-width: 640px) 46vw, 92vw"
            className="aspect-[3/2] w-full border-[1.5px] border-encre object-cover"
          />
          {p.credit && <figcaption className="mt-1.5 text-sm">Photo : {p.credit}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

// Vignette d'une liste d'articles ou d'événements.
export function Vignette({ photo, className = "" }: { photo: Photo; className?: string }) {
  return (
    <Image
      src={photo.src}
      alt=""
      width={photo.width}
      height={photo.height}
      sizes="(min-width: 640px) 260px, 92vw"
      className={`aspect-[3/2] w-full shrink-0 border-[1.5px] border-encre object-cover sm:w-60 ${className}`}
    />
  );
}
