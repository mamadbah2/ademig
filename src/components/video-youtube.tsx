"use client";

import { useState } from "react";

// Lecteur YouTube allégé : seule la miniature est chargée, le lecteur ne démarre qu'au clic.
export function VideoYoutube({ id, titre }: { id: string; titre: string }) {
  const [lecture, setLecture] = useState(false);

  return (
    <figure data-anim>
      <div className="relative aspect-video overflow-hidden border-[1.5px] border-encre bg-encre">
        {lecture ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={titre}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLecture(true)}
            aria-label={`Lire la vidéo : ${titre}`}
            className="group absolute inset-0 size-full cursor-pointer"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- miniature servie par YouTube */}
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-encre/20 transition-colors group-hover:bg-encre/10">
              <span className="flex size-16 items-center justify-center border-[1.5px] border-encre bg-moutarde transition-transform group-hover:scale-110 group-active:scale-95">
                <span
                  aria-hidden
                  className="ml-1 block border-y-[11px] border-l-[18px] border-y-transparent border-l-encre"
                />
              </span>
            </span>
          </button>
        )}
      </div>
      <figcaption className="mt-2 font-bold">{titre}</figcaption>
    </figure>
  );
}

export function Videos({ videos }: { videos: { id: string; titre: string }[] }) {
  return (
    <div className={`grid gap-8 ${videos.length > 1 ? "md:grid-cols-2" : "max-w-3xl"}`}>
      {videos.map((v) => (
        <VideoYoutube key={v.id} {...v} />
      ))}
    </div>
  );
}
