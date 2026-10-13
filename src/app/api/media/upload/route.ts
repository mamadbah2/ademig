import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { decisionJetonEnvoi } from "@/lib/membres/jeton-envoi";
import { aLeRole } from "@/lib/roles";
import { ficheDeLaSession, lireSession } from "@/lib/session";

// Délivre au navigateur un jeton d'envoi direct vers Vercel Blob (contourne la limite de 4,5 Mo des fonctions).
// Éditeurs : médiathèque. Membres avec fiche : leur portrait, dans `membres/` (voir decisionJetonEnvoi).
// La ligne `media` est créée ensuite par l'action `enregistrerMedia` : pas de rappel `onUploadCompleted`,
// qui ne fonctionne pas en local.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const reponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const session = await lireSession();
        // La fiche n'est cherchée que pour un compte qui n'est pas éditeur.
        const aUneFiche = session && !aLeRole(session.role, "editeur") ? !!(await ficheDeLaSession(session.userId)) : false;
        const regles = decisionJetonEnvoi(session, aUneFiche, pathname);
        if (!regles) throw new Error("Accès refusé.");
        return { ...regles, addRandomSuffix: true };
      },
    });
    return Response.json(reponse);
  } catch (erreur) {
    return Response.json({ error: (erreur as Error).message }, { status: 400 });
  }
}
