import { eq } from "drizzle-orm";
import type { z } from "zod";
import { media, membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Liens } from "@/lib/content/types";
import { depuisVisibilite, type Visibilite, versVisibilite } from "@/lib/membres/visibilite";
import type { schemaProfil } from "@/lib/membres/profil";
import { ErreurMetier } from "./erreurs";
import { creerMedia, lireMedia, supprimerMedia, usagesMedia } from "./media";

const PHOTO_PAS_A_VOUS = "Cette photo n'est pas la vôtre : choisissez-en une autre.";
const SANS_FICHE = "Aucune fiche membre n'est liée à votre compte : contactez le bureau.";

// Le navigateur envoie du WebP, ou du PNG quand il ne sait pas encoder en WebP (Safari).
function mimeDe(pathname: string): string {
  const extension = pathname.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "image/webp";
}

export type ProfilMembre = {
  membreId: string;
  nom: string;
  email: string;
  numeroMembre: number | null;
  photo: string | null;
  resume: string;
  linkedin: string;
  promotion: string;
  specialite: string;
  organisation: string;
  ville: string;
  telephone: string;
  visibilite: Visibilite;
  slug: string;
};

export async function lireProfil(db: Db, userId: string): Promise<ProfilMembre | undefined> {
  const [m] = await db
    .select({ fiche: membres, email: user.email, photo: media.url })
    .from(membres)
    .innerJoin(user, eq(user.id, membres.userId))
    .leftJoin(media, eq(media.id, membres.photoId))
    .where(eq(membres.userId, userId))
    .limit(1);
  if (!m) return undefined;
  const f = m.fiche;
  return {
    membreId: f.id,
    nom: f.nom,
    email: m.email,
    numeroMembre: f.numeroMembre,
    photo: m.photo,
    resume: f.resume,
    linkedin: f.liens?.linkedin ?? "",
    promotion: f.promotion?.toString() ?? "",
    specialite: f.specialite,
    organisation: f.organisation ?? "",
    ville: f.ville ?? "",
    telephone: f.telephone ?? "",
    visibilite: versVisibilite(f),
    slug: f.slug,
  };
}

// Modifie la fiche rattachée au compte `userId`, et elle seule : la fiche est retrouvée par ce compte,
// jamais par un identifiant fourni par l'appelant. Sans nouvelle photo, la photo actuelle est conservée.
// Renvoie l'ancienne photo devenue orpheline (à effacer de Blob par l'appelant), ou null.
export async function modifierProfil(
  db: Db,
  userId: string,
  p: z.output<typeof schemaProfil>,
): Promise<{ photoRemplacee: { url: string; pathname: string } | null }> {
  return db.transaction(async (tx) => {
    const [fiche] = await tx.select().from(membres).where(eq(membres.userId, userId)).for("update");
    if (!fiche) throw new ErreurMetier(SANS_FICHE);

    let photoId = fiche.photoId;
    let anciennePhoto: string | null = null;
    if (p.photoUrl && p.photoPathname && p.photoLargeur && p.photoHauteur) {
      // creerMedia est idempotent par adresse : sans ce contrôle, l'adresse du portrait d'un autre membre
      // (ou d'une image de la médiathèque) serait rattachée à cette fiche.
      const existant = await tx.query.media.findFirst({ where: eq(media.url, p.photoUrl), columns: { id: true } });
      if (existant && existant.id !== fiche.photoId) throw new ErreurMetier(PHOTO_PAS_A_VOUS);
      const nouvelle = await creerMedia(
        tx,
        {
          url: p.photoUrl,
          pathname: p.photoPathname,
          alt: `Portrait de ${fiche.nom}`,
          credit: null,
          width: p.photoLargeur,
          height: p.photoHauteur,
          mime: mimeDe(p.photoPathname),
          taille: null,
        },
        userId,
      );
      if (nouvelle.id !== fiche.photoId) {
        anciennePhoto = fiche.photoId;
        photoId = nouvelle.id;
      }
    }

    // Seul linkedin change : email et site restent tels quels.
    const liens: Liens = { ...fiche.liens };
    if (p.linkedin) liens.linkedin = p.linkedin;
    else delete liens.linkedin;

    await tx
      .update(membres)
      .set({
        resume: p.resume,
        liens: Object.keys(liens).length > 0 ? liens : null,
        promotion: p.promotion,
        specialite: p.specialite,
        organisation: p.organisation,
        ville: p.ville,
        telephone: p.telephone,
        photoId,
        ...depuisVisibilite(p.visibilite),
      })
      .where(eq(membres.id, fiche.id));

    if (!anciennePhoto) return { photoRemplacee: null };
    // L'ancienne image peut servir ailleurs (actualité, autre fiche) : on ne la supprime que si plus rien ne l'utilise.
    if ((await usagesMedia(tx, anciennePhoto)).length > 0) return { photoRemplacee: null };
    // Une image de la médiathèque (hors membres/) reste en place : la fiche s'en détache, c'est tout.
    const ancienne = await lireMedia(tx, anciennePhoto);
    if (!ancienne?.pathname?.startsWith("membres/")) return { photoRemplacee: null };
    await supprimerMedia(tx, anciennePhoto);
    return { photoRemplacee: { url: ancienne.url, pathname: ancienne.pathname } };
  });
}
