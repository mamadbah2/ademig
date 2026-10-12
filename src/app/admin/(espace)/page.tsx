import type { Metadata } from "next";
import Link from "next/link";
import { TitrePage } from "@/components/admin/ui";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TableauDeBord() {
  const session = await exigerSession();
  const raccourcis = [
    { href: "/admin/actualites", titre: "Actualités", texte: "Écrire, publier et dépublier les articles." },
    { href: "/admin/evenements", titre: "Événements", texte: "Annoncer les rencontres et garder leurs photos." },
    { href: "/admin/membres", titre: "Membres", texte: "Tenir à jour les fiches de l'annuaire." },
    { href: "/admin/bureau", titre: "Bureau", texte: "Préparer puis activer les mandats du bureau." },
    { href: "/admin/partenaires", titre: "Partenaires", texte: "Ajouter, ordonner ou masquer les partenaires." },
    { href: "/admin/reglages", titre: "Réglages", texte: "Coordonnées, réseaux sociaux et textes clés du site." },
    { href: "/admin/medias", titre: "Médiathèque", texte: "Envoyer des images et décrire celles du site." },
    { href: "/admin/mon-compte", titre: "Mon compte", texte: "Changer votre nom ou votre mot de passe." },
    ...(aLeRole(session.role, "superadmin")
      ? [{ href: "/admin/comptes", titre: "Comptes", texte: "Inviter les membres du bureau et gérer leurs accès." }]
      : []),
  ];
  return (
    <>
      <TitrePage>Bonjour {session.nom}</TitrePage>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {raccourcis.map((r) => (
          <li key={r.href}>
            <Link
              href={r.href}
              className="block h-full border-[1.5px] border-encre p-5 hover:bg-sable focus-visible:outline-3 focus-visible:outline-moutarde"
            >
              <span className="font-titre text-2xl">{r.titre}</span>
              <span className="mt-2 block">{r.texte}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
