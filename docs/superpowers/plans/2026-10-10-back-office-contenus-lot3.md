# Back office ADEMIG — Sous-projet 2, lot 3 : membres et bureau — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gérer depuis `/admin` les fiches des membres (visibles ou masquées, avec aperçu) et le bureau : préparer un mandat hors ligne (postes, commissions), puis l'activer d'un coup. Au préalable, traiter les reports de la revue finale du lot 2.

**Architecture:** On réutilise la chaîne des lots 1 et 2 : schéma Zod (`src/lib/validation`) → Server Action (`src/lib/admin`, via `action()`) → opération pure testée sur PGlite (`src/db/operations`) → `revalidateTag`. Les membres suivent le modèle des actualités, avec `visible` à la place du statut. Un mandat se modifie dans **un seul formulaire** : libellé, date, postes et commissions (membres compris) sont des `ListeEditable` ordonnées par ↑ / ↓ côté client, envoyées en JSON, puis réécrites en une transaction sous le contrôle de version du mandat (`mandats.maj_le`). On évite ainsi tout déplacement côté serveur (pas de renumérotation d'ordre à écrire pour les postes et les commissions), et un seul `maj_le` protège tout l'écran.

**Tech Stack:** Next.js 16.3 (App Router, Server Actions, Draft Mode), React 19.2, Drizzle 0.45 (Neon / PGlite), Zod 4, Tiptap 3, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-back-office-contenus-design.md` (sections 4.1, 4.3, 4.4, 4.7, 5, 6, 7, 8 : lot 3). Plans précédents, livrés et fusionnés : `docs/superpowers/plans/2026-10-10-back-office-contenus-lot1.md` (PR #2) et `docs/superpowers/plans/2026-10-10-back-office-contenus-lot2.md` (PR #3).

## Global Constraints

- Lire avant de coder les guides Next 16 de `node_modules/next/dist/docs/` utiles à la tâche : draft-mode, forms, server-actions, how-revalidation-works (AGENTS.md : « This is NOT the Next.js you know »).
- Code, noms, commentaires et textes d'interface en français, comme le reste du dépôt ; densité de commentaires identique.
- Toute Server Action passe par `action("editeur", fn)` de `src/lib/admin/action.ts` et renvoie `Resultat<T>` ; une erreur de saisie ne lève jamais d'exception. Pages de l'admin : `exigerSession()`.
- Tout HTML enregistré passe par `nettoyerHtml` (via `htmlRiche` ou `htmlRicheFacultatif` dans le schéma Zod).
- Chaque écriture appelle `revalidateTag(TAGS.membres, { expire: 0 })` **et** `revalidateTag(TAGS.bureau, { expire: 0 })`, pour les membres comme pour les mandats. Elle appelle aussi `revalidatePath` sur les pages admin concernées.
- Aucune migration de base : ne pas lancer `db:generate`. Le schéma actuel couvre tout (`membres`, `mandats`, `postes_bureau`, `commissions`, `commission_membres`).
- Pas de `cacheComponents` ni de `"use cache"`. Les pages publiques `/membres/[slug]` restent SSG : la session n'est lue qu'en Draft Mode (`apercuAutorise()`).
- Formulaires : `useFormulaire` (soumission par `onSubmit`, sans perte de saisie), `noValidate` sur le `<form>`, contrôle de version `maj_le` via `memeVersion`. Les champs internes d'une `ListeEditable` portent `form=""`.
- Admin : cibles d'au moins 44 px (`min-h-11`), focus visible, utilisable à 360 px, contraste AA, composants de `src/components/admin/ui.tsx` et `src/components/admin/champs/`.
- La fonction affichée d'un membre reste calculée depuis le mandat actif : pas de champ `fonction` dans la fiche.
- Base partagée avec la production. Les tests e2e :
  - ne rendent visible aucun membre, sauf si `E2E_BASE_DEDIEE=1` ;
  - n'**activent jamais** un mandat et ne modifient jamais le mandat en place (l'activation n'est testée que sur PGlite) ;
  - donnent aux membres un slug qui commence par `e2e-`, et aux mandats un libellé qui commence par `E2E ` ;
  - suppriment tout ce qu'ils créent dans `e2e/nettoyage.ts` et au début de `e2e/preparation.ts`, mandats **inactifs** seulement.
- Dev local sur le port 3100 : `npx next dev -p 3100`. E2E : `E2E_AUTORISE=1 npm run test:e2e`.
- Commits : messages en français, terminés par une ligne `Co-Authored-By:` au nom du modèle qui écrit le code, sur la branche `back-office-contenus-lot3`. Ne jamais pousser.

## Review Focus

- **Activation d'un mandat** : il y a toujours au plus un mandat actif ; l'activation d'un mandat sans poste est refusée sans rien changer ; activer ne change pas la version du mandat, si bien qu'un formulaire ouvert s'enregistre encore sans faux conflit (tests PGlite, tâche 9).
- **Membre supprimé alors qu'il figure dans un bureau**, actuel ou passé, par un poste ou par une seule place en commission : refusé, avec un message qui propose de le masquer (tests PGlite, tâche 4 ; e2e, tâche 12).
- **Mandat modifié dans deux onglets** : la version périmée est refusée et rien n'est écrit, ni le libellé, ni les postes, ni les commissions. Un membre supprimé entre-temps donne un message clair, pas celui d'une image manquante (tests PGlite, tâche 9).
- **Erreur dans une liste imbriquée** (poste sans membre, fonction vide) : le message dit quel élément corriger (« Élément 2 : … ») et la saisie reste à l'écran (test de `erreursDe`, tâche 1 ; test Zod, tâche 8 ; e2e, tâche 12).
- **Fiche masquée servie sans session** : absente de `/membres`, de `/bureau` et de `/membres/<slug>`, même avec le seul cookie de Draft Mode ; visible en aperçu par une personne connectée (tests PGlite, tâche 5 ; e2e, tâche 12).

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/admin/resultat.ts` (modif., + test) | `erreursDe` numérote l'élément fautif ; contraintes `nom`, poste et mandat actif traduites ; `lireFormulaire()` |
| `src/lib/admin/actualites.ts`, `evenements.ts`, `partenaires.ts` (modif.) | utilisent `lireFormulaire` |
| `src/components/admin/ui.tsx` (modif.) | `ZoneTexte` (textarea avec aide et erreur reliées) |
| `src/components/admin/champs/liste-editable.tsx` (modif.) | `name` facultatif, `onChange` (listes imbriquées) |
| `src/components/admin/champs/champ-slug.tsx` (modif.) | prop `aideVerrouille` |
| `src/app/admin/(espace)/actualites/formulaire.tsx`, `evenements/formulaire.tsx`, `partenaires/formulaire.tsx` (modif.) | utilisent `ZoneTexte` |
| `src/lib/validation/commun.ts` (modif.) | `texteFacultatif` (déplacé), `htmlRicheFacultatif` |
| `src/lib/validation/membres.ts` (+ test) | `schemaMembre`, `schemaEnvoiMembre` |
| `src/db/operations/membres.ts` (+ test) | créer, modifier, supprimer (refus si dans un bureau) |
| `src/db/requetes/membres.ts` (modif.) | `postesDuMandatActif` exporté ; `trouverMembre(…, { masques })` |
| `src/db/requetes/admin/membres.ts` (+ test) | liste, fiche, options pour le bureau |
| `src/db/requetes/admin/apercu.ts`, `src/app/api/apercu/route.ts` (modif.) | type `membre` |
| `src/lib/content/membres.ts`, `src/app/(site)/membres/[slug]/page.tsx` (modif.) | `getMembrePourPage()` ; parcours masqué s'il est vide |
| `src/lib/admin/membres.ts` (+ test) | Server Actions des membres |
| `src/app/admin/(espace)/membres/…` | liste, nouveau, `[id]`, formulaire |
| `src/db/operations/media.ts` (modif., + test) | lien d'usage d'un portrait vers l'admin |
| `src/lib/validation/bureau.ts` (+ test) | `schemaNouveauMandat`, `schemaMandat`, `schemaEnvoiMandat` |
| `src/db/operations/bureau.ts` (+ test) | créer (reprise des commissions), enregistrer, activer, supprimer |
| `src/db/requetes/admin/bureau.ts` (testé avec les opérations) | liste des mandats, fiche d'un mandat |
| `src/lib/admin/bureau.ts` (+ test) | Server Actions des mandats |
| `src/app/admin/(espace)/bureau/…` | liste + nouveau mandat, `[mandatId]` (formulaire et actions) |
| `src/app/admin/(espace)/[rubrique]/page.tsx` (modif.) | ne garde que `reglages` |
| `e2e/membres.spec.ts`, `e2e/bureau.spec.ts`, `e2e/nettoyage.ts`, `e2e/preparation.ts` | parcours e2e et nettoyage |

---

### Task 1: Briques serveur partagées (reports du lot 2)

**Files:**
- Modify: `src/lib/admin/resultat.ts`, `src/lib/admin/resultat.test.ts`
- Modify: `src/lib/admin/actualites.ts`, `src/lib/admin/evenements.ts`, `src/lib/admin/partenaires.ts`

**Interfaces:**
- Produces, dans `src/lib/admin/resultat.ts` :
  - `erreursDe(erreur: z.ZodError): Resultat<never>` : même forme qu'avant ; un problème dont le chemin est `[champ, index, …]` (élément d'une liste) devient `"Élément ${index + 1} : ${message}"`, numéroté comme les boutons de `ListeEditable`.
  - `resultatDErreur` traduit aussi les violations d'unicité : `partenaires_nom_unique` → `{ erreurs: { nom: ["Ce nom est déjà utilisé."] } }` ; `postes_bureau_mandat_membre` → `{ erreurs: { postes: ["Un membre n'occupe qu'un poste par mandat."] } }` ; `mandats_un_seul_actif` → message « Un autre mandat vient d'être activé : rechargez la page. ».
  - `lireFormulaire<S extends z.ZodType>(schema: S, donnees: FormData): { ok: true; data: z.output<S> } | { ok: false; resultat: Resultat<never> }`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/lib/admin/resultat.test.ts` (imports : `champJson` de `@/lib/validation/commun`, `lireFormulaire` de `./resultat`) :

```ts
describe("erreursDe dans une liste", () => {
  const schema = z.object({
    postes: champJson(z.array(z.object({ fonction: z.string().trim().min(1, "Indiquez la fonction.") })).max(2, "2 postes au plus.")),
  });

  it("précise l'élément fautif, numéroté à partir de 1", () => {
    const r = schema.safeParse({ postes: '[{"fonction":"Président"},{"fonction":" "}]' });
    expect(erreursDe(r.error!).erreurs).toEqual({ postes: ["Élément 2 : Indiquez la fonction."] });
  });

  it("laisse sans numéro une erreur qui porte sur toute la liste", () => {
    const r = schema.safeParse({ postes: '[{"fonction":"a"},{"fonction":"b"},{"fonction":"c"}]' });
    expect(erreursDe(r.error!).erreurs).toEqual({ postes: ["2 postes au plus."] });
  });
});

describe("contraintes d'unicité du bureau et des partenaires", () => {
  const violation = (constraint: string) =>
    new Error("Failed query", { cause: Object.assign(new Error("duplicate key"), { code: "23505", constraint }) });

  it("rattache un nom de partenaire en double au champ nom", () => {
    expect(resultatDErreur(violation("partenaires_nom_unique"))).toEqual({
      ok: false,
      message: "Ce nom est déjà utilisé.",
      erreurs: { nom: ["Ce nom est déjà utilisé."] },
    });
  });

  it("rattache un membre à deux postes au champ postes", () => {
    expect(resultatDErreur(violation("postes_bureau_mandat_membre"))).toEqual({
      ok: false,
      message: "Un membre n'occupe qu'un poste par mandat.",
      erreurs: { postes: ["Un membre n'occupe qu'un poste par mandat."] },
    });
  });

  it("signale deux activations simultanées", () => {
    expect(resultatDErreur(violation("mandats_un_seul_actif"))).toEqual({
      ok: false,
      message: "Un autre mandat vient d'être activé : rechargez la page.",
    });
  });
});

