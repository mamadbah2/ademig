import { eq } from "drizzle-orm";
import type { CommissionSaisie, PosteSaisi } from "@/db/operations/bureau";
import { mandats } from "@/db/schema";
import type { Db } from "@/db/types";

export type LigneMandatAdmin = { id: string; libelle: string; dateElection: string; actif: boolean; postes: number };

export type MandatAdmin = {
  id: string;
  libelle: string;
  dateElection: string;
  actif: boolean;
  version: string;
  postes: PosteSaisi[];
  commissions: CommissionSaisie[];
};

export async function listerMandatsAdmin(db: Db): Promise<LigneMandatAdmin[]> {
  const lignes = await db.query.mandats.findMany({
    orderBy: (m, { desc }) => [desc(m.dateElection), desc(m.creeLe)],
    with: { postes: { columns: { id: true } } },
  });
  return lignes.map((m) => ({ id: m.id, libelle: m.libelle, dateElection: m.dateElection, actif: m.actif, postes: m.postes.length }));
}

export async function lireMandatAdmin(db: Db, id: string): Promise<MandatAdmin | undefined> {
  const m = await db.query.mandats.findFirst({
    where: eq(mandats.id, id),
    with: {
      postes: { orderBy: (p, { asc }) => [asc(p.ordre)] },
      commissions: {
        orderBy: (c, { asc }) => [asc(c.ordre)],
        with: { membres: { orderBy: (cm, { asc }) => [asc(cm.ordre)] } },
      },
    },
  });
  if (!m) return undefined;
  return {
    id: m.id,
    libelle: m.libelle,
    dateElection: m.dateElection,
    actif: m.actif,
    version: m.majLe.toISOString(),
    postes: m.postes.map((p) => ({ membreId: p.membreId, fonction: p.fonction, executif: p.executif })),
    commissions: m.commissions.map((c) => ({ nom: c.nom, mission: c.mission, membres: c.membres.map((cm) => cm.membreId) })),
  };
}
