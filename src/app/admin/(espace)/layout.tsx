import type { ReactNode } from "react";
import { CoquilleAdmin } from "@/components/admin/coquille";
import { exigerSession } from "@/lib/session";

export default async function LayoutEspace({ children }: { children: ReactNode }) {
  const session = await exigerSession();
  return (
    <CoquilleAdmin nom={session.nom} role={session.role}>
      {children}
    </CoquilleAdmin>
  );
}