describe("lireFormulaire", () => {
  const schema = z.object({ nom: z.string().trim().min(1, "Indiquez le nom.") });

  it("renvoie les données validées", () => {
    const f = new FormData();
    f.set("nom", " Diao ");
    expect(lireFormulaire(schema, f)).toEqual({ ok: true, data: { nom: "Diao" } });
  });

  it("renvoie le résultat d'erreurs à transmettre tel quel", () => {
    const f = new FormData();
    f.set("nom", "");
    expect(lireFormulaire(schema, f)).toEqual({
      ok: false,
      resultat: { ok: false, message: "Corrigez les champs signalés.", erreurs: { nom: ["Indiquez le nom."] } },
    });
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/resultat.test.ts`
Expected: FAIL (`lireFormulaire` n'existe pas ; messages sans numéro ; contraintes non traduites).

- [ ] **Step 3: Implémenter**

Dans `src/lib/admin/resultat.ts`, remplacer `erreursDe` :

```ts
export function erreursDe(erreur: z.ZodError): Resultat<never> {
  const erreurs: Record<string, string[]> = {};
  for (const probleme of erreur.issues) {
    const [champ, rang] = probleme.path;
    if (champ === undefined) continue;
    // Élément d'une liste envoyée en JSON : on dit lequel corriger, numéroté comme dans ListeEditable.
    const message = typeof rang === "number" ? `Élément ${rang + 1} : ${probleme.message}` : probleme.message;
    (erreurs[String(champ)] ??= []).push(message);
  }
  return { ok: false, message: "Corrigez les champs signalés.", erreurs };
}

// Valide un formulaire ; une saisie invalide devient le Resultat à renvoyer tel quel.
export function lireFormulaire<S extends z.ZodType>(
  schema: S,
  donnees: FormData,
): { ok: true; data: z.output<S> } | { ok: false; resultat: Resultat<never> } {
  const saisie = schema.safeParse(Object.fromEntries(donnees));
  return saisie.success ? { ok: true, data: saisie.data } : { ok: false, resultat: erreursDe(saisie.error) };
}
```

Dans `resultatDErreur`, à l'intérieur du bloc `if (pg?.code === "23505")`, après la branche `slug` et avant le message général :

```ts
    if (pg.constraint === "partenaires_nom_unique") {
      const message = "Ce nom est déjà utilisé.";
      return { ok: false, message, erreurs: { nom: [message] } };
    }
    if (pg.constraint === "postes_bureau_mandat_membre") {
      const message = "Un membre n'occupe qu'un poste par mandat.";
      return { ok: false, message, erreurs: { postes: [message] } };
    }
    if (pg.constraint === "mandats_un_seul_actif") {
      return { ok: false, message: "Un autre mandat vient d'être activé : rechargez la page." };
    }
```

Dans `src/lib/admin/actualites.ts`, `evenements.ts` et `partenaires.ts` :
- supprimer la fonction locale `lire` ;
- remplacer chaque paire `const saisie = lire(donnees); if (!saisie.success) return erreursDe(saisie.error);` par :

```ts
    const saisie = lireFormulaire(schemaEnvoiActualite, donnees);
    if (!saisie.ok) return saisie.resultat;
```

(avec `schemaEnvoiEvenement` et `schemaEnvoiPartenaire` dans les deux autres fichiers) ;
- importer `lireFormulaire` à la place de `erreursDe` depuis `@/lib/admin/resultat`. La suite de chaque action, qui lit `saisie.data`, ne change pas.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib && npx tsc --noEmit && npx eslint src/lib`
Expected: PASS, y compris les tests existants des actions (actualités, événements, partenaires), non modifiés.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin
git commit -m "Actions : lecture du formulaire factorisée, élément fautif numéroté, doublons de nom, de poste et d'activation traduits

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 2: Composants partagés : zone de texte, listes imbriquées, aide du lien

**Files:**
- Modify: `src/components/admin/ui.tsx`
- Modify: `src/components/admin/champs/liste-editable.tsx`, `src/components/admin/champs/champ-slug.tsx`
- Modify: `src/app/admin/(espace)/actualites/formulaire.tsx`, `src/app/admin/(espace)/evenements/formulaire.tsx`, `src/app/admin/(espace)/partenaires/formulaire.tsx`

**Interfaces:**
- Produces:
  - `ZoneTexte(props: ComponentProps<"textarea"> & { label: string; name: string; aide?: string; erreurs?: string[] })` : même contrat que `Champ` (id `champ-${name}` par défaut, `aria-describedby` vers l'aide **et** l'erreur, `aria-invalid`), `rows` vaut 3 par défaut.
  - `ListeEditable` : `name?: string` (sans `name`, aucun champ caché n'est rendu) et `onChange?: (valeurs: T[]) => void`, appelé à chaque changement (ajout, retrait, déplacement, saisie). Une liste imbriquée dans l'élément d'une autre liste s'utilise sans `name`, avec `onChange={(l) => modifier({ … : l })}`.
  - `ChampSlug` : prop facultative `aideVerrouille?: string`, par défaut « Ce contenu a déjà été publié : son lien a pu être partagé. ».

- [ ] **Step 1: `ZoneTexte`**

Dans `src/components/admin/ui.tsx`, après `Champ` :

```tsx
// Texte de plusieurs lignes (résumé, description, mission), avec aide et erreur annoncées.
export function ZoneTexte({
  label,
  name,
  aide,
  erreurs,
  className = "",
  rows = 3,
  ...props
}: ComponentProps<"textarea"> & { label: string; name: string; aide?: string; erreurs?: string[] }) {
  const id = props.id ?? `champ-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <textarea
        {...props}
        id={id}
        name={name}
        rows={rows}
        aria-invalid={erreurs && erreurs.length > 0 ? true : undefined}
        aria-describedby={decritPar(id, aide, erreurs)}
        className={styleSaisie}
      />
      <MessagesChamp id={id} aide={aide} erreurs={erreurs} />
    </div>
  );
}
```

Remplacer les trois blocs `<div><label …><textarea …/><p …aide…/>{erreur}</div>` écrits à la main :
- actualités : `<ZoneTexte label="Résumé" name="resume" defaultValue={actualite?.resume} aide="…" erreurs={erreurs?.resume} />`, en reprenant le texte d'aide actuel du fichier ;
- événements : `<ZoneTexte label="Résumé" name="resume" defaultValue={evenement?.resume} aide="Deux ou trois phrases, affichées dans les listes et en tête de la page." erreurs={erreurs?.resume} />` ;
- partenaires : `<ZoneTexte label="Description" name="description" defaultValue={partenaire?.description} aide="Une ou deux phrases, affichées sur la page Partenaires." erreurs={erreurs?.description} />`.

- [ ] **Step 2: `ListeEditable` sans champ caché, avec `onChange`**

Dans `src/components/admin/champs/liste-editable.tsx` :
- le type des props devient `name?: string` et gagne `onChange?: (valeurs: T[]) => void` ;
- ajouter, après `focaliser` :

```tsx
  // Toute modification passe par ici : une liste imbriquée remonte sa valeur à la liste parente.
  function changer(suivante: Element<T>[]) {
    setElements(suivante);
    onChange?.(suivante.map((e) => e.valeur));
  }
```

- dans `agir`, remplacer `setElements(suivante)` par `changer(suivante)` ;
- `modifier` devient : `const modifier = (index: number) => (patch: Partial<T>) => changer(elements.map((e, i) => (i === index ? { ...e, valeur: { ...e.valeur, ...patch } } : e)));` ;
- le bouton d'ajout fait `changer([...elements, { cle: compteur.current++, valeur: nouvelElement() }])` ;
- le champ caché n'est rendu que si `name` est fourni : `{name && <input type="hidden" name={name} value={JSON.stringify(elements.map((e) => e.valeur))} />}`.

- [ ] **Step 3: `ChampSlug`**

Ajouter la prop `aideVerrouille = "Ce contenu a déjà été publié : son lien a pu être partagé."` et l'utiliser à la place de ce texte dans `aide`.

- [ ] **Step 4: Vérifier**

Run: `npx tsc --noEmit && npx eslint src/components src/app/admin && npm run build && E2E_AUTORISE=1 npm run test:e2e`
Expected: tout passe. Les parcours existants (actualités, événements, partenaires, accessibilité) trouvent toujours « Résumé » et « Description » par leur libellé, et le focus clavier des listes est inchangé.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin "src/app/admin/(espace)/actualites/formulaire.tsx" "src/app/admin/(espace)/evenements/formulaire.tsx" "src/app/admin/(espace)/partenaires/formulaire.tsx"
git commit -m "Admin : zone de texte partagée (erreur annoncée), listes éditables imbriquables, aide du lien verrouillé paramétrable

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 3: Schéma de validation des membres

**Files:**
- Modify: `src/lib/validation/commun.ts`, `src/lib/validation/evenements.ts`
- Create: `src/lib/validation/membres.ts`, `src/lib/validation/membres.test.ts`

**Interfaces:**
- Consumes: `champJson`, `champSlug`, `urlWeb`, `caseACocher`, `idMediaFacultatif`.
- Produces:
  - dans `commun.ts` : `texteFacultatif(max: number)` (déplacé depuis `evenements.ts`, inchangé : vide → `null`) et `htmlRicheFacultatif` (HTML nettoyé ; vide ou balises vides → `null`).
  - `schemaMembre` : sa sortie est exactement `DonneesMembre` (tâche 4) :
    `{ nom: string; slug: string; titre: string; specialite: string; promotion: number | null; numero: number | null; organisation: string | null; ville: string | null; resume: string; bio: string | null; parcours: Etape[]; competences: string[]; realisations: Realisation[]; liens: Liens | null; photoId: string | null; visible: boolean }`
  - `schemaEnvoiMembre` : la même chose, plus `modifierSlug: boolean` et `version?: string`.
  - Le formulaire envoie les liens dans trois champs à plat (`lienLinkedin`, `lienEmail`, `lienSite`), et les erreurs y sont rattachées ; les compétences arrivent en JSON `[{ nom }]`.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/validation/membres.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { membres as membresInitiaux } from "@/db/donnees-initiales/membres";
import { paragraphesEnHtml } from "@/lib/html";
import { schemaEnvoiMembre, schemaMembre } from "./membres";

const valide = {
  nom: " Dr Ibrahima Diao ",
  slug: "ibrahima-diao",
  titre: "Chef de mission",
  specialite: "Géologie",
  promotion: "2006",
  numero: "173",
  organisation: "CACO",
  ville: "",
  resume: "Président de l'ADEMIG.",
  bio: "<p>Bio <strong>riche</strong><script>alert(1)</script></p>",
  parcours: '[{"periode":"2006","poste":"Ingénieur diplômé","organisation":"IST","description":""}]',
  competences: '[{"nom":"Géologie"},{"nom":" Contenu local "}]',
  realisations: "[]",
  lienLinkedin: "",
  lienEmail: "diao@example.org",
  lienSite: "",
  photoId: "",
  visible: "on",
};

describe("schemaMembre", () => {
  it("lit un formulaire complet et nettoie la biographie", () => {
    expect(schemaMembre.parse(valide)).toEqual({
      nom: "Dr Ibrahima Diao",
      slug: "ibrahima-diao",
      titre: "Chef de mission",
      specialite: "Géologie",
      promotion: 2006,
      numero: 173,
      organisation: "CACO",
      ville: null,
      resume: "Président de l'ADEMIG.",
      bio: "<p>Bio <strong>riche</strong></p>",
      parcours: [{ periode: "2006", poste: "Ingénieur diplômé", organisation: "IST" }],
      competences: ["Géologie", "Contenu local"],
      realisations: [],
      liens: { email: "diao@example.org" },
      photoId: null,
      visible: true,
    });
  });

  it("accepte les membres actuels du site", () => {
    for (const m of membresInitiaux) {
      const r = schemaMembre.safeParse({
        nom: m.nom,
        slug: m.slug,
        titre: m.titre,
        specialite: m.specialite,
        promotion: m.promotion?.toString() ?? "",
        numero: m.numero?.toString() ?? "",
        organisation: m.organisation ?? "",
        ville: m.ville ?? "",
        resume: m.resume,
        bio: m.bio ? paragraphesEnHtml(m.bio) : "",
        parcours: JSON.stringify(m.parcours),
        competences: JSON.stringify(m.competences.map((nom) => ({ nom }))),
        realisations: JSON.stringify(m.realisations ?? []),
        lienLinkedin: m.liens?.linkedin ?? "",
        lienEmail: m.liens?.email ?? "",
        lienSite: m.liens?.site ?? "",
        photoId: "",
      });
      expect(r.success, `${m.slug} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("donne null aux champs facultatifs vides et masque par défaut", () => {
    const r = schemaMembre.parse({ ...valide, bio: "<p> </p>", promotion: "", numero: "", lienEmail: "", visible: undefined });
    expect(r).toMatchObject({ bio: null, promotion: null, numero: null, liens: null, visible: false });
  });

  it.each([
    ["nom", { nom: "" }],
    ["slug", { slug: "Pas Bon" }],
    ["titre", { titre: " " }],
    ["promotion", { promotion: "deux mille" }],
    ["numero", { numero: "-3" }],
    ["resume", { resume: "" }],
    ["lienLinkedin", { lienLinkedin: "javascript:alert(1)" }],
    ["lienEmail", { lienEmail: "pas-un-email" }],
    ["parcours", { parcours: '[{"periode":"","poste":"x","organisation":"y"}]' }],
    ["competences", { competences: '[{"nom":"SIG"},{"nom":"sig"}]' }],
    ["realisations", { realisations: '[{"titre":"x","description":""}]' }],
    ["photoId", { photoId: "x" }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaMembre.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });
});

describe("schemaEnvoiMembre", () => {
  it("ajoute déverrouillage et version", () => {
    expect(schemaEnvoiMembre.parse({ ...valide, modifierSlug: "on", version: "2026-10-10T10:00:00.000Z" })).toMatchObject({
      modifierSlug: true,
      version: "2026-10-10T10:00:00.000Z",
      liens: { email: "diao@example.org" },
    });
    expect(schemaEnvoiMembre.safeParse({ ...valide, version: "hier" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/validation/membres.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

Dans `src/lib/validation/commun.ts`, déplacer `texteFacultatif` depuis `evenements.ts` (en l'exportant) et ajouter `htmlRicheFacultatif` :

```ts
export const texteFacultatif = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au plus.`)
    .optional()
    .transform((v) => v || null);

// Texte riche facultatif (biographie) : nettoyé, et null s'il n'a aucun texte visible.
export const htmlRicheFacultatif = z
  .string()
  .optional()
  .transform((v) => {
    const html = nettoyerHtml(v ?? "");
    return texteDe(html).length > 0 ? html : null;
  });
```

`src/lib/validation/evenements.ts` importe désormais `texteFacultatif` depuis `./commun`.

`src/lib/validation/membres.ts` :

```ts
import { z } from "zod";
import type { Liens } from "@/lib/content/types";
import { caseACocher, champJson, champSlug, htmlRicheFacultatif, idMediaFacultatif, texteFacultatif, urlWeb } from "./commun";

const texte = (message: string, max: number) => z.string().trim().min(1, message).max(max, `${max} caractères au plus.`);

// Nombre entier facultatif saisi dans un champ texte : vide donne null.
function entierFacultatif(min: number, max: number, message: string) {
  return z
    .string()
    .optional()
    .transform((v, ctx) => {
      const t = v?.trim() ?? "";
      if (!t) return null;
      const n = Number(t);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return n;
    });
}

const vide = (v: string | undefined) => v?.trim() || undefined;
const urlFacultative = z.string().optional().transform(vide).pipe(urlWeb.optional());
const emailFacultatif = z
  .string()
  .optional()
  .transform(vide)
  .pipe(z.email({ error: "Adresse email invalide." }).optional());

const etape = z.object({
  periode: texte("Indiquez la période.", 60),
  poste: texte("Indiquez le poste.", 200),
  organisation: texte("Indiquez l'employeur ou l'école.", 200),
  description: z.string().trim().max(600, "600 caractères au plus.").optional().transform((v) => v || undefined),
});

const realisation = z.object({
  titre: texte("Donnez un titre à chaque réalisation.", 200),
  annee: z.string().trim().max(20, "20 caractères au plus.").optional().transform((v) => v || undefined),
  description: texte("Décrivez chaque réalisation.", 600),
});

const competences = champJson(
  z
    .array(z.object({ nom: texte("Écrivez chaque compétence.", 60) }))
    .max(30, "30 compétences au plus.")
    .refine((l) => new Set(l.map((c) => c.nom.toLowerCase())).size === l.length, "Une compétence figure deux fois."),
).transform((l) => l.map((c) => c.nom));

const champs = z.object({
  nom: texte("Indiquez le nom.", 120),
  slug: champSlug,
  titre: texte("Indiquez le poste actuel.", 120),
  specialite: texte("Indiquez la spécialité.", 120),
  promotion: entierFacultatif(1950, 2100, "Indiquez l'année de la promotion (ex. : 2008)."),
  numero: entierFacultatif(1, 99_999, "Le numéro est un nombre entier positif."),
  organisation: texteFacultatif(120),
  ville: texteFacultatif(100),
  resume: texte("Écrivez un résumé.", 600),
  bio: htmlRicheFacultatif,
  parcours: champJson(z.array(etape).max(30, "30 étapes au plus.")),
  competences,
  realisations: champJson(z.array(realisation).max(20, "20 réalisations au plus.")),
  lienLinkedin: urlFacultative,
  lienEmail: emailFacultatif,
  lienSite: urlFacultative,
  photoId: idMediaFacultatif,
  visible: caseACocher,
});

// Les trois liens arrivent à plat (une erreur par champ) et sont rangés comme en base.
function avecLiens<T extends { lienLinkedin?: string; lienEmail?: string; lienSite?: string }>({
  lienLinkedin,
  lienEmail,
  lienSite,
  ...reste
}: T) {
  const liens: Liens = {};
  if (lienLinkedin) liens.linkedin = lienLinkedin;
  if (lienEmail) liens.email = lienEmail;
  if (lienSite) liens.site = lienSite;
  return { ...reste, liens: Object.keys(liens).length > 0 ? liens : null };
}

export const schemaMembre = champs.transform(avecLiens);

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiMembre = champs
  .extend({ modifierSlug: caseACocher, version: z.iso.datetime().optional() })
  .transform(avecLiens);
```

Si un membre initial dépasse une longueur, relever la limite concernée plutôt que de modifier les données.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/validation && npx tsc --noEmit`
Expected: PASS, y compris les tests existants des événements.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation
git commit -m "Schéma de validation des membres ; texte facultatif et biographie facultative partagés

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 4: Opérations d'écriture des membres

**Files:**
- Create: `src/db/operations/membres.ts`, `src/db/operations/membres.test.ts`

**Interfaces:**
- Consumes: `verifierSlugLibre`, `memeVersion`, `CONFLIT` (`./commun`), `ErreurMetier`.
- Produces:
  - `type DonneesMembre` (voir tâche 3)
  - `creerMembre(db: Db, d: DonneesMembre): Promise<{ id: string }>`
  - `modifierMembre(db: Db, id: string, d: DonneesMembre, o: { version: string; modifierSlug: boolean }): Promise<{ version: string }>`
  - `supprimerMembre(db: Db, id: string): Promise<void>`
  - Messages : « Membre introuvable. » ; « Ce lien est déjà utilisé par un autre membre. » (champ `slug`) ; « Cette fiche est visible sur le site : cliquez sur « Modifier le lien » pour changer son adresse. » (champ `slug`) ; `DANS_UN_BUREAU` = « Ce membre fait partie d'un bureau, actuel ou passé : il ne peut pas être supprimé. Décochez « Visible sur le site » pour masquer sa fiche. »

- [ ] **Step 1: Écrire les tests qui échouent**

`src/db/operations/membres.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { commissionMembres, commissions, mandats, membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { CONFLIT } from "./commun";
import { ErreurMetier } from "./erreurs";
import { creerMembre, type DonneesMembre, modifierMembre, supprimerMembre } from "./membres";

const base: DonneesMembre = {
  nom: "Awa Ndiaye",
  slug: "awa-ndiaye",
  titre: "Géologue",
  specialite: "Géologie",
  promotion: 2015,
  numero: null,
  organisation: null,
  ville: "Dakar",
  resume: "Résumé.",
  bio: null,
  parcours: [{ periode: "2015", poste: "Ingénieure diplômée", organisation: "ENSMG" }],
  competences: ["SIG"],
  realisations: [],
  liens: { email: "awa@example.org" },
  photoId: null,
  visible: false,
};

const lire = async (db: Db, id: string) => (await db.query.membres.findFirst({ where: eq(membres.id, id) }))!;
const version = async (db: Db, id: string) => (await lire(db, id)).majLe.toISOString();

async function mandatInactif(db: Db) {
  const [m] = await db.insert(mandats).values({ libelle: "Bureau 2020", dateElection: "2020-09-20" }).returning({ id: mandats.id });
  return m.id;
}

describe("membres", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("crée une fiche avec ses listes et ses liens", async () => {
    const { id } = await creerMembre(db, base);
    expect(await lire(db, id)).toMatchObject({ nom: "Awa Ndiaye", visible: false, competences: ["SIG"], liens: { email: "awa@example.org" } });
  });

  it("refuse un lien déjà pris, sur le champ slug", async () => {
    await creerMembre(db, base);
    const erreur = await creerMembre(db, { ...base, nom: "Autre" }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("slug");
  });

  it("refuse une version périmée sans rien écrire", async () => {
    const { id } = await creerMembre(db, base);
    const v = await version(db, id);
    await modifierMembre(db, id, { ...base, titre: "Premier" }, { version: v, modifierSlug: false });
    const erreur = await modifierMembre(db, id, { ...base, titre: "Second" }, { version: v, modifierSlug: false }).catch((e) => e);
    expect(erreur.message).toBe(CONFLIT);
    expect((await lire(db, id)).titre).toBe("Premier");
  });

  it("laisse changer le lien d'une fiche masquée, l'exige déverrouillé si elle est visible", async () => {
    const { id } = await creerMembre(db, base);
    await modifierMembre(db, id, { ...base, slug: "awa-ndiaye-2" }, { version: await version(db, id), modifierSlug: false });
    await modifierMembre(db, id, { ...base, slug: "awa-ndiaye-2", visible: true }, { version: await version(db, id), modifierSlug: false });
    const erreur = await modifierMembre(db, id, { ...base, slug: "awa", visible: true }, { version: await version(db, id), modifierSlug: false }).catch((e) => e);
    expect(erreur.champ).toBe("slug");
    await modifierMembre(db, id, { ...base, slug: "awa", visible: true }, { version: await version(db, id), modifierSlug: true });
    expect((await lire(db, id)).slug).toBe("awa");
  });

  it("refuse de supprimer un membre qui occupe un poste, même dans un ancien mandat", async () => {
    const { id } = await creerMembre(db, base);
    await db.insert(postesBureau).values({ mandatId: await mandatInactif(db), membreId: id, fonction: "Trésorière", ordre: 0 });
    await expect(supprimerMembre(db, id)).rejects.toThrow(/fait partie d'un bureau/);
    expect(await lire(db, id)).toBeDefined();
  });

  it("refuse de supprimer un membre présent dans une seule commission", async () => {
    const { id } = await creerMembre(db, base);
    const [c] = await db.insert(commissions).values({ mandatId: await mandatInactif(db), nom: "Finances", mission: "Budget.", ordre: 0 }).returning({ id: commissions.id });
    await db.insert(commissionMembres).values({ commissionId: c.id, membreId: id, ordre: 0 });
    await expect(supprimerMembre(db, id)).rejects.toThrow(/fait partie d'un bureau/);
  });

  it("supprime une fiche libre et signale un membre introuvable", async () => {
    const { id } = await creerMembre(db, base);
    await supprimerMembre(db, id);
    expect(await db.query.membres.findFirst({ where: eq(membres.id, id) })).toBeUndefined();
    await expect(supprimerMembre(db, id)).rejects.toThrow("Membre introuvable.");
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/db/operations/membres.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/db/operations/membres.ts` :

```ts
import { and, eq } from "drizzle-orm";
import { commissionMembres, membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Etape, Liens, Realisation } from "@/lib/content/types";
import { CONFLIT, memeVersion, verifierSlugLibre } from "./commun";
import { ErreurMetier } from "./erreurs";

export type DonneesMembre = {
  nom: string;
  slug: string;
  titre: string;
  specialite: string;
  promotion: number | null;
  numero: number | null;
  organisation: string | null;
  ville: string | null;
  resume: string;
  // HTML nettoyé, ou null : la fiche affiche alors le résumé.
  bio: string | null;
  parcours: Etape[];
  competences: string[];
  realisations: Realisation[];
  liens: Liens | null;
  photoId: string | null;
  visible: boolean;
};

const INTROUVABLE = "Membre introuvable.";
const SLUG_PRIS = "Ce lien est déjà utilisé par un autre membre.";
export const DANS_UN_BUREAU =
  "Ce membre fait partie d'un bureau, actuel ou passé : il ne peut pas être supprimé. Décochez « Visible sur le site » pour masquer sa fiche.";
const colonnesSlug = { table: membres, id: membres.id, slug: membres.slug };

export async function creerMembre(db: Db, d: DonneesMembre): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS);
    const [ligne] = await tx.insert(membres).values(d).returning({ id: membres.id });
    return ligne;
  });
}

export async function modifierMembre(
  db: Db,
  id: string,
  d: DonneesMembre,
  o: { version: string; modifierSlug: boolean },
): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuel = await tx.query.membres.findFirst({ where: eq(membres.id, id), columns: { slug: true, visible: true } });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    if (d.slug !== actuel.slug) {
      // Fiche visible : son lien a pu être partagé, il ne change que sur demande explicite.
      if (actuel.visible && !o.modifierSlug) {
        throw new ErreurMetier("Cette fiche est visible sur le site : cliquez sur « Modifier le lien » pour changer son adresse.", "slug");
      }
      await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS, id);
    }
    const [maj] = await tx
      .update(membres)
      .set(d)
      .where(and(eq(membres.id, id), memeVersion(membres.majLe, o.version)))
      .returning({ majLe: membres.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    return { version: maj.majLe.toISOString() };
  });
}

// Les postes et commissions partiraient en cascade : on refuse pour garder l'historique des bureaux.
export async function supprimerMembre(db: Db, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const actuel = await tx.query.membres.findFirst({ where: eq(membres.id, id), columns: { id: true } });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    const postes = await tx.$count(postesBureau, eq(postesBureau.membreId, id));
    const places = await tx.$count(commissionMembres, eq(commissionMembres.membreId, id));
    if (postes + places > 0) throw new ErreurMetier(DANS_UN_BUREAU);
    await tx.delete(membres).where(eq(membres.id, id));
  });
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/db/operations && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/operations/membres.ts src/db/operations/membres.test.ts
git commit -m "Opérations des membres : lien protégé quand la fiche est visible, suppression refusée pour un membre d'un bureau

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 5: Lectures de l'admin et aperçu des membres

**Files:**
- Modify: `src/db/requetes/membres.ts`
- Create: `src/db/requetes/admin/membres.ts`, `src/db/requetes/admin/membres.test.ts`
- Modify: `src/db/requetes/admin/apercu.ts`, `src/app/api/apercu/route.ts`
- Modify: `src/lib/content/membres.ts`, `src/app/(site)/membres/[slug]/page.tsx`

**Interfaces:**
- Consumes: `creerMembre`, `DonneesMembre` (tâche 4), `MediaChoisi`, `versMediaChoisi`, `motifRecherche`, `PAR_PAGE`, `Filtre`, `apercuAutorise`.
- Produces:
  - `postesDuMandatActif(db: Db): Promise<Map<string, { membreId: string; fonction: string; ordre: number }>>` (exporté, inchangé)
  - `trouverMembre(db: Db, slug: string, o?: { masques?: boolean }): Promise<Member | undefined>`
  - `type LigneMembreAdmin = { id: string; nom: string; slug: string; titre: string; visible: boolean; fonction: string | null }`
  - `listerMembresAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneMembreAdmin[]; total: number }>` : tous les membres, triés par nom, recherche sur le nom (le filtre `statut` est ignoré)
  - `type MembreAdmin = { id; nom; slug; titre; specialite; promotion: string; numero: string; organisation: string; ville: string; resume; bio: string; parcours: Etape[]; competences: string[]; realisations: Realisation[]; liens: { linkedin: string; email: string; site: string }; photo: MediaChoisi | null; visible: boolean; fonction: string | null; version: string }` (les champs facultatifs valent `""` quand ils sont vides)
  - `lireMembreAdmin(db: Db, id: string): Promise<MembreAdmin | undefined>`
  - `type OptionMembre = { id: string; nom: string; visible: boolean }` ; `optionsMembres(db: Db): Promise<OptionMembre[]>` : tous les membres par nom
  - `TypeApercu = "actualite" | "evenement" | "membre"`, avec `cheminApercu` renvoyant `/membres/<slug>`
  - `getMembrePourPage(slug: string): Promise<Member | undefined>`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/db/requetes/admin/membres.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { creerMembre, type DonneesMembre } from "@/db/operations/membres";
import { trouverMembre } from "@/db/requetes/membres";
import { mandats, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { cheminApercu } from "./apercu";
import { lireMembreAdmin, listerMembresAdmin, optionsMembres } from "./membres";

const base: DonneesMembre = {
  nom: "Awa Ndiaye",
  slug: "awa-ndiaye",
  titre: "Géologue",
  specialite: "Géologie",
  promotion: 2015,
  numero: null,
  organisation: null,
  ville: null,
  resume: "Résumé.",
  bio: null,
  parcours: [],
  competences: [],
  realisations: [],
  liens: null,
  photoId: null,
  visible: true,
};

describe("lectures de l'admin des membres", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("liste visibles et masqués par nom, avec la fonction du mandat actif", async () => {
    const { id } = await creerMembre(db, { ...base, nom: "Bineta Fall", slug: "bineta-fall" });
    await creerMembre(db, { ...base, visible: false });
    const [m] = await db.insert(mandats).values({ libelle: "Bureau", dateElection: "2024-09-22", actif: true }).returning({ id: mandats.id });
    await db.insert(postesBureau).values({ mandatId: m.id, membreId: id, fonction: "Secrétaire générale", ordre: 0 });

    const { lignes, total } = await listerMembresAdmin(db, { q: "", page: 1 });
    expect(total).toBe(2);
    expect(lignes.map((l) => [l.nom, l.visible, l.fonction])).toEqual([
      ["Awa Ndiaye", false, null],
      ["Bineta Fall", true, "Secrétaire générale"],
    ]);
    expect((await listerMembresAdmin(db, { q: "bine", page: 1 })).lignes.map((l) => l.slug)).toEqual(["bineta-fall"]);
  });

  it("lit une fiche prête pour le formulaire", async () => {
    const { id } = await creerMembre(db, { ...base, liens: { linkedin: "https://linkedin.com/in/awa" } });
    expect(await lireMembreAdmin(db, id)).toMatchObject({
      promotion: "2015",
      numero: "",
      organisation: "",
      bio: "",
      liens: { linkedin: "https://linkedin.com/in/awa", email: "", site: "" },
      photo: null,
      fonction: null,
    });
    expect((await lireMembreAdmin(db, id))!.version).toMatch(/\.\d{3}Z$/);
    expect(await lireMembreAdmin(db, crypto.randomUUID())).toBeUndefined();
  });

  it("propose tous les membres, masqués compris, par nom", async () => {
    await creerMembre(db, { ...base, nom: "Zackaria Diaw", slug: "zackaria-diaw" });
    await creerMembre(db, { ...base, visible: false });
    expect((await optionsMembres(db)).map((o) => [o.nom, o.visible])).toEqual([
      ["Awa Ndiaye", false],
      ["Zackaria Diaw", true],
    ]);
  });

  it("ne sert une fiche masquée qu'en aperçu et construit son chemin depuis la base", async () => {
    const { id } = await creerMembre(db, { ...base, visible: false });
    expect(await trouverMembre(db, "awa-ndiaye")).toBeUndefined();
    expect((await trouverMembre(db, "awa-ndiaye", { masques: true }))?.nom).toBe("Awa Ndiaye");
    expect(await cheminApercu(db, "membre", id)).toBe("/membres/awa-ndiaye");
    expect(await cheminApercu(db, "membre", crypto.randomUUID())).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/db/requetes/admin/membres.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

Dans `src/db/requetes/membres.ts` :
- exporter `postesDuMandatActif` ;
- réécrire `trouverMembre` pour lire la fiche directement (les tests existants de `requetes.test.ts` doivent rester verts) :

```ts
// `masques` n'est utilisé que pour l'aperçu, après contrôle de la session (src/lib/apercu.ts).
export async function trouverMembre(db: Db, slug: string, o: { masques?: boolean } = {}): Promise<Member | undefined> {
  const r = await db.query.membres.findFirst({
    where: (m, { and, eq }) => (o.masques ? eq(m.slug, slug) : and(eq(m.slug, slug), eq(m.visible, true))),
    with: { photo: true },
  });
  if (!r) return undefined;
  const postes = await postesDuMandatActif(db);
  return versMembre(r, postes.get(r.id)?.fonction);
}
```

`src/db/requetes/admin/membres.ts` :

```ts
import { asc, eq, ilike } from "drizzle-orm";
import { membres } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Filtre } from "@/lib/admin/filtre";
import type { Etape, Realisation } from "@/lib/content/types";
import { postesDuMandatActif } from "../membres";
import { type MediaChoisi, motifRecherche, PAR_PAGE, versMediaChoisi } from "./commun";

export type LigneMembreAdmin = { id: string; nom: string; slug: string; titre: string; visible: boolean; fonction: string | null };

export type MembreAdmin = {
  id: string;
  nom: string;
  slug: string;
  titre: string;
  specialite: string;
  // Champs facultatifs : "" quand ils sont vides, prêts pour les `defaultValue`.
  promotion: string;
  numero: string;
  organisation: string;
  ville: string;
  resume: string;
  bio: string;
  parcours: Etape[];
  competences: string[];
  realisations: Realisation[];
  liens: { linkedin: string; email: string; site: string };
  photo: MediaChoisi | null;
  visible: boolean;
  // Fonction au bureau en place, en lecture seule (elle se modifie dans la rubrique Bureau).
  fonction: string | null;
  version: string;
};

export type OptionMembre = { id: string; nom: string; visible: boolean };

export async function listerMembresAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneMembreAdmin[]; total: number }> {
  const ou = f.q ? ilike(membres.nom, motifRecherche(f.q)) : undefined;
  const [lignes, total, postes] = await Promise.all([
    db
      .select({ id: membres.id, nom: membres.nom, slug: membres.slug, titre: membres.titre, visible: membres.visible })
      .from(membres)
      .where(ou)
      .orderBy(asc(membres.nom))
      .limit(PAR_PAGE)
      .offset((f.page - 1) * PAR_PAGE),
    db.$count(membres, ou),
    postesDuMandatActif(db),
  ]);
  return { lignes: lignes.map((l) => ({ ...l, fonction: postes.get(l.id)?.fonction ?? null })), total };
}

export async function lireMembreAdmin(db: Db, id: string): Promise<MembreAdmin | undefined> {
  const m = await db.query.membres.findFirst({ where: eq(membres.id, id), with: { photo: true } });
  if (!m) return undefined;
  const postes = await postesDuMandatActif(db);
  return {
    id: m.id,
    nom: m.nom,
    slug: m.slug,
    titre: m.titre,
    specialite: m.specialite,
    promotion: m.promotion?.toString() ?? "",
    numero: m.numero?.toString() ?? "",
    organisation: m.organisation ?? "",
    ville: m.ville ?? "",
    resume: m.resume,
    bio: m.bio ?? "",
    parcours: m.parcours,
    competences: m.competences,
    realisations: m.realisations,
    liens: { linkedin: m.liens?.linkedin ?? "", email: m.liens?.email ?? "", site: m.liens?.site ?? "" },
    photo: m.photo ? versMediaChoisi(m.photo) : null,
    visible: m.visible,
    fonction: postes.get(m.id)?.fonction ?? null,
    version: m.majLe.toISOString(),
  };
}

// Choix d'un membre dans les postes et les commissions d'un mandat.
export async function optionsMembres(db: Db): Promise<OptionMembre[]> {
  return db.select({ id: membres.id, nom: membres.nom, visible: membres.visible }).from(membres).orderBy(asc(membres.nom));
}
```

Dans `src/db/requetes/admin/apercu.ts` : `export type TypeApercu = "actualite" | "evenement" | "membre";` et une branche `membre` qui lit `membres.slug` par id et renvoie `/membres/${slug}`.

Dans `src/app/api/apercu/route.ts` : `const TYPES: TypeApercu[] = ["actualite", "evenement", "membre"];`.

Dans `src/lib/content/membres.ts`, sur le modèle exact de `getActualitePourPage` :

```ts
// En aperçu, lecture directe (fiches masquées comprises) ; sinon, version en cache et visible.
export async function getMembrePourPage(slug: string): Promise<Member | undefined> {
  if (await apercuAutorise()) return trouverMembre(db, slug, { masques: true });
  return getMembre(slug);
}
```

Dans `src/app/(site)/membres/[slug]/page.tsx` :
- remplacer les deux appels `getMembre(slug)` (métadonnées et page) par `getMembrePourPage(slug)` ;
- n'afficher la section « Parcours » que si `m.parcours.length > 0`, comme « Réalisations » : une fiche créée dans l'admin peut ne pas en avoir.

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/db/requetes && npx tsc --noEmit && npm run build`
Expected: PASS. Dans la sortie du build, les pages `/membres/<slug>` restent en `●` (SSG).

- [ ] **Step 5: Commit**

```bash
git add src/db/requetes src/app/api/apercu/route.ts src/lib/content/membres.ts "src/app/(site)/membres/[slug]/page.tsx"
git commit -m "Lectures de l'admin des membres et aperçu des fiches masquées

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 6: Server Actions des membres

**Files:**
- Create: `src/lib/admin/membres.ts`, `src/lib/admin/membres.test.ts`

**Interfaces:**
- Consumes: `schemaEnvoiMembre` (tâche 3), les opérations de la tâche 4, `action`, `lireFormulaire`, `sansMeta`, `CONFLIT`, `TAGS`.
- Produces (fichier `"use server"`) :
  - `type ResultatMembre = Resultat<{ version: string }>`
  - `creerMembre(etat, donnees: FormData)` : redirige vers `/admin/membres/<id>?cree=1`
  - `enregistrerMembre(id: string, etat, donnees: FormData)` : message « Fiche enregistrée. »
  - `supprimerMembreAction(id: string): Promise<Resultat>` : « Membre supprimé. »
  - Introuvable : « Membre introuvable. »
  - Chaque écriture invalide `TAGS.membres` et `TAGS.bureau`, puis `revalidatePath` sur `/admin/membres`, `/admin/bureau` et, après un enregistrement, `/admin/membres/${id}`.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/admin/membres.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFLIT } from "@/db/operations/commun";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ creerMembre: vi.fn(), modifierMembre: vi.fn(), supprimerMembre: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/membres", () => ops);
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => ({ redirect }));

import { creerMembre, enregistrerMembre, supprimerMembreAction } from "./membres";

const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = { nom: "Awa Ndiaye", slug: "awa-ndiaye", titre: "Géologue", specialite: "Géologie", resume: "Résumé.", ...champs };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await creerMembre(null, formulaire())).toEqual(refus);
    expect(await enregistrerMembre(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z" }))).toEqual(refus);
    expect(await supprimerMembreAction(ID)).toEqual(refus);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" }));

  it("renvoie l'erreur d'email sans écrire", async () => {
    const r = await creerMembre(null, formulaire({ lienEmail: "pas-un-email" }));
    expect(!r.ok && r.erreurs?.lienEmail).toEqual(["Adresse email invalide."]);
    expect(ops.creerMembre).not.toHaveBeenCalled();
  });

  it("crée une fiche masquée par défaut, invalide membres et bureau, puis redirige", async () => {
    ops.creerMembre.mockResolvedValue({ id: ID });
    await creerMembre(null, formulaire());
    expect(ops.creerMembre).toHaveBeenCalledWith({}, expect.objectContaining({ visible: false, liens: null, bio: null, promotion: null, competences: [] }));
    expect(ops.creerMembre.mock.calls[0][1]).not.toHaveProperty("modifierSlug");
    expect(cache.revalidateTag).toHaveBeenCalledWith("membres", { expire: 0 });
    expect(cache.revalidateTag).toHaveBeenCalledWith("bureau", { expire: 0 });
    expect(redirect).toHaveBeenCalledWith(`/admin/membres/${ID}?cree=1`);
  });

  it("enregistre avec la version et le déverrouillage du lien", async () => {
    ops.modifierMembre.mockResolvedValue({ version: "2026-01-02T00:00:00.000Z" });
    const r = await enregistrerMembre(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z", modifierSlug: "on" }));
    expect(r).toEqual({ ok: true, message: "Fiche enregistrée.", donnees: { version: "2026-01-02T00:00:00.000Z" } });
    expect(ops.modifierMembre).toHaveBeenCalledWith({}, ID, expect.objectContaining({ nom: "Awa Ndiaye" }), {
      version: "2026-01-01T00:00:00.000Z",
      modifierSlug: true,
    });
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/admin/membres/${ID}`);
  });

  it("refuse un enregistrement sans version", async () => {
    expect(await enregistrerMembre(ID, null, formulaire())).toEqual({ ok: false, message: CONFLIT });
    expect(ops.modifierMembre).not.toHaveBeenCalled();
  });

  it("répond « introuvable » pour un identifiant invalide, sans requête", async () => {
    expect(await enregistrerMembre("x", null, formulaire())).toEqual({ ok: false, message: "Membre introuvable." });
    expect(await supprimerMembreAction("x")).toEqual({ ok: false, message: "Membre introuvable." });
    expect(ops.modifierMembre).not.toHaveBeenCalled();
    expect(ops.supprimerMembre).not.toHaveBeenCalled();
  });

  it("supprime et invalide le cache", async () => {
    ops.supprimerMembre.mockResolvedValue(undefined);
    expect(await supprimerMembreAction(ID)).toEqual({ ok: true, message: "Membre supprimé." });
    expect(cache.revalidateTag).toHaveBeenCalledWith("membres", { expire: 0 });
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/membres.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/lib/admin/membres.ts` :

```ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { CONFLIT } from "@/db/operations/commun";
import * as operations from "@/db/operations/membres";
import { action } from "@/lib/admin/action";
import { lireFormulaire, type Resultat, sansMeta } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaEnvoiMembre } from "@/lib/validation/membres";

export type ResultatMembre = Resultat<{ version: string }>;

const INTROUVABLE = { ok: false, message: "Membre introuvable." } as const;

// Une fiche apparaît dans l'annuaire, sur sa page et sur la page Bureau.
function invalider(id?: string) {
  revalidateTag(TAGS.membres, { expire: 0 });
  revalidateTag(TAGS.bureau, { expire: 0 });
  revalidatePath("/admin/membres");
  revalidatePath("/admin/bureau");
  if (id) revalidatePath(`/admin/membres/${id}`);
}

export async function creerMembre(_etat: ResultatMembre | null, donnees: FormData): Promise<ResultatMembre> {
  const resultat = await action<{ id: string }>("editeur", async () => {
    const saisie = lireFormulaire(schemaEnvoiMembre, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { id } = await operations.creerMembre(db, sansMeta(saisie.data));
    invalider();
    return { ok: true, donnees: { id } };
  });
  // La redirection se fait hors de `action()` : elle lève une exception propre à Next.
  if (resultat.ok) redirect(`/admin/membres/${resultat.donnees!.id}?cree=1`);
  return resultat;
}

export async function enregistrerMembre(id: string, _etat: ResultatMembre | null, donnees: FormData): Promise<ResultatMembre> {
  return action<{ version: string }>("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    const saisie = lireFormulaire(schemaEnvoiMembre, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { modifierSlug, version, ...champs } = saisie.data;
    if (!version) return { ok: false, message: CONFLIT };
    const r = await operations.modifierMembre(db, id, champs, { version, modifierSlug });
    invalider(id);
    return { ok: true, message: "Fiche enregistrée.", donnees: { version: r.version } };
  });
}

export async function supprimerMembreAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    await operations.supprimerMembre(db, id);
    invalider();
    return { ok: true, message: "Membre supprimé." };
  });
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/admin && npx tsc --noEmit && npx eslint src/lib/admin`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/membres.ts src/lib/admin/membres.test.ts
git commit -m "Server Actions des membres

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 7: Écrans des membres et lien d'usage des portraits

**Files:**
- Create: `src/app/admin/(espace)/membres/page.tsx`, `nouveau/page.tsx`, `[id]/page.tsx`, `formulaire.tsx`
- Modify: `src/app/admin/(espace)/[rubrique]/page.tsx` (retirer `membres`)
- Modify: `src/db/operations/media.ts`, `src/db/operations/media.test.ts`

**Interfaces:**
- Consumes: `listerMembresAdmin`, `lireMembreAdmin`, `MembreAdmin` (tâche 5) ; les actions de la tâche 6 ; `useFormulaire`, `ChampSlug` (`aideVerrouille`), `EditeurRiche`, `ListeEditable`, `ChampMedia`, `BoutonConfirmation`, `FiltresListe`, `Pagination`, `lireFiltre`, `ZoneTexte`.

- [ ] **Step 1: Liste, création et modification**

Sur le modèle exact de `src/app/admin/(espace)/evenements/`, avec les différences suivantes.

- **Liste** (`page.tsx`) : titre « Membres », lien « Nouveau membre », `BASE = "/admin/membres"`, `metadata.title` « Membres ». `<FiltresListe base={BASE} filtre={filtre} avecStatut={false} />`. Chaque ligne affiche le nom (gras), le titre, la fonction s'il y en a une, et un `Badge` « Visible » (vert) ou « Masqué » (moutarde). État vide : « Aucun membre pour le moment. », ou « Aucun membre ne correspond. » avec une recherche.
- **`nouveau/page.tsx`** : titre « Nouveau membre », lien de retour « ← Membres ».
- **`[id]/page.tsx`** : `lireMembreAdmin`, `notFound()` si l'id est invalide ou introuvable, titre `membre.nom`, `messageInitial` « Membre ajouté. » si `?cree=1`.

- [ ] **Step 2: Formulaire**

`src/app/admin/(espace)/membres/formulaire.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { ChampMedia } from "@/components/admin/champs/champ-media";
import { ChampSlug } from "@/components/admin/champs/champ-slug";
import { EditeurRiche } from "@/components/admin/champs/editeur-riche";
import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Badge, Bouton, Champ, ZoneTexte } from "@/components/admin/ui";
import type { MembreAdmin } from "@/db/requetes/admin/membres";
import { creerMembre, enregistrerMembre, supprimerMembreAction } from "@/lib/admin/membres";
import type { Resultat } from "@/lib/admin/resultat";

type EtapeSaisie = { periode: string; poste: string; organisation: string; description: string };
type RealisationSaisie = { titre: string; annee: string; description: string };

const lienStyle = "inline-flex min-h-11 items-center px-2 font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-moutarde";

export function FormulaireMembre({ membre, messageInitial }: { membre?: MembreAdmin; messageInitial?: string }) {
  const router = useRouter();
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(membre ? enregistrerMembre.bind(null, membre.id) : creerMembre);
  const [nom, setNom] = useState(membre?.nom ?? "");
  const [suppression, setSuppression] = useState<Resultat | null>(null);
  const [suppressionEnCours, demarrer] = useTransition();
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || membre?.version;
  const message = resultat ?? (messageInitial ? { ok: true as const, message: messageInitial } : null);
  const occupe = enCours || suppressionEnCours;

  // Un refus de suppression s'affiche près du bouton, et s'efface au prochain enregistrement.
  function soumettre(e: FormEvent<HTMLFormElement>) {
    setSuppression(null);
    onSubmit(e);
  }

  return (
    <form ref={formulaire} onSubmit={soumettre} noValidate className="space-y-6">
      <Alerte resultat={message} />
      {version && <input type="hidden" name="version" value={version} />}
      <Champ
        label="Nom"
        name="nom"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        aide="Tel qu'affiché sur le site, avec le titre éventuel (ex. : Dr Ibrahima Diao)."
        erreurs={erreurs?.nom}
        required
      />
      <ChampSlug
        titre={nom}
        valeurInitiale={membre?.slug ?? ""}
        verrouille={membre?.visible ?? false}
        aideVerrouille="Cette fiche est visible sur le site : son lien a pu être partagé."
        erreurs={erreurs?.slug}
      />
      <p className="text-sm">
        {membre?.fonction ? `Fonction au bureau en place : ${membre.fonction}.` : "Aucune fonction au bureau en place."} Les fonctions se
        modifient dans la rubrique Bureau.
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label="Poste actuel" name="titre" defaultValue={membre?.titre} aide="Ex. : Chef de mission, Doctorante." erreurs={erreurs?.titre} required />
        <Champ label="Organisation" name="organisation" defaultValue={membre?.organisation} aide="Facultative." erreurs={erreurs?.organisation} />
        <Champ label="Spécialité" name="specialite" defaultValue={membre?.specialite} aide="Ex. : Géologie, Pétrole et gaz." erreurs={erreurs?.specialite} required />
        <Champ label="Ville" name="ville" defaultValue={membre?.ville} aide="Facultative." erreurs={erreurs?.ville} />
        <Champ label="Promotion" name="promotion" inputMode="numeric" defaultValue={membre?.promotion} aide="Année du diplôme. Facultative." erreurs={erreurs?.promotion} />
        <Champ label="Numéro d'ingénieur" name="numero" inputMode="numeric" defaultValue={membre?.numero} aide="Numéro dans l'annuaire de l'école. Facultatif." erreurs={erreurs?.numero} />
      </div>
      <ZoneTexte
        label="Résumé"
        name="resume"
        defaultValue={membre?.resume}
        aide="Deux ou trois phrases, affichées dans l'annuaire et en tête de la fiche."
        erreurs={erreurs?.resume}
      />
      <EditeurRiche
        libelle="Biographie"
        name="bio"
        valeurInitiale={membre?.bio ?? ""}
        aide="Facultative. À défaut, la fiche affiche le résumé."
        erreurs={erreurs?.bio}
      />
      <ChampMedia libelle="Portrait" name="photoId" valeurInitiale={membre?.photo ?? null} erreurs={erreurs?.photoId} />
      <ListeEditable<EtapeSaisie>
        libelle="Parcours"
        name="parcours"
        valeurInitiale={(membre?.parcours ?? []).map((e) => ({ ...e, description: e.description ?? "" }))}
        nouvelElement={() => ({ periode: "", poste: "", organisation: "", description: "" })}
        libelleAjout="Ajouter une étape"
        erreurs={erreurs?.parcours}
        rendu={(e, modifier, i, idElement) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`${idElement}-periode`} label="Période" name={`${idElement}-periode`} form="" value={e.periode} onChange={(ev) => modifier({ periode: ev.target.value })} aide="Ex. : Depuis 2024, 2018 – 2021." />
            <Champ id={`${idElement}-poste`} label="Poste occupé" name={`${idElement}-poste`} form="" value={e.poste} onChange={(ev) => modifier({ poste: ev.target.value })} />
            <Champ id={`${idElement}-organisation`} label="Employeur ou école" name={`${idElement}-organisation`} form="" value={e.organisation} onChange={(ev) => modifier({ organisation: ev.target.value })} className="sm:col-span-2" />
            <ZoneTexte id={`${idElement}-description`} label="Description de l'étape" name={`${idElement}-description`} form="" rows={2} value={e.description} onChange={(ev) => modifier({ description: ev.target.value })} aide="Facultative." className="sm:col-span-2" />
          </div>
        )}
      />
      <ListeEditable<{ nom: string }>
        libelle="Compétences"
        name="competences"
        valeurInitiale={(membre?.competences ?? []).map((nom) => ({ nom }))}
        nouvelElement={() => ({ nom: "" })}
        libelleAjout="Ajouter une compétence"
        erreurs={erreurs?.competences}
        rendu={(c, modifier, i, idElement) => (
          <Champ id={`${idElement}-nom`} label="Compétence" name={`${idElement}-nom`} form="" value={c.nom} onChange={(ev) => modifier({ nom: ev.target.value })} />
        )}
      />
      <ListeEditable<RealisationSaisie>
        libelle="Réalisations"
        name="realisations"
        valeurInitiale={(membre?.realisations ?? []).map((r) => ({ titre: r.titre, annee: r.annee ?? "", description: r.description }))}
        nouvelElement={() => ({ titre: "", annee: "", description: "" })}
        libelleAjout="Ajouter une réalisation"
        erreurs={erreurs?.realisations}
        rendu={(r, modifier, i, idElement) => (
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <Champ id={`${idElement}-titre`} label="Titre de la réalisation" name={`${idElement}-titre`} form="" value={r.titre} onChange={(ev) => modifier({ titre: ev.target.value })} />
            <Champ id={`${idElement}-annee`} label="Année" name={`${idElement}-annee`} form="" value={r.annee} onChange={(ev) => modifier({ annee: ev.target.value })} aide="Facultative." />
            <ZoneTexte id={`${idElement}-description`} label="Description de la réalisation" name={`${idElement}-description`} form="" rows={2} value={r.description} onChange={(ev) => modifier({ description: ev.target.value })} className="sm:col-span-2" />
          </div>
        )}
      />
      <fieldset className="border-[1.5px] border-encre p-4">
        <legend className="px-1 font-bold">Liens</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <Champ label="Profil LinkedIn" name="lienLinkedin" type="url" defaultValue={membre?.liens.linkedin} aide="Facultatif. Adresse complète, avec https://." erreurs={erreurs?.lienLinkedin} />
          <Champ label="Site personnel" name="lienSite" type="url" defaultValue={membre?.liens.site} aide="Facultatif." erreurs={erreurs?.lienSite} />
          <Champ label="Email public" name="lienEmail" type="email" defaultValue={membre?.liens.email} aide="Affiché sur la fiche : laissez vide pour ne pas le publier." erreurs={erreurs?.lienEmail} />
        </div>
      </fieldset>
      <div>
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" name="visible" defaultChecked={membre?.visible ?? false} className="size-5 accent-brun" />
          Visible sur le site
        </label>
        <p className="text-sm">Une fiche masquée n&apos;apparaît ni dans l&apos;annuaire ni sur la page Bureau ; l&apos;aperçu reste possible.</p>
      </div>
      {membre && <p className="text-sm">L&apos;aperçu montre la dernière version enregistrée.</p>}
      <Alerte resultat={suppression} />
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t-[1.5px] border-encre bg-papier px-4 py-3 sm:-mx-8 sm:px-8">
        {membre && <Badge ton={membre.visible ? "vert" : "moutarde"}>{membre.visible ? "Visible" : "Masqué"}</Badge>}
        <Bouton type="submit" disabled={occupe}>
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </Bouton>
        {membre && (
          <a href={`/api/apercu?type=membre&id=${membre.id}`} target="_blank" rel="noopener" className={lienStyle}>
            Aperçu
          </a>
        )}
        {membre && (
          <div className="ml-auto">
            <BoutonConfirmation
              libelle="Supprimer le membre"
              question="Supprimer définitivement ce membre ? Son portrait reste dans la médiathèque."
              confirmer="Supprimer"
              disabled={occupe}
              onConfirmer={() =>
                demarrer(async () => {
                  const r = await supprimerMembreAction(membre.id);
                  if (r.ok) router.push("/admin/membres");
                  else setSuppression(r);
                })
              }
            />
          </div>
        )}
      </div>
    </form>
  );
}
```

Dans `src/app/admin/(espace)/[rubrique]/page.tsx`, supprimer l'entrée `membres`.

- [ ] **Step 3: Lien d'usage des portraits**

Dans `src/db/operations/media.ts` (`usagesMedia`), la requête des portraits sélectionne `{ id: membres.id, nom: membres.nom }`, et le lien devient `/admin/membres/${m.id}`. Le commentaire au-dessus du `return` dit désormais que chaque contenu a son écran d'édition. Dans `src/db/operations/media.test.ts`, l'attente du portrait de Dr Ibrahima Diao devient `{ libelle: "Fiche de Dr Ibrahima Diao", lien: \`/admin/membres/${diao.id}\` }`, où `diao` est lu en base par son slug `ibrahima-diao`, comme `actu` et `evt`.

- [ ] **Step 4: Vérification manuelle sans écriture**

Démarrer `npx next dev -p 3100`. Avec `curl`, sans cookie, `/admin/membres` et `/admin/membres/nouveau` doivent répondre par une redirection 307 vers `/admin/connexion`. Arrêter ensuite le serveur que vous avez lancé, et seulement celui-là. Ne créer aucun contenu : le parcours dans un navigateur est couvert par la tâche 12.

- [ ] **Step 5: Lint, types, tests, build**

Run: `npx eslint . && npx tsc --noEmit && npm test && npm run build`
Expected: tout passe.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(espace)/membres" "src/app/admin/(espace)/[rubrique]/page.tsx" src/db/operations/media.ts src/db/operations/media.test.ts
git commit -m "Écrans des membres : liste, fiche, visibilité, aperçu, suppression protégée

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 8: Schémas de validation du bureau

**Files:**
- Create: `src/lib/validation/bureau.ts`, `src/lib/validation/bureau.test.ts`

**Interfaces:**
- Consumes: `champJson`, `caseACocher`.
- Produces:
  - `schemaNouveauMandat` : sortie `{ libelle: string; dateElection: string; reprendreCommissions: boolean }`
  - `schemaMandat` : sortie exactement `DonneesMandat` (tâche 9) :
    `{ libelle: string; dateElection: string; postes: { membreId: string; fonction: string; executif: boolean }[]; commissions: { nom: string; mission: string; membres: string[] }[] }`
  - `schemaEnvoiMandat = schemaMandat.extend({ version: z.iso.datetime().optional() })`
  - Le formulaire envoie `postes` en JSON `[{ membreId, fonction, executif }]` et `commissions` en JSON `[{ nom, mission, membres: [{ membreId }] }]`.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/validation/bureau.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { erreursDe } from "@/lib/admin/resultat";
import { schemaEnvoiMandat, schemaMandat, schemaNouveauMandat } from "./bureau";

const A = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";
const B = "0b6a2a5e-3c1d-4f2e-8a9b-1c2d3e4f5a6b";

const valide = {
  libelle: " Bureau 2027 ",
  dateElection: "2027-09-20",
  postes: JSON.stringify([
    { membreId: A, fonction: "Président", executif: true },
    { membreId: B, fonction: " Trésorière ", executif: false },
  ]),
  commissions: JSON.stringify([{ nom: "Finances", mission: "Budget.", membres: [{ membreId: B }, { membreId: A }] }]),
};

describe("schemaMandat", () => {
  it("lit un mandat complet, dans l'ordre saisi", () => {
    expect(schemaMandat.parse(valide)).toEqual({
      libelle: "Bureau 2027",
      dateElection: "2027-09-20",
      postes: [
        { membreId: A, fonction: "Président", executif: true },
        { membreId: B, fonction: "Trésorière", executif: false },
      ],
      commissions: [{ nom: "Finances", mission: "Budget.", membres: [B, A] }],
    });
  });

  it("accepte un mandat encore vide", () => {
    expect(schemaMandat.parse({ libelle: "Bureau 2027", dateElection: "2027-09-20" })).toMatchObject({ postes: [], commissions: [] });
  });

  it("refuse un membre à deux postes", () => {
    const postes = JSON.stringify([
      { membreId: A, fonction: "Président", executif: true },
      { membreId: A, fonction: "Trésorier", executif: false },
    ]);
    const r = schemaMandat.safeParse({ ...valide, postes });
    expect(erreursDe(r.error!).erreurs).toEqual({ postes: ["Un membre n'occupe qu'un poste par mandat."] });
  });

  it("dit quel poste corriger", () => {
    const postes = JSON.stringify([
      { membreId: A, fonction: "Président", executif: true },
      { membreId: "", fonction: "Trésorier", executif: false },
    ]);
    const r = schemaMandat.safeParse({ ...valide, postes });
    expect(erreursDe(r.error!).erreurs).toEqual({ postes: ["Élément 2 : Choisissez un membre."] });
  });

  it("refuse un membre deux fois dans une commission, et deux commissions du même nom", () => {
    const doublonMembre = JSON.stringify([{ nom: "Finances", mission: "x", membres: [{ membreId: A }, { membreId: A }] }]);
    expect(schemaMandat.safeParse({ ...valide, commissions: doublonMembre }).success).toBe(false);
    const doublonNom = JSON.stringify([
      { nom: "Finances", mission: "x", membres: [] },
      { nom: "finances ", mission: "y", membres: [] },
    ]);
    const r = schemaMandat.safeParse({ ...valide, commissions: doublonNom });
    expect(erreursDe(r.error!).erreurs).toEqual({ commissions: ["Deux commissions portent le même nom."] });
  });

  it.each([
    ["libelle", { libelle: " " }],
    ["dateElection", { dateElection: "22/09/2024" }],
    ["postes", { postes: '[{"membreId":"x","fonction":"","executif":false}]' }],
    ["commissions", { commissions: '[{"nom":"","mission":"x","membres":[]}]' }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaMandat.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });

  it("refuse une version malformée", () => {
    expect(schemaEnvoiMandat.safeParse({ ...valide, version: "hier" }).success).toBe(false);
  });
});

describe("schemaNouveauMandat", () => {
  it("lit la case de reprise des commissions", () => {
    expect(schemaNouveauMandat.parse({ libelle: "Bureau 2027", dateElection: "2027-09-20", reprendreCommissions: "on" })).toEqual({
      libelle: "Bureau 2027",
      dateElection: "2027-09-20",
      reprendreCommissions: true,
    });
    expect(schemaNouveauMandat.parse({ libelle: "Bureau 2027", dateElection: "2027-09-20" }).reprendreCommissions).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/validation/bureau.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/lib/validation/bureau.ts` :

```ts
import { z } from "zod";
import { caseACocher, champJson } from "./commun";

const libelle = z.string().trim().min(1, "Nommez le mandat (ex. : Bureau 2024).").max(80, "80 caractères au plus.");
const dateElection = z.iso.date({ error: "Indiquez la date de l'élection." });
const idMembre = z.uuid({ error: "Choisissez un membre." });
const sansDoublon = (valeurs: string[]) => new Set(valeurs).size === valeurs.length;

export const schemaNouveauMandat = z.object({ libelle, dateElection, reprendreCommissions: caseACocher });

const poste = z.object({
  membreId: idMembre,
  fonction: z.string().trim().min(1, "Indiquez la fonction.").max(120, "120 caractères au plus."),
  executif: z.boolean(),
});

const commission = z.object({
  nom: z.string().trim().min(1, "Nommez la commission.").max(120, "120 caractères au plus."),
  mission: z.string().trim().min(1, "Décrivez la mission de la commission.").max(600, "600 caractères au plus."),
  membres: z
    .array(z.object({ membreId: idMembre }))
    .max(30, "30 membres au plus par commission.")
    .refine((l) => sansDoublon(l.map((m) => m.membreId)), "Un membre figure deux fois dans la même commission.")
    .transform((l) => l.map((m) => m.membreId)),
});

export const schemaMandat = z.object({
  libelle,
  dateElection,
  postes: champJson(
    z
      .array(poste)
      .max(40, "40 postes au plus.")
      .refine((l) => sansDoublon(l.map((p) => p.membreId)), "Un membre n'occupe qu'un poste par mandat."),
  ),
  commissions: champJson(
    z
      .array(commission)
      .max(20, "20 commissions au plus.")
      .refine((l) => sansDoublon(l.map((c) => c.nom.toLowerCase())), "Deux commissions portent le même nom."),
  ),
});

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiMandat = schemaMandat.extend({ version: z.iso.datetime().optional() });
```

Un `refine` sur la liste entière doit garder un chemin `["postes"]` (sans index), d'où le message sans numéro attendu par les tests. Si Zod place l'erreur ailleurs, ajuster avec `superRefine` et `path: []`, sans changer les messages.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/validation/bureau.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/bureau.ts src/lib/validation/bureau.test.ts
git commit -m "Schémas de validation des mandats : postes et commissions ordonnés, doublons refusés

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 9: Opérations et lectures du bureau

**Files:**
- Create: `src/db/operations/bureau.ts`, `src/db/operations/bureau.test.ts`
- Create: `src/db/requetes/admin/bureau.ts` (testé dans `src/db/operations/bureau.test.ts`)

**Interfaces:**
- Consumes: `memeVersion`, `CONFLIT`, `ErreurMetier`, `lireBureau` (`src/db/requetes/organisation.ts`, pour vérifier le site public).
- Produces:
  - `type PosteSaisi = { membreId: string; fonction: string; executif: boolean }` ; `type CommissionSaisie = { nom: string; mission: string; membres: string[] }` ; `type DonneesMandat = { libelle: string; dateElection: string; postes: PosteSaisi[]; commissions: CommissionSaisie[] }`
  - `creerMandat(db: Db, d: { libelle: string; dateElection: string }, o: { reprendreCommissions: boolean }): Promise<{ id: string }>` : mandat inactif ; avec la reprise, copie nom, mission et ordre des commissions du mandat actif, sans leurs membres
  - `enregistrerMandat(db: Db, id: string, d: DonneesMandat, o: { version: string }): Promise<{ version: string }>` : réécrit postes et commissions dans l'ordre reçu
  - `activerMandat(db: Db, id: string): Promise<void>` : sans effet si le mandat est déjà actif ; garde `maj_le`
  - `supprimerMandat(db: Db, id: string): Promise<void>`
  - Messages : « Mandat introuvable. » ; « Ajoutez au moins un poste et enregistrez avant d'activer ce mandat. » ; « Le mandat en place ne peut pas être supprimé : activez d'abord un autre mandat. » ; « Un membre choisi n'existe plus : rechargez la page. »
  - `type LigneMandatAdmin = { id: string; libelle: string; dateElection: string; actif: boolean; postes: number }` ; `listerMandatsAdmin(db: Db): Promise<LigneMandatAdmin[]>` : par date d'élection décroissante
  - `type MandatAdmin = { id: string; libelle: string; dateElection: string; actif: boolean; version: string; postes: PosteSaisi[]; commissions: CommissionSaisie[] }` ; `lireMandatAdmin(db: Db, id: string): Promise<MandatAdmin | undefined>`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/db/operations/bureau.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { lireMandatAdmin, listerMandatsAdmin } from "@/db/requetes/admin/bureau";
import { lireBureau } from "@/db/requetes/organisation";
import { commissionMembres, commissions, mandats, membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { activerMandat, creerMandat, type DonneesMandat, enregistrerMandat, supprimerMandat } from "./bureau";
import { CONFLIT } from "./commun";

async function membre(db: Db, slug: string) {
  const [m] = await db.insert(membres).values({ slug, nom: slug, titre: "T", specialite: "S", resume: "R" }).returning({ id: membres.id });
  return m.id;
}

const version = async (db: Db, id: string) => (await lireMandatAdmin(db, id))!.version;
const actifs = async (db: Db) => (await db.select().from(mandats).where(eq(mandats.actif, true))).map((m) => m.libelle);

describe("bureau", () => {
  let db: Db;
  let a: string;
  let b: string;
  let enPlace: string;

  beforeEach(async () => {
    db = await creerDbTest();
    [a, b] = [await membre(db, "awa"), await membre(db, "bineta")];
    // Mandat en place, avec un poste et deux commissions.
    ({ id: enPlace } = await creerMandat(db, { libelle: "Bureau 2024", dateElection: "2024-09-22" }, { reprendreCommissions: false }));
    await enregistrerMandat(
      db,
      enPlace,
      {
        libelle: "Bureau 2024",
        dateElection: "2024-09-22",
        postes: [{ membreId: a, fonction: "Présidente", executif: true }],
        commissions: [
          { nom: "Finances", mission: "Budget.", membres: [b] },
          { nom: "Sociale", mission: "Solidarité.", membres: [] },
        ],
      },
      { version: await version(db, enPlace) },
    );
    await activerMandat(db, enPlace);
  });

  it("crée un mandat inactif et reprend les commissions du mandat en place, sans leurs membres", async () => {
    const { id } = await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: true });
    const mandat = (await lireMandatAdmin(db, id))!;
    expect(mandat.actif).toBe(false);
    expect(mandat.commissions).toEqual([
      { nom: "Finances", mission: "Budget.", membres: [] },
      { nom: "Sociale", mission: "Solidarité.", membres: [] },
    ]);
    const sansReprise = await creerMandat(db, { libelle: "Bureau 2030", dateElection: "2030-09-20" }, { reprendreCommissions: false });
    expect((await lireMandatAdmin(db, sansReprise.id))!.commissions).toEqual([]);
  });

  it("réécrit postes et commissions dans l'ordre reçu", async () => {
    const { id } = await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: false });
    const d: DonneesMandat = {
      libelle: "Bureau 2027",
      dateElection: "2027-09-20",
      postes: [
        { membreId: b, fonction: "Présidente", executif: true },
        { membreId: a, fonction: "Trésorière", executif: false },
      ],
      commissions: [{ nom: "Communication", mission: "Presse.", membres: [a, b] }],
    };
    await enregistrerMandat(db, id, d, { version: await version(db, id) });
    expect(await lireMandatAdmin(db, id)).toMatchObject({ postes: d.postes, commissions: d.commissions });
    await enregistrerMandat(db, id, { ...d, postes: [d.postes[1]], commissions: [] }, { version: await version(db, id) });
    expect(await lireMandatAdmin(db, id)).toMatchObject({ postes: [d.postes[1]], commissions: [] });
    expect(await db.select().from(commissionMembres)).toHaveLength(1); // seule celle du mandat en place reste
  });

  it("refuse une version périmée sans rien écrire", async () => {
    const v = await version(db, enPlace);
    await enregistrerMandat(db, enPlace, { libelle: "Bureau 2024 (1)", dateElection: "2024-09-22", postes: [], commissions: [] }, { version: v });
    const erreur = await enregistrerMandat(
      db,
      enPlace,
      { libelle: "Bureau 2024 (2)", dateElection: "2024-09-22", postes: [{ membreId: b, fonction: "X", executif: false }], commissions: [] },
      { version: v },
    ).catch((e) => e);
    expect(erreur.message).toBe(CONFLIT);
    expect(await lireMandatAdmin(db, enPlace)).toMatchObject({ libelle: "Bureau 2024 (1)", postes: [] });
  });

  it("refuse un membre disparu, sans rien écrire", async () => {
    const v = await version(db, enPlace);
    const erreur = await enregistrerMandat(
      db,
      enPlace,
      { libelle: "Autre", dateElection: "2024-09-22", postes: [{ membreId: crypto.randomUUID(), fonction: "X", executif: false }], commissions: [] },
      { version: v },
    ).catch((e) => e);
    expect(erreur.message).toBe("Un membre choisi n'existe plus : rechargez la page.");
    expect(await lireMandatAdmin(db, enPlace)).toMatchObject({ libelle: "Bureau 2024", version: v });
  });

  it("active un mandat d'un coup, sans changer sa version, et le site suit", async () => {
    const { id } = await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: false });
    const d = { libelle: "Bureau 2027", dateElection: "2027-09-20", postes: [{ membreId: b, fonction: "Présidente", executif: true }], commissions: [] };
    await enregistrerMandat(db, id, d, { version: await version(db, id) });
    const avant = await version(db, id);
    await activerMandat(db, id);
    expect(await actifs(db)).toEqual(["Bureau 2027"]);
    expect(await version(db, id)).toBe(avant);
    // Le formulaire resté ouvert s'enregistre encore.
    await enregistrerMandat(db, id, { ...d, libelle: "Bureau 2027-2030" }, { version: avant });
    expect((await lireBureau(db)).executif.map((m) => m.slug)).toEqual(["bineta"]);
    await activerMandat(db, id);
    expect(await actifs(db)).toEqual(["Bureau 2027-2030"]);
  });

  it("refuse d'activer un mandat sans poste, sans rien changer", async () => {
    const { id } = await creerMandat(db, { libelle: "Vide", dateElection: "2027-09-20" }, { reprendreCommissions: true });
    await expect(activerMandat(db, id)).rejects.toThrow("Ajoutez au moins un poste et enregistrez avant d'activer ce mandat.");
    expect(await actifs(db)).toEqual(["Bureau 2024"]);
  });

  it("refuse de supprimer le mandat en place, supprime un mandat inactif avec ses postes et commissions", async () => {
    await expect(supprimerMandat(db, enPlace)).rejects.toThrow(/mandat en place/);
    const { id } = await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: true });
    await supprimerMandat(db, id);
    expect(await lireMandatAdmin(db, id)).toBeUndefined();
    expect(await db.select().from(commissions).where(eq(commissions.mandatId, id))).toHaveLength(0);
    await expect(supprimerMandat(db, id)).rejects.toThrow("Mandat introuvable.");
    await expect(activerMandat(db, id)).rejects.toThrow("Mandat introuvable.");
  });

  it("liste les mandats, le plus récent d'abord, avec leur nombre de postes", async () => {
    await creerMandat(db, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: false });
    expect((await listerMandatsAdmin(db)).map((m) => [m.libelle, m.actif, m.postes])).toEqual([
      ["Bureau 2027", false, 0],
      ["Bureau 2024", true, 1],
    ]);
    expect(await db.select().from(postesBureau)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/db/operations/bureau.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Implémenter les opérations**

`src/db/operations/bureau.ts` :

```ts
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { commissionMembres, commissions, mandats, membres, postesBureau } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import { CONFLIT, memeVersion } from "./commun";
import { ErreurMetier } from "./erreurs";

export type PosteSaisi = { membreId: string; fonction: string; executif: boolean };
export type CommissionSaisie = { nom: string; mission: string; membres: string[] };
export type DonneesMandat = { libelle: string; dateElection: string; postes: PosteSaisi[]; commissions: CommissionSaisie[] };

const INTROUVABLE = "Mandat introuvable.";

export async function creerMandat(
  db: Db,
  d: { libelle: string; dateElection: string },
  o: { reprendreCommissions: boolean },
): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    const [mandat] = await tx.insert(mandats).values({ ...d, actif: false }).returning({ id: mandats.id });
    const actif = o.reprendreCommissions
      ? await tx.query.mandats.findFirst({ where: eq(mandats.actif, true), columns: { id: true } })
      : undefined;
    if (actif) {
      // Noms et missions seulement : la composition d'une commission change avec le bureau.
      const modeles = await tx
        .select({ nom: commissions.nom, mission: commissions.mission })
        .from(commissions)
        .where(eq(commissions.mandatId, actif.id))
        .orderBy(asc(commissions.ordre));
      if (modeles.length > 0) {
        await tx.insert(commissions).values(modeles.map((c, ordre) => ({ ...c, ordre, mandatId: mandat.id })));
      }
    }
    return mandat;
  });
}

// Sans ce contrôle, la clé étrangère répondrait par le message des images manquantes.
async function verifierMembres(tx: Tx, ids: string[]) {
  const uniques = [...new Set(ids)];
  if (uniques.length === 0) return;
  const trouves = await tx.select({ id: membres.id }).from(membres).where(inArray(membres.id, uniques));
  if (trouves.length !== uniques.length) throw new ErreurMetier("Un membre choisi n'existe plus : rechargez la page.");
}

// Tout l'écran d'un mandat est réécrit d'un coup, sous la version du mandat.
export async function enregistrerMandat(db: Db, id: string, d: DonneesMandat, o: { version: string }): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuel = await tx.query.mandats.findFirst({ where: eq(mandats.id, id), columns: { id: true } });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    const [maj] = await tx
      .update(mandats)
      .set({ libelle: d.libelle, dateElection: d.dateElection })
      .where(and(eq(mandats.id, id), memeVersion(mandats.majLe, o.version)))
      .returning({ majLe: mandats.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    await verifierMembres(tx, [...d.postes.map((p) => p.membreId), ...d.commissions.flatMap((c) => c.membres)]);

    await tx.delete(postesBureau).where(eq(postesBureau.mandatId, id));
    if (d.postes.length > 0) {
      await tx.insert(postesBureau).values(d.postes.map((p, ordre) => ({ ...p, ordre, mandatId: id })));
    }
    // Les membres des commissions partent en cascade avec elles.
    await tx.delete(commissions).where(eq(commissions.mandatId, id));
    for (const [ordre, c] of d.commissions.entries()) {
      const [ligne] = await tx
        .insert(commissions)
        .values({ mandatId: id, nom: c.nom, mission: c.mission, ordre })
        .returning({ id: commissions.id });
      if (c.membres.length > 0) {
        await tx.insert(commissionMembres).values(c.membres.map((membreId, rang) => ({ commissionId: ligne.id, membreId, ordre: rang })));
      }
    }
    return { version: maj.majLe.toISOString() };
  });
}

export async function activerMandat(db: Db, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const mandat = await tx.query.mandats.findFirst({ where: eq(mandats.id, id), columns: { actif: true } });
    if (!mandat) throw new ErreurMetier(INTROUVABLE);
    if (mandat.actif) return;
    if ((await tx.$count(postesBureau, eq(postesBureau.mandatId, id))) === 0) {
      throw new ErreurMetier("Ajoutez au moins un poste et enregistrez avant d'activer ce mandat.");
    }
    // majLe est recopié : activer ne doit pas invalider la version d'un formulaire ouvert.
    // L'index unique partiel refuse un second mandat actif si deux activations se croisent.
    await tx.update(mandats).set({ actif: false, majLe: sql`${mandats.majLe}` }).where(eq(mandats.actif, true));
    await tx.update(mandats).set({ actif: true, majLe: sql`${mandats.majLe}` }).where(eq(mandats.id, id));
  });
}

