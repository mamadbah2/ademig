import type { ReactNode } from "react";
import { CoquilleAdmin } from "@/components/admin/coquille";
import { exigerAdmin, ficheDeLaSession } from "@/lib/session";

export default async function LayoutEspace({ children }: { children: ReactNode }) {
  const session = await exigerAdmin();
  const aUneFiche = Boolean(await ficheDeLaSession(session.userId));
  return (
    <CoquilleAdmin nom={session.nom} role={session.role} aUneFiche={aUneFiche}>
      {children}
    </CoquilleAdmin>
  );
}
