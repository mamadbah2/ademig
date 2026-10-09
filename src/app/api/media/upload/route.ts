import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { aLeRole } from "@/lib/roles";
import { lireSession } from "@/lib/session";
import { TAILLE_MAX, TYPES_IMAGES } from "@/lib/validation/media";

// Délivre au navigateur un jeton d'envoi direct vers Vercel Blob (contourne la limite de 4,5 Mo des fonctions).
// La ligne `media` est créée ensuite par l'action `enregistrerMedia` : pas de rappel `onUploadCompleted`,
// qui ne fonctionne pas en local.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const reponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await lireSession();
        if (!session || !aLeRole(session.role, "editeur")) throw new Error("Accès refusé.");
        return {
          allowedContentTypes: [...TYPES_IMAGES],
          maximumSizeInBytes: TAILLE_MAX,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(reponse);
  } catch (erreur) {
    return Response.json({ error: (erreur as Error).message }, { status: 400 });
  }
}
