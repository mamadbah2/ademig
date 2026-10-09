import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EnvoiImages } from "@/components/admin/envoi-images";
import { Bouton, Champ, EtatVide, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerMedias } from "@/db/operations/media";
import { exigerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Médiathèque" };

export default async function Medias({ searchParams }: PageProps<"/admin/medias">) {
  await exigerSession();
  const { q } = await searchParams;
  const recherche = typeof q === "string" ? q : "";
  const medias = await listerMedias(db, recherche);

  return (
    <>
      <TitrePage>Médiathèque</TitrePage>
      <section aria-labelledby="ajouter" className="border-[1.5px] border-encre p-5 sm:p-6">
        <h2 id="ajouter" className="font-titre text-2xl">
          Ajouter des images
        </h2>
        <p className="mt-1">
          JPEG, PNG, WebP, AVIF ou SVG, 10 Mo maximum. Les photos sont réduites à 2000 px avant l&apos;envoi.
        </p>
        <EnvoiImages />
      </section>

      <form role="search" className="mt-10 flex flex-wrap items-end gap-3">
        <Champ label="Rechercher une image" name="q" type="search" defaultValue={recherche} className="w-full max-w-sm" />
        <Bouton type="submit" variante="secondaire">
          Rechercher
        </Bouton>
      </form>

      {medias.length === 0 ? (
        <div className="mt-6">
          <EtatVide>{recherche ? `Aucune image ne correspond à « ${recherche} ».` : "Aucune image pour le moment."}</EtatVide>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {medias.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/medias/${m.id}`}
                className="block border-[1.5px] border-encre bg-white hover:bg-sable focus-visible:outline-3 focus-visible:outline-moutarde"
              >
                <span className="flex aspect-square items-center justify-center overflow-hidden p-2">
                  <Image
                    src={m.url}
                    alt=""
                    width={m.width}
                    height={m.height}
                    sizes="(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 45vw"
                    unoptimized={m.mime === "image/svg+xml"}
                    className="max-h-full w-auto object-contain"
                  />
                </span>
                <span className="block truncate border-t border-encre px-2 py-1.5 text-sm">{m.alt}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
