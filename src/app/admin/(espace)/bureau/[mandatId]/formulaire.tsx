"use client";

import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Bouton, Champ, Selection, ZoneTexte } from "@/components/admin/ui";
import type { PosteSaisi } from "@/db/operations/bureau";
import type { MandatAdmin } from "@/db/requetes/admin/bureau";
import type { OptionMembre } from "@/db/requetes/admin/membres";
import { enregistrerMandatAction } from "@/lib/admin/bureau";

// Dans le formulaire, chaque membre d'une commission est un élément de liste (ordre, retrait).
type CommissionFormulaire = { nom: string; mission: string; membres: { membreId: string }[] };

export function FormulaireMandat({
  mandat,
  membres,
  messageInitial,
}: {
  mandat: MandatAdmin;
  membres: OptionMembre[];
  messageInitial?: string;
}) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(enregistrerMandatAction.bind(null, mandat.id));
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || mandat.version;
  const message = resultat ?? (messageInitial ? { ok: true as const, message: messageInitial } : null);
  const options = [
    { valeur: "", libelle: "Choisir un membre" },
    ...membres.map((m) => ({ valeur: m.id, libelle: m.visible ? m.nom : `${m.nom} (masqué)` })),
  ];

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="space-y-6">
      <Alerte resultat={message} />
      <input type="hidden" name="version" value={version} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label="Libellé" name="libelle" defaultValue={mandat.libelle} aide="Ex. : Bureau 2024." erreurs={erreurs?.libelle} required />
        <Champ label="Date d'élection" name="dateElection" type="date" defaultValue={mandat.dateElection} erreurs={erreurs?.dateElection} required />
      </div>
      <p className="text-sm">Un membre masqué n&apos;apparaît pas sur la page Bureau du site. L&apos;ordre des listes est celui du site.</p>
      <ListeEditable<PosteSaisi>
        libelle="Postes"
        name="postes"
        valeurInitiale={mandat.postes}
        nouvelElement={() => ({ membreId: "", fonction: "", executif: false })}
        libelleAjout="Ajouter un poste"
        erreurs={erreurs?.postes}
        rendu={(p, modifier, i, idElement) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Selection id={`${idElement}-membre`} label="Membre" name={`${idElement}-membre`} form="" options={options} value={p.membreId} onChange={(e) => modifier({ membreId: e.target.value })} />
            <Champ id={`${idElement}-fonction`} label="Fonction" name={`${idElement}-fonction`} form="" value={p.fonction} onChange={(e) => modifier({ fonction: e.target.value })} aide="Ex. : Président, Trésorière." />
            <label className="flex min-h-11 items-center gap-3 font-bold sm:col-span-2">
              <input type="checkbox" form="" checked={p.executif} onChange={(e) => modifier({ executif: e.target.checked })} className="size-5 accent-brun" />
              Bureau exécutif (seuls ces postes figurent sur la page Bureau)
            </label>
          </div>
        )}
      />
      <ListeEditable<CommissionFormulaire>
        libelle="Commissions"
        name="commissions"
        valeurInitiale={mandat.commissions.map((c) => ({ ...c, membres: c.membres.map((membreId) => ({ membreId })) }))}
        nouvelElement={() => ({ nom: "", mission: "", membres: [] })}
        libelleAjout="Ajouter une commission"
        erreurs={erreurs?.commissions}
        rendu={(c, modifier, i, idElement) => (
          <div className="space-y-3">
            <Champ id={`${idElement}-nom`} label="Nom de la commission" name={`${idElement}-nom`} form="" value={c.nom} onChange={(e) => modifier({ nom: e.target.value })} />
            <ZoneTexte id={`${idElement}-mission`} label="Mission" name={`${idElement}-mission`} form="" rows={2} value={c.mission} onChange={(e) => modifier({ mission: e.target.value })} />
            <ListeEditable<{ membreId: string }>
              libelle={`Membres de la commission ${i + 1}`}
              valeurInitiale={c.membres}
              onChange={(l) => modifier({ membres: l })}
              nouvelElement={() => ({ membreId: "" })}
              libelleAjout="Ajouter un membre à la commission"
              rendu={(m, modifierMembre, j, idMembre) => (
                <Selection id={`${idMembre}-membre`} label="Membre" name={`${idMembre}-membre`} form="" options={options} value={m.membreId} onChange={(e) => modifierMembre({ membreId: e.target.value })} />
              )}
            />
          </div>
        )}
      />
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t-[1.5px] border-encre bg-papier px-4 py-3 sm:-mx-8 sm:px-8">
        <Bouton type="submit" disabled={enCours}>
          {enCours ? "Enregistrement…" : "Enregistrer le mandat"}
        </Bouton>
      </div>
    </form>
  );
}