export async function supprimerMandat(db: Db, id: string): Promise<void> {
  // Le filtre sur `actif` protège aussi d'une activation survenue entre-temps.
  const lignes = await db
    .delete(mandats)
    .where(and(eq(mandats.id, id), eq(mandats.actif, false)))
    .returning({ id: mandats.id });
  if (lignes.length > 0) return;
  const existe = await db.query.mandats.findFirst({ where: eq(mandats.id, id), columns: { id: true } });
  throw new ErreurMetier(existe ? "Le mandat en place ne peut pas être supprimé : activez d'abord un autre mandat." : INTROUVABLE);
}
```

Si `tx.$count` n'existe pas sur une transaction dans la version installée de Drizzle, compter avec `select({ n: count() })` (import `count` de `drizzle-orm`), en gardant la même logique.

- [ ] **Step 4: Implémenter les lectures**

`src/db/requetes/admin/bureau.ts` :

```ts
import { eq } from "drizzle-orm";
import type { CommissionSaisie, PosteSaisi } from "@/db/operations/bureau";
import { mandats } from "@/db/schema";
import type { Db } from "@/db/types";

export type LigneMandatAdmin = { id: string; libelle: string; dateElection: string; actif: boolean; postes: number };

export type MandatAdmin = {
  id: string;
  libelle: string;
  dateElection: string;
  actif: boolean;
  version: string;
  postes: PosteSaisi[];
  commissions: CommissionSaisie[];
};

