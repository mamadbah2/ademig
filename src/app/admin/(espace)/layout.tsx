import type { ReactNode } from "react";
import { CoquilleAdmin } from "@/components/admin/coquille";
import { db } from "@/db";
import { ficheDuCompte } from "@/db/requetes/fiche-du-compte";
import { exigerAdmin } from "@/lib/session";

export default async function LayoutEspace({ children }: { children: ReactNode }) {
  const session = await exigerAdmin();
  const aUneFiche = Boolean(await ficheDuCompte(db, session.userId));
  return (
    <CoquilleAdmin nom={session.nom} role={session.role} aUneFiche={aUneFiche}>
      {children}
    </CoquilleAdmin>
  );
}
