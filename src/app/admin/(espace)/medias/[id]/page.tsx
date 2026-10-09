import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireMedia, usagesMedia } from "@/db/operations/media";
import { formatOctets } from "@/lib/format";
import { exigerSession } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";
import { CopierUrl, FormulaireMedia, ZoneSuppression } from "./actions-media";

export const metadata: Metadata = { title: "Image" };

export default async function DetailMedia({ params }: PageProps<"/admin/medias/[id]">) {
  await exigerSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const media = await lireMedia(db, id);
  if (!media) notFound();
  const usages = await usagesMedia(db, id);

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/medias" className="underline underline-offset-4">
          ← Médiathèque
        </Link>
      </p>
      <TitrePage>Image</TitrePage>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <figure className="border-[1.5px] border-encre bg-white p-3">
          <Image
            src={media.url}
            alt={media.alt}
            width={media.width}
            height={media.height}
            sizes="(min-width: 1024px) 60vw, 92vw"
            unoptimized={media.mime === "image/svg+xml"}
            className="mx-auto h-auto max-h-[70vh] w-auto"
          />
        </figure>
        <div className="space-y-8">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="font-bold">Dimensions</dt>
            <dd>
              {media.width} × {media.height} px
            </dd>
            <dt className="font-bold">Poids</dt>
            <dd>{media.taille ? formatOctets(media.taille) : "inconnu"}</dd>
            <dt className="font-bold">Format</dt>
            <dd>{media.mime}</dd>
            <dt className="font-bold">Ajoutée le</dt>
            <dd>{media.creeLe.toLocaleDateString("fr-FR")}</dd>
          </dl>
          <CopierUrl url={absoluteUrl(media.url)} />
          <FormulaireMedia id={media.id} alt={media.alt} credit={media.credit ?? ""} />
          <section aria-labelledby="usages">
            <h2 id="usages" className="font-titre text-2xl">
              Utilisée par
            </h2>
            {usages.length > 0 ? (
              <ul className="mt-2 list-disc pl-5">
                {usages.map((u) => (
                  <li key={u.libelle}>
                    <Link href={u.lien} target="_blank" className="underline underline-offset-4">
                      {u.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">Aucun contenu n&apos;utilise cette image.</p>
            )}
          </section>
          <ZoneSuppression id={media.id} bloquee={usages.length > 0} />
        </div>
      </div>
    </>
  );
}