export async function listerMandatsAdmin(db: Db): Promise<LigneMandatAdmin[]> {
  const lignes = await db.query.mandats.findMany({
    orderBy: (m, { desc }) => [desc(m.dateElection), desc(m.creeLe)],
    with: { postes: { columns: { id: true } } },
  });
  return lignes.map((m) => ({ id: m.id, libelle: m.libelle, dateElection: m.dateElection, actif: m.actif, postes: m.postes.length }));
}

export async function lireMandatAdmin(db: Db, id: string): Promise<MandatAdmin | undefined> {
  const m = await db.query.mandats.findFirst({
    where: eq(mandats.id, id),
    with: {
      postes: { orderBy: (p, { asc }) => [asc(p.ordre)] },
      commissions: {
        orderBy: (c, { asc }) => [asc(c.ordre)],
        with: { membres: { orderBy: (cm, { asc }) => [asc(cm.ordre)] } },
      },
    },
  });
  if (!m) return undefined;
  return {
    id: m.id,
    libelle: m.libelle,
    dateElection: m.dateElection,
    actif: m.actif,
    version: m.majLe.toISOString(),
    postes: m.postes.map((p) => ({ membreId: p.membreId, fonction: p.fonction, executif: p.executif })),
    commissions: m.commissions.map((c) => ({ nom: c.nom, mission: c.mission, membres: c.membres.map((cm) => cm.membreId) })),
  };
}
```

- [ ] **Step 5: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/db && npx tsc --noEmit`
Expected: PASS, y compris `requetes.test.ts` et `seed.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/db/operations/bureau.ts src/db/operations/bureau.test.ts src/db/requetes/admin/bureau.ts
git commit -m "Bureau : mandat préparé hors ligne, réécrit sous contrôle de version, activé d'un coup ; mandat en place protégé

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 10: Server Actions du bureau

**Files:**
- Create: `src/lib/admin/bureau.ts`, `src/lib/admin/bureau.test.ts`

**Interfaces:**
- Consumes: `schemaNouveauMandat`, `schemaEnvoiMandat` (tâche 8), les opérations de la tâche 9, `action`, `lireFormulaire`, `CONFLIT`, `TAGS`.
- Produces (fichier `"use server"`) :
  - `type ResultatMandat = Resultat<{ version: string }>`
  - `creerMandatAction(etat: Resultat | null, donnees: FormData): Promise<Resultat>` : redirige vers `/admin/bureau/<id>?cree=1`
  - `enregistrerMandatAction(id: string, etat: ResultatMandat | null, donnees: FormData): Promise<ResultatMandat>` : « Mandat enregistré. »
  - `activerMandatAction(id: string): Promise<Resultat>` : « Mandat activé : il est désormais affiché sur le site. »
  - `supprimerMandatAction(id: string): Promise<Resultat>` : « Mandat supprimé. »
  - Introuvable : « Mandat introuvable. »
  - Chaque écriture invalide `TAGS.bureau` et `TAGS.membres`, puis `revalidatePath` sur `/admin/bureau`, `/admin/membres` et, si l'id est connu, `/admin/bureau/${id}`.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/admin/bureau.test.ts`, avec les mocks `@/lib/session`, `@/db`, `@/db/operations/bureau` (`creerMandat`, `enregistrerMandat`, `activerMandat`, `supprimerMandat`), `next/cache` et `next/navigation`, sur le modèle exact de `membres.test.ts` (tâche 6) :

