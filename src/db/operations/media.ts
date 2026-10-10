import { desc, eq, ilike, or } from "drizzle-orm";
import {
  actualitePhotos,
  actualites,
  evenementPhotos,
  evenements,
  media,
  membres,
  partenaires,
} from "@/db/schema";
import type { Db } from "@/db/types";
import { ErreurMetier } from "./erreurs";

export type Media = typeof media.$inferSelect;
export type NouveauMedia = {
  url: string;
  pathname: string | null;
  alt: string;
  credit: string | null;
  width: number;
  height: number;
  mime: string;
  taille: number | null;
};
export type UsageMedia = { libelle: string; lien: string };

export async function listerMedias(db: Db, recherche = ""): Promise<Media[]> {
  const texte = recherche.trim();
  // Échappe %, _ et \ pour une recherche littérale.
  const motif = `%${texte.replace(/[\\%_]/g, "\\$&")}%`;
  return db
    .select()
    .from(media)
    .where(texte ? or(ilike(media.alt, motif), ilike(media.credit, motif)) : undefined)
    .orderBy(desc(media.creeLe));
}

export async function lireMedia(db: Db, id: string): Promise<Media | undefined> {
  return db.query.media.findFirst({ where: eq(media.id, id) });
}

export async function mediaExiste(db: Db, url: string): Promise<boolean> {
  const ligne = await db.query.media.findFirst({ where: eq(media.url, url), columns: { id: true } });
  return ligne !== undefined;
}

export async function creerMedia(db: Db, donnees: NouveauMedia, creePar: string | null): Promise<Media> {
  // Idempotent : une reprise après échec ne doit pas échouer sur l'URL déjà enregistrée.
  const existant = await db.query.media.findFirst({ where: eq(media.url, donnees.url) });
  if (existant) return existant;
  const [ligne] = await db
    .insert(media)
    .values({ ...donnees, creePar })
    .onConflictDoNothing({ target: media.url })
    .returning();
  return ligne ?? (await db.query.media.findFirst({ where: eq(media.url, donnees.url) }))!;
}

export async function modifierMedia(db: Db, id: string, donnees: { alt: string; credit: string | null }) {
  const lignes = await db.update(media).set(donnees).where(eq(media.id, id)).returning({ id: media.id });
  if (lignes.length === 0) throw new ErreurMetier("Image introuvable.");
}

export async function usagesMedia(db: Db, id: string): Promise<UsageMedia[]> {
  const [photosActualites, photosEvenements, affiches, portraits, logos] = await Promise.all([
    db
      .select({ id: actualites.id, titre: actualites.titre })
      .from(actualitePhotos)
      .innerJoin(actualites, eq(actualites.id, actualitePhotos.actualiteId))
      .where(eq(actualitePhotos.mediaId, id)),
    db
      .select({ titre: evenements.titre, slug: evenements.slug })
      .from(evenementPhotos)
      .innerJoin(evenements, eq(evenements.id, evenementPhotos.evenementId))
      .where(eq(evenementPhotos.mediaId, id)),
    db.select({ titre: evenements.titre, slug: evenements.slug }).from(evenements).where(eq(evenements.afficheId, id)),
    db.select({ nom: membres.nom, slug: membres.slug }).from(membres).where(eq(membres.photoId, id)),
    db.select({ nom: partenaires.nom }).from(partenaires).where(eq(partenaires.logoId, id)),
  ]);
  // Les actualités ont leur écran d'édition (un brouillon n'a pas de page publique) ; les autres contenus suivront.
  return [
    ...photosActualites.map((a) => ({ libelle: `Actualité « ${a.titre} »`, lien: `/admin/actualites/${a.id}` })),
    ...photosEvenements.map((e) => ({ libelle: `Événement « ${e.titre} » (photo)`, lien: `/evenements/${e.slug}` })),
    ...affiches.map((e) => ({ libelle: `Événement « ${e.titre} » (affiche)`, lien: `/evenements/${e.slug}` })),
    ...portraits.map((m) => ({ libelle: `Fiche de ${m.nom}`, lien: `/membres/${m.slug}` })),
    ...logos.map((p) => ({ libelle: `Logo du partenaire ${p.nom}`, lien: "/partenaires" })),
  ];
}

export async function supprimerMedia(db: Db, id: string): Promise<{ url: string; pathname: string | null }> {
  const usages = await usagesMedia(db, id);
  if (usages.length > 0) {
    const n = usages.length;
    throw new ErreurMetier(`Image utilisée par ${n} contenu${n > 1 ? "s" : ""} : retirez-la d'abord.`);
  }
  const [ligne] = await db
    .delete(media)
    .where(eq(media.id, id))
    .returning({ url: media.url, pathname: media.pathname });
  if (!ligne) throw new ErreurMetier("Image introuvable.");
  return ligne;
}
