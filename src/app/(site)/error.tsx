"use client";

export default function ErreurSite({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto max-w-3xl px-5 py-24 md:px-10">
      <h1 className="font-display text-4xl font-bold">Une erreur est survenue</h1>
      <p className="mt-4 max-w-xl text-lg">
        La page n&apos;a pas pu s&apos;afficher. Réessayez dans un instant ; si le problème continue, écrivez-nous
        {error.digest ? <> en indiquant ce code : <code>{error.digest}</code></> : null}.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="mt-8 inline-block border-[1.5px] border-encre bg-brun px-5 py-3 font-bold text-papier transition-[color,background-color,scale] hover:bg-encre active:scale-95"
      >
        Réessayer
      </button>
    </main>
  );
}