```ts
const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";
const MEMBRE = "0b6a2a5e-3c1d-4f2e-8a9b-1c2d3e4f5a6b";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = { libelle: "Bureau 2027", dateElection: "2027-09-20", ...champs };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}
```

Les cas :
- **Sans rôle** : les quatre actions renvoient `{ ok: false, message: "Accès refusé." }`, sans appel d'opération ; `exigerRole` a été appelé avec `"editeur"`.
- **Création** : `creerMandatAction(null, formulaire({ reprendreCommissions: "on" }))` appelle `creerMandat({}, { libelle: "Bureau 2027", dateElection: "2027-09-20" }, { reprendreCommissions: true })`, invalide `"bureau"` et `"membres"` (`{ expire: 0 }`) et redirige vers `/admin/bureau/${ID}?cree=1`.
- **Enregistrement** : avec `version` et `postes` = `JSON.stringify([{ membreId: MEMBRE, fonction: "Président", executif: true }])`, `enregistrerMandat` est appelée avec `({}, ID, { libelle, dateElection, postes: [{ membreId: MEMBRE, fonction: "Président", executif: true }], commissions: [] }, { version })` et la réponse est `{ ok: true, message: "Mandat enregistré.", donnees: { version: … } }`.
- **Erreur numérotée** : `postes` = `JSON.stringify([{ membreId: "", fonction: "Président", executif: true }])` renvoie `erreurs.postes` = `["Élément 1 : Choisissez un membre."]`, sans appel d'opération.
- **Sans version** : `{ ok: false, message: CONFLIT }`, sans appel.
- **Activation** : `activerMandatAction(ID)` appelle `activerMandat({}, ID)`, invalide le cache et renvoie le message d'activation.
- **Identifiant invalide** : `"x"` donne « Mandat introuvable. » pour enregistrer, activer et supprimer, sans aucun appel d'opération.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/bureau.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/lib/admin/bureau.ts` :

```ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as operations from "@/db/operations/bureau";
import { CONFLIT } from "@/db/operations/commun";
import { action } from "@/lib/admin/action";
import { lireFormulaire, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaEnvoiMandat, schemaNouveauMandat } from "@/lib/validation/bureau";

export type ResultatMandat = Resultat<{ version: string }>;

const INTROUVABLE = { ok: false, message: "Mandat introuvable." } as const;
const idValide = (id: string) => z.uuid().safeParse(id).success;

// Le bureau en place donne aussi la fonction affichée sur les fiches des membres.
function invalider(id?: string) {
  revalidateTag(TAGS.bureau, { expire: 0 });
  revalidateTag(TAGS.membres, { expire: 0 });
  revalidatePath("/admin/bureau");
  revalidatePath("/admin/membres");
  if (id) revalidatePath(`/admin/bureau/${id}`);
}

export async function creerMandatAction(_etat: Resultat | null, donnees: FormData): Promise<Resultat> {
  const resultat = await action<{ id: string }>("editeur", async () => {
    const saisie = lireFormulaire(schemaNouveauMandat, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { reprendreCommissions, ...champs } = saisie.data;
    const { id } = await operations.creerMandat(db, champs, { reprendreCommissions });
    invalider();
    return { ok: true, donnees: { id } };
  });
  // La redirection se fait hors de `action()` : elle lève une exception propre à Next.
  if (resultat.ok) redirect(`/admin/bureau/${resultat.donnees!.id}?cree=1`);
  return resultat;
}

export async function enregistrerMandatAction(id: string, _etat: ResultatMandat | null, donnees: FormData): Promise<ResultatMandat> {
  return action<{ version: string }>("editeur", async () => {
    if (!idValide(id)) return INTROUVABLE;
    const saisie = lireFormulaire(schemaEnvoiMandat, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { version, ...champs } = saisie.data;
    if (!version) return { ok: false, message: CONFLIT };
    const r = await operations.enregistrerMandat(db, id, champs, { version });
    invalider(id);
    return { ok: true, message: "Mandat enregistré.", donnees: { version: r.version } };
  });
}

export async function activerMandatAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!idValide(id)) return INTROUVABLE;
    await operations.activerMandat(db, id);
    invalider(id);
    return { ok: true, message: "Mandat activé : il est désormais affiché sur le site." };
  });
}

export async function supprimerMandatAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!idValide(id)) return INTROUVABLE;
    await operations.supprimerMandat(db, id);
    invalider();
    return { ok: true, message: "Mandat supprimé." };
  });
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/admin && npx tsc --noEmit && npx eslint src/lib/admin`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/bureau.ts src/lib/admin/bureau.test.ts
git commit -m "Server Actions du bureau : créer, enregistrer, activer, supprimer un mandat

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 11: Écrans du bureau

