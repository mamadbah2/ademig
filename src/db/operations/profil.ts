import { eq } from "drizzle-orm";
import type { z } from "zod";
import { media, membres, user } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Liens } from "@/lib/content/types";
import { depuisVisibilite, type Visibilite, versVisibilite } from "@/lib/membres/visibilite";
import type { schemaProfil } from "@/lib/membres/profil";
import { ErreurMetier } from "./erreurs";
import { creerMedia, supprimerMedia, usagesMedia } from "./media";

const SANS_FICHE = "Aucune fiche membre n'est liée à votre compte : contactez le bureau.";

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
      const nouvelle = await creerMedia(
        tx,
        {
          url: p.photoUrl,
          pathname: p.photoPathname,
          alt: `Portrait de ${fiche.nom}`,
          credit: null,
          width: p.photoLargeur,
          height: p.photoHauteur,
          mime: "image/webp",
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
    const { url, pathname } = await supprimerMedia(tx, anciennePhoto);
    return { photoRemplacee: pathname ? { url, pathname } : null };
  });
}
