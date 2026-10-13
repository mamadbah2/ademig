"use client";

import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Bouton, Champ, ZoneTexte } from "@/components/admin/ui";
import { enregistrerFaq } from "@/lib/admin/reglages";
import { FAQ_MAX_QUESTION, FAQ_MAX_QUESTIONS, FAQ_MAX_REPONSE, type QuestionFaq } from "@/lib/content/faq";

// La liste affichée est celle du site : la FAQ enregistrée, ou celle d'origine tant que rien n'est enregistré.
export function FormulaireFaq({ faq, version: versionInitiale }: { faq: QuestionFaq[]; version: string | null }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(enregistrerFaq);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || versionInitiale;

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      <Alerte resultat={resultat} />
      {version && <input type="hidden" name="version" value={version} />}
      <p>
        Ces questions s&apos;affichent en bas de la page d&apos;accueil, dans cet ordre ({FAQ_MAX_QUESTIONS} au plus).
        Texte brut seulement. Retirer toutes les questions masque la section.
      </p>
      <ListeEditable
        libelle="Questions fréquentes"
        name="faq"
        valeurInitiale={faq}
        nouvelElement={() => ({ question: "", reponse: "" })}
        libelleAjout="Ajouter une question"
        erreurs={erreurs?.faq}
        rendu={(q, modifier, _i, idElement) => (
          <div className="space-y-3">
            <Champ
              id={`${idElement}-question`}
              label="Question"
              name={`${idElement}-question`}
              form=""
              maxLength={FAQ_MAX_QUESTION}
              value={q.question}
              onChange={(e) => modifier({ question: e.target.value })}
            />
            <ZoneTexte
              id={`${idElement}-reponse`}
              label="Réponse"
              name={`${idElement}-reponse`}
              form=""
              rows={4}
              aide={`${q.reponse.trim().length} / ${FAQ_MAX_REPONSE} caractères.`}
              value={q.reponse}
              onChange={(e) => modifier({ reponse: e.target.value })}
            />
          </div>
        )}
      />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}