**Files:**
- Create: `src/app/admin/(espace)/bureau/page.tsx`, `src/app/admin/(espace)/bureau/nouveau-mandat.tsx`
- Create: `src/app/admin/(espace)/bureau/[mandatId]/page.tsx`, `src/app/admin/(espace)/bureau/[mandatId]/formulaire.tsx`, `src/app/admin/(espace)/bureau/[mandatId]/actions-mandat.tsx`
- Modify: `src/app/admin/(espace)/[rubrique]/page.tsx` (retirer `bureau`)

**Interfaces:**
- Consumes: `listerMandatsAdmin`, `lireMandatAdmin`, `MandatAdmin` (tâche 9) ; `optionsMembres`, `OptionMembre` (tâche 5) ; les actions de la tâche 10 ; `ListeEditable` (`onChange`, `name` facultatif), `useFormulaire`, `BoutonConfirmation`, `ZoneTexte`, `Selection`, `formatDate` (`@/components/ui`).

- [ ] **Step 1: Liste des mandats et création**

`src/app/admin/(espace)/bureau/nouveau-mandat.tsx` :

```tsx
"use client";

import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { creerMandatAction } from "@/lib/admin/bureau";

export function FormulaireNouveauMandat({ mandatEnPlace }: { mandatEnPlace: boolean }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(creerMandatAction);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate aria-labelledby="titre-nouveau-mandat" className="space-y-4 border-[1.5px] border-encre p-4">
      <h2 id="titre-nouveau-mandat" className="font-titre text-2xl">
        Nouveau mandat
      </h2>
      <p>Préparez le prochain bureau sans rien changer au site, puis activez-le d&apos;un coup.</p>
      <Alerte resultat={resultat} />
      <div className="grid gap-6 sm:grid-cols-2">
        <Champ label="Libellé" name="libelle" aide="Ex. : Bureau 2027." erreurs={erreurs?.libelle} required />
        <Champ label="Date d'élection" name="dateElection" type="date" erreurs={erreurs?.dateElection} required />
      </div>
      {mandatEnPlace && (
        <label className="flex min-h-11 items-center gap-3 font-bold">
          <input type="checkbox" name="reprendreCommissions" defaultChecked className="size-5 accent-brun" />
          Reprendre les commissions du mandat en place (noms et missions, sans les membres)
        </label>
      )}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Création…" : "Créer le mandat"}
      </Bouton>
    </form>
  );
}
```

`src/app/admin/(espace)/bureau/page.tsx` (serveur) : `metadata.title` « Bureau », `exigerSession()`, `listerMandatsAdmin(db)`. Rendu :
- `<TitrePage>Bureau</TitrePage>` puis le paragraphe « Le mandat en place est celui de la page Bureau du site. Les anciens mandats restent consultables ici. » ;
- `EtatVide` « Aucun mandat pour le moment. » si la liste est vide ; sinon une `<ul>` sur le modèle de la liste des événements, où chaque ligne est un lien vers `/admin/bureau/${m.id}` qui affiche le libellé (gras), « Élu le {formatDate(m.dateElection)} », « {n} poste(s) » et un `Badge` « En place » (vert) ou « Inactif » (neutre) ;
- en dessous, `<div className="mt-10"><FormulaireNouveauMandat mandatEnPlace={mandats.some((m) => m.actif)} /></div>`.

