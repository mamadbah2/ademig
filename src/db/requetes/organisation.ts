import type { Db } from "@/db/types";
import type { Commission, Member, Partenaire } from "@/lib/content/types";
import { membresVisibles } from "./membres";

export type Bureau = { executif: Member[]; commissions: (Commission & { membres: Member[] })[] };

export async function lireBureau(db: Db): Promise<Bureau> {
  const mandat = await db.query.mandats.findFirst({
    where: (m, { eq }) => eq(m.actif, true),
    with: {
      postes: { orderBy: (p, { asc }) => [asc(p.ordre)] },
      commissions: {
        orderBy: (c, { asc }) => [asc(c.ordre)],
        with: { membres: { orderBy: (cm, { asc }) => [asc(cm.ordre)] } },
      },
    },
  });
  if (!mandat) return { executif: [], commissions: [] };

  const parId = new Map((await membresVisibles(db)).map(({ id, membre }) => [id, membre]));
  const trouver = (ids: string[]) => ids.map((id) => parId.get(id)).filter((m): m is Member => !!m);

  return {
    executif: trouver(mandat.postes.filter((p) => p.executif).map((p) => p.membreId)),
    commissions: mandat.commissions.map((c) => ({
      nom: c.nom,
      mission: c.mission,
      membres: trouver(c.membres.map((m) => m.membreId)),
    })),
  };
}

export async function listerPartenaires(db: Db): Promise<Partenaire[]> {
  const lignes = await db.query.partenaires.findMany({
    where: (p, { eq }) => eq(p.visible, true),
    orderBy: (p, { asc }) => [asc(p.ordre)],
    with: { logo: true },
  });
  return lignes.map((p) => ({
    nom: p.nom,
    description: p.description,
    categorie: p.categorie,
    url: p.url ?? undefined,
    logo: p.logo ? { src: p.logo.url, width: p.logo.width, height: p.logo.height } : undefined,
  }));
}
