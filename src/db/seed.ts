import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { imageSize } from "image-size";
import { paragraphesEnHtml } from "@/lib/html";
import { actualites as actualitesInitiales } from "./donnees-initiales/actualites";
import { evenements as evenementsInitiaux } from "./donnees-initiales/evenements";
import { membres as membresInitiaux } from "./donnees-initiales/membres";
import {
  commissions as commissionsInitiales,
  ordreBureau,
  partenaires as partenairesInitiaux,
} from "./donnees-initiales/organisation";
import { reglagesInitiaux } from "./donnees-initiales/reglages";
import * as t from "./schema";
import type { Db, Tx } from "./types";

export type ImageInitiale = { src: string; alt: string; width?: number; height?: number; credit?: string };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

// Toutes les images référencées par le contenu actuel, chacune une seule fois.
export function imagesInitiales(): ImageInitiale[] {
  const images = new Map<string, ImageInitiale>();
  const ajouter = (image: ImageInitiale) => {
    if (!images.has(image.src)) images.set(image.src, image);
  };
  for (const a of actualitesInitiales) a.photos?.forEach(ajouter);
  for (const e of evenementsInitiaux) {
    e.photos?.forEach(ajouter);
    if (e.affiche) ajouter(e.affiche);
  }
  for (const m of membresInitiaux) if (m.photo) ajouter({ src: m.photo, alt: `Portrait de ${m.nom}` });
  for (const p of partenairesInitiaux) {
    if (p.logo) ajouter({ src: p.logo.src, alt: `Logo de ${p.nom}`, width: p.logo.width, height: p.logo.height });
  }
  return [...images.values()];
}

function lireFichierPublic(src: string) {
  const fichier = path.join(process.cwd(), "public", src);
  const dimensions = imageSize(readFileSync(fichier));
  return {
    taille: statSync(fichier).size,
    width: dimensions.width,
    height: dimensions.height,
    mime: MIME[path.extname(src).toLowerCase()] ?? "application/octet-stream",
  };
}

async function seedMedias(tx: Tx) {
  const ids = new Map<string, string>();
  for (const image of imagesInitiales()) {
    const existant = await tx.query.media.findFirst({ where: eq(t.media.url, image.src), columns: { id: true } });
    if (existant) {
      ids.set(image.src, existant.id);
      continue;
    }
    const fichier = lireFichierPublic(image.src);
    const [ligne] = await tx
      .insert(t.media)
      .values({
        url: image.src,
        alt: image.alt,
        credit: image.credit ?? null,
        // Les dimensions déclarées dans le contenu sont celles qu'affiche le site.
        width: image.width ?? fichier.width,
        height: image.height ?? fichier.height,
        mime: fichier.mime,
        taille: fichier.taille,
      })
      .returning({ id: t.media.id });
    ids.set(image.src, ligne.id);
  }
  return (src: string) => {
    const id = ids.get(src);
    if (!id) throw new Error(`Image absente du seed : ${src}`);
    return id;
  };
}

type IdMedia = Awaited<ReturnType<typeof seedMedias>>;

async function seedActualites(tx: Tx, idMedia: IdMedia) {
  for (const a of actualitesInitiales) {
    const existe = await tx.query.actualites.findFirst({ where: eq(t.actualites.slug, a.slug), columns: { id: true } });
    if (existe) continue;
    const [ligne] = await tx
      .insert(t.actualites)
      .values({
        slug: a.slug,
        titre: a.titre,
        date: a.date,
        resume: a.resume,
        corps: paragraphesEnHtml(a.corps),
        sources: a.sources ?? [],
        videos: a.videos ?? [],
        statut: "publie",
        publieLe: new Date(`${a.date}T00:00:00Z`),
      })
      .returning({ id: t.actualites.id });
    for (const [ordre, photo] of (a.photos ?? []).entries()) {
      await tx.insert(t.actualitePhotos).values({ actualiteId: ligne.id, mediaId: idMedia(photo.src), ordre });
    }
  }
}