- [ ] **Step 2: Activer et supprimer un mandat**

`src/app/admin/(espace)/bureau/[mandatId]/actions-mandat.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte } from "@/components/admin/ui";
import { activerMandatAction, supprimerMandatAction } from "@/lib/admin/bureau";
import type { Resultat } from "@/lib/admin/resultat";

export function ActionsMandat({ id, actif }: { id: string; actif: boolean }) {
  const router = useRouter();
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();

  if (actif) {
    return (
      <div className="mb-6 space-y-3">
        <Alerte resultat={resultat} />
        <p className="border-l-4 border-vert bg-vert/15 px-4 py-3">
          Ce mandat est en place : il est affiché sur la page Bureau du site, et vos modifications y seront visibles dès l&apos;enregistrement.
        </p>
      </div>
    );
  }
  return (
    <div className="mb-6 space-y-3">
      <Alerte resultat={resultat} />
      <p>Ce mandat est en préparation : il n&apos;est pas visible sur le site. Enregistrez vos modifications avant de l&apos;activer.</p>
      <div className="flex flex-wrap gap-3">
        <BoutonConfirmation
          libelle="Activer ce mandat"
          variante="principal"
          question="Activer ce mandat ? Il remplacera le bureau affiché sur le site."
          confirmer="Activer"
          disabled={enCours}
          onConfirmer={() => demarrer(async () => setResultat(await activerMandatAction(id)))}
        />
        <BoutonConfirmation
          libelle="Supprimer le mandat"
          question="Supprimer définitivement ce mandat, ses postes et ses commissions ? Les fiches des membres ne sont pas touchées."
          confirmer="Supprimer"
          disabled={enCours}
          onConfirmer={() =>
            demarrer(async () => {
              const r = await supprimerMandatAction(id);
              if (r.ok) router.push("/admin/bureau");
              else setResultat(r);
            })
          }
        />
      </div>
    </div>
  );
}
```

Après une activation réussie, `revalidatePath` rafraîchit la page : `actif` passe à `true` et le message de succès reste affiché au-dessus du paragraphe « en place ».

- [ ] **Step 3: Formulaire du mandat**

`src/app/admin/(espace)/bureau/[mandatId]/formulaire.tsx` :

```tsx
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
              Bureau exécutif (affiché en tête de la page Bureau)
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
```

Le JSON envoyé pour `commissions` contient `membres: [{ membreId }]`, ce que lit `schemaMandat` (tâche 8).

`src/app/admin/(espace)/bureau/[mandatId]/page.tsx` : `metadata.title` « Modifier un mandat ». La page fait `exigerSession()`, appelle `notFound()` si `mandatId` n'est pas un uuid, charge `Promise.all([lireMandatAdmin(db, mandatId), optionsMembres(db)])`, puis appelle `notFound()` si le mandat est introuvable. Elle rend :
- le lien « ← Bureau » vers `/admin/bureau` ;
- `<TitrePage>{mandat.libelle}</TitrePage>` ;
- `<ActionsMandat id={mandat.id} actif={mandat.actif} />` ;
- `<FormulaireMandat mandat={mandat} membres={membres} messageInitial={cree ? "Mandat créé." : undefined} />`.

Retirer `bureau` de `[rubrique]/page.tsx`, où il ne reste plus que `reglages`.

- [ ] **Step 4: Vérification manuelle sans écriture**

Démarrer `npx next dev -p 3100`. Avec `curl`, sans cookie, `/admin/bureau` doit répondre par une redirection 307 vers `/admin/connexion`. Arrêter ensuite le serveur que vous avez lancé, et seulement celui-là. Ne créer aucun mandat : le parcours dans un navigateur est couvert par la tâche 12.

- [ ] **Step 5: Lint, types, tests, build**

Run: `npx eslint . && npx tsc --noEmit && npm test && npm run build`
Expected: tout passe.

- [ ] **Step 6: Commit**

```bash
git add "src/app/admin/(espace)/bureau" "src/app/admin/(espace)/[rubrique]/page.tsx"
git commit -m "Écrans du bureau : mandats, postes et commissions ordonnés, activation et suppression

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 12: Parcours de bout en bout des membres et du bureau

**Files:**
- Create: `e2e/membres.spec.ts`, `e2e/bureau.spec.ts`
- Modify: `e2e/nettoyage.ts`, `e2e/preparation.ts`

- [ ] **Step 1: Nettoyage**

Dans `e2e/nettoyage.ts`, et au début de `preparation()` après la garde `E2E_AUTORISE`, avant la suppression des comptes (imports : `and`, `eq` de `drizzle-orm` ; `mandats`, `membres` du schéma) :

```ts
  // Jamais le mandat en place : seuls des mandats de test inactifs sont supprimés.
  await db.delete(mandats).where(and(like(mandats.libelle, "E2E %"), eq(mandats.actif, false)));
  await db.delete(membres).where(like(membres.slug, "e2e-%"));
```

Les mandats partent avant les membres : la suppression d'un membre resté dans un mandat de test n'est ainsi jamais bloquée.

- [ ] **Step 2: Parcours des membres**

`e2e/membres.spec.ts` :

```ts
import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const NOM = "E2E Membre de test";
const SLUG = "e2e-membre-de-test";

test("un éditeur prépare une fiche masquée, la prévisualise puis la supprime", async ({ page, context, browser }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/membres");
  await page.getByRole("link", { name: "Nouveau membre" }).click();

  await page.getByLabel("Nom", { exact: true }).fill(NOM);
  await expect(page.getByLabel("Lien de la page")).toHaveValue(SLUG);
  await page.getByLabel("Poste actuel").fill("Géologue d'exploration");
  await page.getByLabel("Spécialité").fill("Géologie");
  await page.getByLabel("Promotion").fill("2015");
  await page.getByLabel("Résumé").fill("Un résumé de test.");
  // Masquée par défaut à la création.
  await expect(page.getByLabel("Visible sur le site")).not.toBeChecked();

  const bio = page.getByRole("textbox", { name: "Biographie" });
  await bio.click();
  await page.keyboard.type("Une biographie ");
  // Tiptap rend le focus à l'éditeur à l'image suivante : on attend avant de taper.
  const gras = page.getByRole("button", { name: "Gras" });
  await gras.click();
  await expect(gras).toHaveAttribute("aria-pressed", "true");
  await expect(bio).toBeFocused();
  await page.keyboard.type("importante");

  await page.getByRole("button", { name: "Ajouter une étape" }).click();
  await page.getByLabel("Période").fill("2015");
  await page.getByLabel("Poste occupé").fill("Ingénieure diplômée");
  await page.getByLabel("Employeur ou école").fill("ENSMG");
  await page.getByRole("button", { name: "Ajouter une compétence" }).click();
  await page.getByLabel("Compétence", { exact: true }).fill("Cartographie");

  // Email invalide : erreur sur le champ, saisie des listes conservée.
  await page.getByLabel("Email public").fill("pas-un-email");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Adresse email invalide.")).toBeVisible();
  await expect(page.getByLabel("Période")).toHaveValue("2015");
  await page.getByLabel("Email public").fill("");

  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/membres\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Membre ajouté." })).toBeVisible();

  // Masquée : ni en accès direct, ni dans l'annuaire.
  expect((await page.request.get(`/membres/${SLUG}`)).status()).toBe(404);
  expect(await (await page.request.get("/membres")).text()).not.toContain(NOM);

  const [apercu] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1, name: NOM })).toBeVisible();
  await expect(apercu.locator("strong", { hasText: "importante" })).toBeVisible();
  await expect(apercu.getByText("Aperçu : ce contenu n'est peut-être pas publié.")).toBeVisible();

  // Le seul cookie de Draft Mode, sans session, ne montre pas la fiche.
  const cookies = (await context.cookies()).filter((c) => c.name === "__prerender_bypass");
  expect(cookies).toHaveLength(1);
  const autre = await browser.newContext();
  await autre.addCookies(cookies);
  const visiteur = await autre.newPage();
  await visiteur.goto(`/membres/${SLUG}`);
  await expect(visiteur.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await autre.close();

  await apercu.getByRole("button", { name: "Quitter l'aperçu" }).click();
  await expect(apercu.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await apercu.close();

  await page.getByRole("button", { name: "Supprimer le membre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/membres$/);
  await expect(page.getByText(NOM)).toHaveCount(0);
});
```

- [ ] **Step 3: Parcours du bureau**

`e2e/bureau.spec.ts` :

```ts
import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const MEMBRE = "E2E Membre du bureau";
const MANDAT = "E2E Mandat de test";

// Base partagée avec la production : on prépare un mandat, on ne l'active jamais.
test("un éditeur prépare un mandat sans toucher au bureau en place, puis le supprime", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);

  // Membre de test, masqué.
  await page.goto("/admin/membres/nouveau");
  await page.getByLabel("Nom", { exact: true }).fill(MEMBRE);
  await expect(page.getByLabel("Lien de la page")).toHaveValue("e2e-membre-du-bureau");
  await page.getByLabel("Poste actuel").fill("Géologue");
  await page.getByLabel("Spécialité").fill("Géologie");
  await page.getByLabel("Résumé").fill("Membre créé par les tests.");
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/membres\/[0-9a-f-]{36}\?cree=1$/);
  const fiche = page.url().replace(/\?cree=1$/, "");

  await page.goto("/bureau");
  const bureauAvant = await page.locator("main").innerText();

  // Nouveau mandat, inactif.
  await page.goto("/admin/bureau");
  await page.getByLabel("Libellé").fill(MANDAT);
  await page.getByLabel("Date d'élection").fill("2030-01-15");
  const reprendre = page.getByLabel(/Reprendre les commissions/);
  if ((await reprendre.count()) > 0) await reprendre.uncheck();
  await page.getByRole("button", { name: "Créer le mandat" }).click();
  await expect(page).toHaveURL(/\/admin\/bureau\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Mandat créé." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Activer ce mandat" })).toBeVisible();

  const postes = page.getByRole("group", { name: "Postes" });
  const ajouterPoste = postes.getByRole("button", { name: "Ajouter un poste" });
  await ajouterPoste.click();
  await postes.getByLabel("Membre", { exact: true }).selectOption({ label: `${MEMBRE} (masqué)` });
  await postes.getByLabel("Fonction").fill("Trésorier");

  // Le même membre à deux postes : erreur, saisie conservée.
  await ajouterPoste.click();
  await postes.getByLabel("Membre", { exact: true }).nth(1).selectOption({ label: `${MEMBRE} (masqué)` });
  await postes.getByLabel("Fonction").nth(1).fill("Secrétaire");
  await page.getByRole("button", { name: "Enregistrer le mandat" }).click();
  await expect(page.getByText("Un membre n'occupe qu'un poste par mandat.")).toBeVisible();
  await expect(postes.getByLabel("Fonction").nth(1)).toHaveValue("Secrétaire");
  await postes.getByRole("button", { name: "Postes : retirer l'élément 2" }).click();

  const commissions = page.getByRole("group", { name: "Commissions", exact: true });
  await commissions.getByRole("button", { name: "Ajouter une commission" }).click();
  await commissions.getByLabel("Nom de la commission").fill("E2E Commission");
  await commissions.getByLabel("Mission").fill("Mission de test.");
  const membresCommission = commissions.getByRole("group", { name: "Membres de la commission 1" });
  await membresCommission.getByRole("button", { name: "Ajouter un membre à la commission" }).click();
  await membresCommission.getByLabel("Membre", { exact: true }).selectOption({ label: `${MEMBRE} (masqué)` });

  await page.getByRole("button", { name: "Enregistrer le mandat" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Mandat enregistré." })).toBeVisible();
  await page.reload();
  await expect(postes.getByLabel("Fonction")).toHaveValue("Trésorier");
  await expect(commissions.getByLabel("Nom de la commission")).toHaveValue("E2E Commission");
  await expect(membresCommission.getByLabel("Membre", { exact: true })).toHaveValue(/[0-9a-f-]{36}/);

  // Le bureau public n'a pas changé.
  await page.goto("/bureau");
  expect(await page.locator("main").innerText()).toBe(bureauAvant);

  // Un membre d'un bureau ne se supprime pas.
  await page.goto(fiche);
  await page.getByRole("button", { name: "Supprimer le membre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByText(/fait partie d'un bureau/)).toBeVisible();

  // Suppression du mandat de test, puis du membre.
  await page.goto("/admin/bureau");
  await page.getByRole("link", { name: new RegExp(MANDAT) }).click();
  await page.getByRole("button", { name: "Supprimer le mandat" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/bureau$/);
  await expect(page.getByText(MANDAT)).toHaveCount(0);

  await page.goto(fiche);
  await page.getByRole("button", { name: "Supprimer le membre" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/membres$/);
});
```

Si un sélecteur ne trouve pas un élément alors que l'écran est correct (par exemple le nom accessible d'un `fieldset`), l'ajuster d'après le DOM réel, sans affaiblir la vérification ni cliquer sur « Activer ce mandat ».

- [ ] **Step 4: Lancer les tests e2e et vérifier la base**

Relever **avant** le lancement, avec un petit script `node --env-file=.env.local --import tsx -e …` qui utilise `src/db`, le libellé du mandat actif, le nombre de ses postes et de ses commissions, et le nombre de membres.

Run: `E2E_AUTORISE=1 npm run test:e2e`
Expected: tous les tests passent, anciens et nouveaux. Ensuite, avec le même script, vérifier qu'il reste 0 membre `e2e-%`, 0 mandat `E2E %` et 0 compte `@ademig.test`, et que le mandat actif, ses postes, ses commissions et le nombre de membres sont inchangés.

- [ ] **Step 5: Commit**

```bash
git add e2e
git commit -m "E2E : fiche masquée (erreur, aperçu, cookie seul, suppression) et mandat préparé sans toucher au bureau en place

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 13: Vérification finale du lot

- [ ] **Step 1: Suite complète**

Run: `npx eslint . && npx tsc --noEmit && npm test && npm run build && E2E_AUTORISE=1 npm run test:e2e`
Expected: tout passe. Dans le build, `/actualites/[slug]`, `/evenements/[slug]` et `/membres/[slug]` restent en SSG.

- [ ] **Step 2: Non-régression du site public**

Avec `npx next dev -p 3100`, ouvrir `/`, `/membres`, chaque `/membres/<slug>` et `/bureau` : le contenu, l'ordre des membres, les fonctions et la composition des commissions sont les mêmes qu'avant, sans bandeau d'aperçu ni erreur dans la console.

- [ ] **Step 3: Données de test**

Il ne reste aucun membre `e2e-%`, aucun mandat `E2E %`, ni aucun compte `@ademig.test`, et le mandat actif est le même qu'avant.

- [ ] **Step 4: Rapport**

Faire le point avec l'utilisateur. L'ouverture de la PR se décide avec lui (skill finishing-a-development-branch).
