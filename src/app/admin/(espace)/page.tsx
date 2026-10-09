import type { Metadata } from "next";
import Link from "next/link";
import { TitrePage } from "@/components/admin/ui";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function TableauDeBord() {
  const session = await exigerSession();
  const raccourcis = [
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
      <p className="mt-10 max-w-2xl">
        Les actualités, les événements, les membres, le bureau, les partenaires et les réglages seront modifiables
        ici dans la prochaine étape du back office.
      </p>
    </>
  );
}
