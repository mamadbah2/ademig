import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { cheminApercu, type TypeApercu } from "@/db/requetes/admin/apercu";
import { lireSession } from "@/lib/session";

const TYPES: TypeApercu[] = ["actualite"];

// Ouvert depuis l'admin dans un nouvel onglet ; active le Draft Mode puis affiche la vraie page.
export async function GET(request: Request) {
  if (!(await lireSession())) return new Response("Connectez-vous à l'administration pour voir l'aperçu.", { status: 401 });
  const params = new URL(request.url).searchParams;
  const type = params.get("type") as TypeApercu | null;
  const id = params.get("id");
  if (!type || !TYPES.includes(type) || !z.uuid().safeParse(id).success) {
    return new Response("Aperçu introuvable.", { status: 404 });
  }
  const chemin = await cheminApercu(db, type, id!);
  if (!chemin) return new Response("Aperçu introuvable.", { status: 404 });
  (await draftMode()).enable();
  redirect(chemin);
}
