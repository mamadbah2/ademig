"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Alerte, Bouton, EtatVide } from "@/components/admin/ui";
import type { LigneClassee, StatutLigne } from "@/db/operations/import-membres";
import { type ApercuImport, analyserImport, type BilanImport, confirmerImport } from "@/lib/admin/import-membres";
import type { Resultat } from "@/lib/admin/resultat";

const PAR_JOUR = 150;

const LIBELLES_STATUT: Record<StatutLigne, string> = {
  nouveau: "Nouvelle fiche",
  rattacher_fiche: "Rattachée à une fiche existante",
  lier_compte: "Compte existant lié",
  deja_membre: "Déjà membre (ignoré)",
};

const compter = (lignes: LigneClassee[], statut: StatutLigne) => lignes.filter((l) => l.statut === statut).length;

function Compteur({ valeur, libelle }: { valeur: number; libelle: string }) {
  return (
    <div className="border-[1.5px] border-encre p-3">
      <p className="font-titre text-3xl">{valeur}</p>
      <p className="text-sm">{libelle}</p>
    </div>
  );
}

export function FormulaireImport() {
  // Changer la clé remonte le composant : l'état de l'analyse et du bilan repart de zéro.
  const [essai, setEssai] = useState(0);
  return <Import key={essai} recommencer={() => setEssai((n) => n + 1)} />;
}

function Import({ recommencer }: { recommencer: () => void }) {
  const [etat, analyser, analyseEnCours] = useActionState<Resultat<ApercuImport> | null, FormData>(analyserImport, null);
  const [bilan, setBilan] = useState<Resultat<BilanImport> | null>(null);
  const [confirmation, demarrer] = useTransition();
  const apercu = etat?.ok ? etat.donnees : undefined;

  // Une requête refusée avant l'action (taille, réseau) lève : on l'affiche au lieu de laisser l'écran figé.
  const confirmer = (csv: string) =>
    demarrer(async () => {
      try {
        setBilan(await confirmerImport(csv));
      } catch {
        setBilan({ ok: false, message: "L'import n'a pas pu aboutir (fichier trop volumineux ou connexion perdue). Vérifiez la liste des membres avant de recommencer." });
      }
    });

  // Étape 3 : le résultat remplace l'aperçu.
  if (bilan?.ok && bilan.donnees) {
    const b = bilan.donnees;
    return (
      <section aria-labelledby="resultat" className="max-w-2xl space-y-4">
        <h2 id="resultat" className="font-titre text-2xl">
          Import terminé
        </h2>
        <Alerte resultat={{ ok: true, message: `${b.crees} fiche(s) créée(s), ${b.rattaches} rattachée(s) à une fiche ou un compte existant, ${b.ignores} ignorée(s), ${b.invites} invitation(s) mise(s) en file.` }} />
        {b.echecs > 0 && <Alerte resultat={{ ok: false, message: bilan.message }} />}
        <p>Les invitations partent par lots de {PAR_JOUR} par jour, à partir du prochain envoi.</p>
        <p>
          <Link href="/admin/membres?compte=en_file" className="font-bold underline underline-offset-4">
            Voir les membres en file d&apos;invitation
          </Link>
        </p>
        <Bouton type="button" variante="secondaire" onClick={recommencer}>
          Importer un autre fichier
        </Bouton>
      </section>
    );
  }

  // Étape 2 : aperçu.
  if (apercu) {
    const { lignes, problemes, csv } = apercu;
    const n = lignes.length - compter(lignes, "deja_membre");
    return (
      <section aria-labelledby="apercu" className="space-y-6">
        <h2 id="apercu" className="font-titre text-2xl">
          Aperçu avant import
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Compteur valeur={compter(lignes, "nouveau")} libelle="nouveaux" />
          <Compteur valeur={compter(lignes, "rattacher_fiche")} libelle="fiches rattachées" />
          <Compteur valeur={compter(lignes, "lier_compte")} libelle="comptes liés" />
          <Compteur valeur={compter(lignes, "deja_membre")} libelle="déjà membres" />
          <Compteur valeur={problemes.length} libelle="erreurs" />
        </div>

        {problemes.length > 0 && (
          <div>
            <h3 className="font-bold">Lignes refusées (non importées)</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full border-[1.5px] border-encre text-left">
                <thead className="bg-sable">
                  <tr>
                    <th scope="col" className="w-20 px-3 py-2">Ligne</th>
                    <th scope="col" className="px-3 py-2">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-encre/30">
                  {problemes.map((p, i) => (
                    <tr key={`${p.ligne}-${i}`}>
                      <td className="px-3 py-2">{p.ligne}</td>
                      <td className="px-3 py-2">{p.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {lignes.length > 0 && (
          <details className="border-[1.5px] border-encre">
            <summary className="min-h-11 cursor-pointer px-3 py-2 font-bold">Lignes valides ({lignes.length})</summary>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-sable">
                  <tr>
                    <th scope="col" className="px-3 py-2">Ligne</th>
                    <th scope="col" className="px-3 py-2">Nom</th>
                    <th scope="col" className="px-3 py-2">Email</th>
                    <th scope="col" className="px-3 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-encre/30">
                  {lignes.map((l) => (
                    <tr key={l.ligne}>
                      <td className="px-3 py-2">{l.ligne}</td>
                      <td className="px-3 py-2">
                        {l.prenom} {l.nom}
                      </td>
                      <td className="px-3 py-2 break-all">{l.email}</td>
                      <td className="px-3 py-2">{LIBELLES_STATUT[l.statut]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {n === 0 ? (
          <EtatVide>Aucun membre à importer dans ce fichier.</EtatVide>
        ) : (
          <div className="space-y-3">
            <p className="border-l-4 border-moutarde bg-moutarde/20 px-4 py-3">
              Les invitations partent par lots de {PAR_JOUR} par jour : environ {Math.ceil(n / PAR_JOUR)} jour{n > PAR_JOUR ? "s" : ""} pour tout le monde.
            </p>
            {bilan && !bilan.ok && <Alerte resultat={bilan} />}
            {/* Le CSV est renvoyé tel quel et réanalysé côté serveur à la confirmation. */}
            <Bouton type="button" disabled={confirmation} onClick={() => confirmer(csv)}>
              {confirmation ? "Import en cours…" : `Importer ${n} membre${n > 1 ? "s" : ""} et programmer les invitations`}
            </Bouton>
          </div>
        )}
        <Bouton type="button" variante="secondaire" onClick={recommencer}>
          Choisir un autre fichier
        </Bouton>
      </section>
    );
  }

  // Étape 1 : choix du fichier.
  return (
    <form action={analyser} className="max-w-2xl space-y-5">
      <Alerte resultat={etat} />
      <div>
        <label htmlFor="fichier" className="font-bold">
          Fichier CSV
        </label>
        <input
          id="fichier"
          name="fichier"
          type="file"
          accept=".csv,text/csv"
          required
          aria-describedby="fichier-aide"
          className="mt-1 block min-h-11 w-full border-[1.5px] border-encre bg-white px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-moutarde"
        />
        <p id="fichier-aide" className="mt-1 text-sm">
          Colonnes : nom, prénom, email (obligatoires), téléphone, promotion, spécialité. Dans Excel : Fichier → Enregistrer sous → CSV UTF-8 (délimité par des virgules).{" "}
          <a href="/modele-import-membres.csv" download className="font-bold underline underline-offset-4">
            Télécharger le modèle
          </a>
        </p>
      </div>
      <Bouton type="submit" disabled={analyseEnCours}>
        {analyseEnCours ? "Analyse…" : "Analyser le fichier"}
      </Bouton>
    </form>
  );
}
