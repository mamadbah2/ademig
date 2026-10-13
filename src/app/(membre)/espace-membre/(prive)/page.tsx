import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { db } from "@/db";
import { lireProfil, type ProfilMembre } from "@/db/operations/profil";
import { Alerte } from "@/components/admin/ui";
import { SansFiche } from "@/components/membre/sans-fiche";
import { Cadre } from "@/components/ui";
import { exigerMembre } from "@/lib/session";

export const metadata: Metadata = { title: "Mon espace" };

const lienBase =
  "inline-flex min-h-11 items-center justify-center border-[1.5px] border-encre px-4 py-2 font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-moutarde";
const lienPlein = `${lienBase} bg-marine text-papier hover:bg-encre`;
const lienContour = `${lienBase} bg-papier hover:bg-sable`;

function prenomDe(nom: string): string {
  return nom.replace(/^Dr\.?\s+/, "").split(/\s+/)[0] ?? nom;
}

// Les quatre éléments qui rendent une fiche utile dans l'annuaire.
function completude(p: ProfilMembre) {
  const elements = [
    { libelle: "Photo", fait: p.photo !== null },
    { libelle: "Présentation", fait: p.resume.trim().length > 0 },
    { libelle: "LinkedIn", fait: p.linkedin !== "" },
    { libelle: "Promotion", fait: p.promotion !== "" },
  ];
  return { elements, faits: elements.filter((e) => e.fait).length };
}

function Carte({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section aria-label={titre} className="border-[1.5px] border-encre bg-papier/70 p-5">
      <h2 className="font-titre text-2xl text-marine">{titre}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}

export default async function Accueil({ searchParams }: PageProps<"/espace-membre">) {
  const m = await exigerMembre();
  const { bienvenue } = await searchParams;

  const profil = "sansFiche" in m ? undefined : await lireProfil(db, m.userId);
  if (!profil) return <SansFiche titre={`Bonjour ${prenomDe("sansFiche" in m ? m.session.nom : m.nom)}`} />;
  const { elements, faits } = completude(profil);
  const pourcent = Math.round((faits / elements.length) * 100);

  return (
    <Cadre as="div">
      <h1 className="font-titre text-4xl text-marine sm:text-5xl">Bonjour {prenomDe(profil.nom)}</h1>
      {profil.numeroMembre !== null && <p className="mt-2 font-bold">Membre n° {profil.numeroMembre}</p>}
      {bienvenue === "1" && (
        <div className="mt-6">
          <Alerte resultat={{ ok: true, message: "Compte activé ! Complétez votre profil." }} />
        </div>
      )}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Carte titre="Votre profil">
          <p>
            Profil complété à <strong>{pourcent} %</strong>
          </p>
          <div
            role="progressbar"
            aria-label="Complétude du profil"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pourcent}
            className="h-3 border border-encre bg-white"
          >
            <div className="h-full bg-vert" style={{ width: `${pourcent}%` }} />
          </div>
          <ul className="space-y-1 text-sm">
            {elements.map((e) => (
              <li key={e.libelle}>
                <span aria-hidden>{e.fait ? "✓" : "○"}</span> {e.libelle}
                <span className="sr-only">{e.fait ? " : renseigné" : " : à renseigner"}</span>
              </li>
            ))}
          </ul>
          <Link href="/espace-membre/profil" className={lienPlein}>
            Compléter
          </Link>
        </Carte>
        <Carte titre="Cotisations">
          <p>Le paiement en ligne arrive bientôt.</p>
        </Carte>
        <Carte titre="Annuaire">
          <p>Retrouvez les membres d&apos;ADEMIG : promotion, spécialité, ville.</p>
          <Link href="/espace-membre/annuaire" className={lienContour}>
            Ouvrir l&apos;annuaire
          </Link>
        </Carte>
      </div>
    </Cadre>
  );
}
