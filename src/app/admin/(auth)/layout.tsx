import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function LayoutConnexion({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mx-auto block w-40" aria-label="Retour au site de l'ADEMIG">
        <Logo priority className="h-auto w-full" />
      </Link>
      <div className="mt-6 border-[1.5px] border-encre bg-white/60 p-6 sm:p-8">{children}</div>
    </main>
  );
}