async function seedEvenements(tx: Tx, idMedia: IdMedia) {
  for (const e of evenementsInitiaux) {
    const existe = await tx.query.evenements.findFirst({ where: eq(t.evenements.slug, e.slug), columns: { id: true } });
    if (existe) continue;
    const [ligne] = await tx
      .insert(t.evenements)
      .values({
        slug: e.slug,
        titre: e.titre,
        debut: new Date(e.debut),
        fin: e.fin ? new Date(e.fin) : null,
        lieuNom: e.lieu.nom,
        lieuVille: e.lieu.ville,
        theme: e.theme ?? null,
        resume: e.resume,
        corps: paragraphesEnHtml(e.corps),
        videos: e.videos ?? [],
        afficheId: e.affiche ? idMedia(e.affiche.src) : null,
        partenaires: e.partenaires ?? [],
        statut: "publie",
        publieLe: new Date(e.debut),
      })
      .returning({ id: t.evenements.id });
    for (const [ordre, photo] of (e.photos ?? []).entries()) {
      await tx.insert(t.evenementPhotos).values({ evenementId: ligne.id, mediaId: idMedia(photo.src), ordre });
    }
  }
}

async function seedMembres(tx: Tx, idMedia: IdMedia) {
  for (const m of membresInitiaux) {
    const existe = await tx.query.membres.findFirst({ where: eq(t.membres.slug, m.slug), columns: { id: true } });
    if (existe) continue;
    await tx.insert(t.membres).values({
      slug: m.slug,
      nom: m.nom,
      titre: m.titre,
      specialite: m.specialite,
      promotion: m.promotion ?? null,
      numero: m.numero ?? null,
      organisation: m.organisation ?? null,
      ville: m.ville ?? null,
      resume: m.resume,
      bio: m.bio ? paragraphesEnHtml(m.bio) : null,
      parcours: m.parcours,
      competences: m.competences,
      realisations: m.realisations ?? [],
      liens: m.liens ?? null,
      photoId: m.photo ? idMedia(m.photo) : null,
    });
  }
}

// Le bureau n'est importé que si aucun mandat n'existe encore.
async function seedBureau(tx: Tx) {
  if (await tx.query.mandats.findFirst({ columns: { id: true } })) return;
  const [mandat] = await tx
    .insert(t.mandats)
    .values({ libelle: "Bureau 2024", dateElection: "2024-09-22", actif: true })
    .returning({ id: t.mandats.id });
  const lignes = await tx.select({ id: t.membres.id, slug: t.membres.slug }).from(t.membres);
  const idMembre = new Map(lignes.map((l) => [l.slug, l.id]));

  for (const [ordre, m] of membresInitiaux.filter((x) => x.fonction).entries()) {
    await tx.insert(t.postesBureau).values({
      mandatId: mandat.id,
      membreId: idMembre.get(m.slug)!,
      fonction: m.fonction!,
      ordre,
      executif: ordreBureau.includes(m.slug),
    });
  }
  for (const [ordre, c] of commissionsInitiales.entries()) {
    const [commission] = await tx
      .insert(t.commissions)
      .values({ mandatId: mandat.id, nom: c.nom, mission: c.mission, ordre })
      .returning({ id: t.commissions.id });
    for (const [rang, slug] of c.membres.entries()) {
      await tx.insert(t.commissionMembres).values({ commissionId: commission.id, membreId: idMembre.get(slug)!, ordre: rang });
    }
  }
}

async function seedPartenaires(tx: Tx, idMedia: IdMedia) {
  for (const [ordre, p] of partenairesInitiaux.entries()) {
    const existe = await tx.query.partenaires.findFirst({ where: eq(t.partenaires.nom, p.nom), columns: { id: true } });
    if (existe) continue;
    await tx.insert(t.partenaires).values({
      nom: p.nom,
      description: p.description,
      categorie: p.categorie,
      url: p.url ?? null,
      logoId: p.logo ? idMedia(p.logo.src) : null,
      ordre,
    });
  }
}

export async function seed(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    const idMedia = await seedMedias(tx);
    await seedActualites(tx, idMedia);
    await seedEvenements(tx, idMedia);
    await seedMembres(tx, idMedia);
    await seedBureau(tx);
    await seedPartenaires(tx, idMedia);
    await tx.insert(t.reglages).values({ id: 1, ...reglagesInitiaux }).onConflictDoNothing();
  });
}
