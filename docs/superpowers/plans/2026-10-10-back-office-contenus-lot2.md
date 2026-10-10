# Back office ADEMIG — Sous-projet 2, lot 2 : événements et partenaires — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gérer les événements (comme les actualités : brouillon, publication, aperçu) et les partenaires (liste ordonnée, visibilité) depuis `/admin`. Au préalable, corriger l'accessibilité clavier des composants partagés, reportée à ce lot par la revue finale du lot 1.

**Architecture:** On réutilise la chaîne du lot 1 : schéma Zod (`src/lib/validation`) → Server Action (`src/lib/admin`, via `action()`) → opération pure testée sur PGlite (`src/db/operations`) → `revalidateTag`. Les règles de publication et de slug, aujourd'hui écrites dans `src/db/operations/actualites.ts`, passent dans `src/db/operations/commun.ts` pour servir aux deux contenus. L'aperçu Draft Mode s'étend au type `evenement`.

**Tech Stack:** Next.js 16.3 (App Router, Server Actions, Draft Mode), React 19.2, Drizzle 0.45 (Neon / PGlite), Zod 4, Tiptap 3, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-back-office-contenus-design.md` (sections 4.2, 4.5, 4.7, 5, 7, 8 : lot 2). Plan précédent : `docs/superpowers/plans/2026-10-10-back-office-contenus-lot1.md`, déjà livré et fusionné (PR #2).

## Global Constraints

- Lire avant de coder les guides Next 16 de `node_modules/next/dist/docs/` utiles à la tâche : draft-mode, forms, server-actions, how-revalidation-works (AGENTS.md : « This is NOT the Next.js you know »).
- Code, noms, commentaires et textes d'interface en français, comme le reste du dépôt ; densité de commentaires identique.
- Toute Server Action passe par `action("editeur", fn)` de `src/lib/admin/action.ts` et renvoie `Resultat<T>` ; une erreur de saisie ne lève jamais d'exception. Pages : `exigerSession()`.
- Tout HTML enregistré passe par `nettoyerHtml` (via `htmlRiche` dans le schéma Zod).
- Chaque écriture appelle `revalidateTag(tag, { expire: 0 })` : `TAGS.evenements` pour les événements, `TAGS.partenaires` pour les partenaires. Elle appelle aussi `revalidatePath` sur les pages admin concernées.
- Aucune migration de base : ne pas lancer `db:generate`.
- Pas de `cacheComponents` ni de `"use cache"`. Les pages publiques de détail restent SSG : la session n'est lue qu'en Draft Mode (`apercuAutorise()`).
- Formulaires : `useFormulaire` (soumission par `onSubmit`, sans perte de saisie), `noValidate` sur le `<form>`, contrôle de version `maj_le` via `memeVersion`.
- Admin : cibles d'au moins 44 px (`min-h-11`), focus visible, utilisable à 360 px, contraste AA, composants de `src/components/admin/ui.tsx` et `src/components/admin/champs/`.
- Dates des événements : saisie `datetime-local`, en heure de Dakar, qui est UTC+0 toute l'année.
- Base partagée avec la production. Les tests e2e :
  - ne publient aucun événement et ne rendent visible aucun partenaire, sauf si `E2E_BASE_DEDIEE=1` ;
  - donnent aux événements un slug qui commence par `e2e-`, et aux partenaires un nom qui commence par `E2E ` ;
  - suppriment tout ce qu'ils créent dans `e2e/nettoyage.ts` et au début de `e2e/preparation.ts`.
- Dev local sur le port 3100 : `npx next dev -p 3100`. E2E : `E2E_AUTORISE=1 npm run test:e2e`.
- Commits : messages en français, terminés par une ligne `Co-Authored-By:` au nom du modèle qui écrit le code, sur la branche `back-office-contenus-lot2`. Ne jamais pousser.

## Review Focus

- **Fin d'événement avant le début, ou date mal saisie** : refusée sur le champ `fin` ou `debut`, sans effacer la saisie. Une fin vide est acceptée (test Zod, tâche 3 ; e2e, tâche 10).
- **Décalage horaire** : `2026-09-12T09:00` saisi doit être relu `2026-09-12T09:00` dans le formulaire et rendu `09:00` sur le site. Aucune conversion de fuseau ne doit glisser d'une heure (tests de `dates.ts`, tâche 3).
- **Brouillon d'événement servi sans session** : le cookie de Draft Mode seul ne suffit pas, comme pour les actualités (e2e, tâche 10).
- **Ordre des partenaires abîmé** : déplacer le premier vers le haut ou le dernier vers le bas ne fait rien. Des valeurs d'`ordre` en double ou avec des trous sont renumérotées sans changer l'ordre relatif. Supprimer un partenaire ne casse pas les déplacements suivants (tests PGlite, tâche 8).
- **Focus clavier perdu** après ↑, ↓ ou Retirer, après « Modifier le lien », ou à la fermeture de la boîte de lien (tests de `cibleFocusApres` et e2e clavier, tâche 1).

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/admin/liste.ts` (modif., + test) | `cibleFocusApres()` |
| `src/components/admin/champs/use-focus-differe.ts` | focus d'un élément après le rendu suivant |
| `src/components/admin/champs/liste-editable.tsx` (modif.) | focus après déplacement ou retrait, libellés uniques, `idElement` passé à `rendu` |
| `src/components/admin/champs/champ-media.tsx` (modif.) | focus dans `GaleriePhotos` |
| `src/components/admin/selecteur-media.tsx` (modif.) | prop `idBouton` |
| `src/components/admin/champs/champ-slug.tsx` (modif.) | focus sur le champ après déverrouillage |
| `src/components/admin/champs/zone-tiptap.tsx` (modif.) | boîte de lien : Échap, retour du focus, effacement de l'erreur |
| `src/app/admin/(espace)/actualites/formulaire.tsx` (modif.) | utilise `idElement` |
| `src/db/operations/commun.ts` (modif., + test) | `publication()`, `exigerSlugModifiable()`, `verifierSlugLibre()` |
| `src/db/operations/actualites.ts` (modif.) | utilise les fonctions communes |
| `src/lib/validation/commun.ts` (modif.) | `listeVideos`, `listePhotos`, `idMediaFacultatif` |
| `src/lib/validation/actualites.ts` (modif.) | utilise ces briques |
| `src/lib/admin/dates.ts` (+ test) | `versDateLocale()`, `depuisDateLocale()` |
| `src/lib/validation/evenements.ts` (+ test) | `schemaEvenement`, `schemaEnvoiEvenement` |
| `src/db/operations/evenements.ts` (+ test) | créer, modifier, supprimer |
| `src/db/requetes/admin/evenements.ts` (+ test) | liste, fiche, suggestions de partenaires |
| `src/db/requetes/evenements.ts` (modif.) | option `{ brouillons }` |
| `src/db/requetes/admin/apercu.ts` (modif.) | type `evenement` |
| `src/app/api/apercu/route.ts` (modif.) | accepte `evenement` |
| `src/lib/content/evenements.ts` (modif.) | `getEvenementPourPage()` |
| `src/app/(site)/evenements/[slug]/page.tsx` (modif.) | lit `getEvenementPourPage` |
| `src/lib/admin/evenements.ts` (+ test) | Server Actions des événements |
| `src/app/admin/(espace)/evenements/…` | liste, nouveau, `[id]`, formulaire |
| `src/db/operations/media.ts` (modif., + test) | liens d'usage vers l'admin (événements, logos) |
| `src/lib/validation/partenaires.ts` (+ test) | `schemaPartenaire`, `schemaEnvoiPartenaire` |
| `src/db/operations/partenaires.ts` (+ test) | créer, modifier, supprimer, déplacer |
| `src/db/requetes/admin/partenaires.ts` (+ test) | liste, fiche |
| `src/lib/admin/partenaires.ts` (+ test) | Server Actions des partenaires |
| `src/app/admin/(espace)/partenaires/…` | liste ordonnée, nouveau, `[id]`, formulaire |
| `src/app/admin/(espace)/[rubrique]/page.tsx` (modif.) | retire `evenements` et `partenaires` |
| `e2e/accessibilite.spec.ts`, `e2e/evenements.spec.ts`, `e2e/partenaires.spec.ts`, `e2e/nettoyage.ts`, `e2e/preparation.ts` | parcours e2e et nettoyage |

---

### Task 1: Accessibilité clavier des composants partagés

**Files:**
- Modify: `src/lib/admin/liste.ts`, `src/lib/admin/liste.test.ts`
- Create: `src/components/admin/champs/use-focus-differe.ts`
- Modify: `src/components/admin/champs/liste-editable.tsx`, `src/components/admin/champs/champ-media.tsx`, `src/components/admin/selecteur-media.tsx`, `src/components/admin/champs/champ-slug.tsx`, `src/components/admin/champs/zone-tiptap.tsx`, `src/app/admin/(espace)/actualites/formulaire.tsx`
- Create: `e2e/accessibilite.spec.ts`

**Interfaces:**
- Produces:
  - `type CibleFocus = { index: number; bouton: "haut" | "bas" | "retirer" } | "ajout"` ; `cibleFocusApres(action: "monter" | "descendre" | "retirer", index: number, longueur: number): CibleFocus`. `index` est la position dans la liste **après** l'action, et `longueur` la longueur **avant**.
  - `useFocusDiffere(dependance: unknown): (id: string) => void` : mémorise un id d'élément DOM et lui donne le focus après le prochain rendu où `dependance` a changé.
  - `ListeEditable` : `rendu: (element: T, modifier: (patch: Partial<T>) => void, index: number, idElement: string) => ReactNode`. Les boutons ont les ids `${idElement}-haut`, `-bas` et `-retirer`, le bouton d'ajout `${id}-ajout`, et leurs `aria-label` incluent le libellé de la liste (« Sources : monter l'élément 1 »).
  - `SelecteurMedia` : prop facultative `idBouton?: string`, posée sur le bouton d'ouverture.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à `src/lib/admin/liste.test.ts` (import de `cibleFocusApres` ajouté) :

```ts
describe("cibleFocusApres", () => {
  it("suit l'élément monté, sur ↓ s'il arrive en tête", () => {
    expect(cibleFocusApres("monter", 2, 3)).toEqual({ index: 1, bouton: "haut" });
    expect(cibleFocusApres("monter", 1, 3)).toEqual({ index: 0, bouton: "bas" });
  });
  it("suit l'élément descendu, sur ↑ s'il arrive en dernier", () => {
    expect(cibleFocusApres("descendre", 0, 3)).toEqual({ index: 1, bouton: "bas" });
    expect(cibleFocusApres("descendre", 1, 3)).toEqual({ index: 2, bouton: "haut" });
  });
  it("après un retrait, va au « Retirer » suivant, sinon au précédent, sinon à l'ajout", () => {
    expect(cibleFocusApres("retirer", 0, 3)).toEqual({ index: 0, bouton: "retirer" });
    expect(cibleFocusApres("retirer", 2, 3)).toEqual({ index: 1, bouton: "retirer" });
    expect(cibleFocusApres("retirer", 0, 1)).toBe("ajout");
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/admin/liste.test.ts`
Expected: FAIL (`cibleFocusApres` n'existe pas).

- [ ] **Step 3: Implémenter la fonction et le hook**

Ajouter à `src/lib/admin/liste.ts` :

```ts
export type CibleFocus = { index: number; bouton: "haut" | "bas" | "retirer" } | "ajout";

// Où remettre le focus clavier après une action : jamais sur un bouton disparu ou désactivé.
export function cibleFocusApres(action: "monter" | "descendre" | "retirer", index: number, longueur: number): CibleFocus {
  if (action === "monter") return { index: index - 1, bouton: index - 1 === 0 ? "bas" : "haut" };
  if (action === "descendre") return { index: index + 1, bouton: index + 1 === longueur - 1 ? "haut" : "bas" };
  if (longueur === 1) return "ajout";
  return { index: Math.min(index, longueur - 2), bouton: "retirer" };
}
```

`src/components/admin/champs/use-focus-differe.ts` :

```ts
"use client";

import { useEffect, useRef } from "react";

// Donne le focus à un élément après le rendu qui suit une mise à jour de `dependance`.
export function useFocusDiffere(dependance: unknown): (id: string) => void {
  const cible = useRef<string | null>(null);
  useEffect(() => {
    if (cible.current) {
      document.getElementById(cible.current)?.focus();
      cible.current = null;
    }
  }, [dependance]);
  return (id: string) => {
    cible.current = id;
  };
}
```

- [ ] **Step 4: `ListeEditable`**

Dans `src/components/admin/champs/liste-editable.tsx` :
- ajouter le 4ᵉ paramètre `idElement: string` au type de `rendu`, et l'appeler avec `rendu(e.valeur, modifier(i), i, \`${id}-${e.cle}\`)` ;
- `const focaliser = useFocusDiffere(elements);`
- remplacer les trois `onClick` par une fonction `agir` :

```tsx
function agir(action: "monter" | "descendre" | "retirer", i: number) {
  const suivante = action === "retirer" ? retirer(elements, i) : deplacer(elements, i, action === "monter" ? -1 : 1);
  const cible = cibleFocusApres(action, i, elements.length);
  focaliser(cible === "ajout" ? `${id}-ajout` : `${id}-${suivante[cible.index].cle}-${cible.bouton}`);
  setElements(suivante);
}
```

- ids et libellés des boutons : `id={\`${id}-${e.cle}-haut\`}` (puis `-bas`, `-retirer`), avec `aria-label={\`${libelle} : monter l'élément ${i + 1}\`}`, puis « descendre », « retirer » ;
- bouton d'ajout : `id={\`${id}-ajout\`}`.

Dans `src/app/admin/(espace)/actualites/formulaire.tsx`, les deux `rendu` prennent `(s, modifier, i, idElement)` et utilisent `id={\`${idElement}-label\`}`, `name={\`${idElement}-label\`}` (puis `-url`, `-id`, `-titre`) à la place des ids construits avec `i`.

- [ ] **Step 5: `GaleriePhotos`, `SelecteurMedia` et `ChampSlug`**

- `SelecteurMedia` : ajouter la prop `idBouton?: string` et la poser en `id` sur le bouton d'ouverture.
- `GaleriePhotos` :
  - `const id = useId()` existe déjà, et `const focaliser = useFocusDiffere(photos);` s'ajoute ;
  - boutons : `id={\`${id}-${p.id}-haut\`}` (puis `-bas`, `-retirer`), avec `aria-label={\`${libelle} : monter la photo ${i + 1}\`}` (et ainsi de suite) ;
  - le sélecteur reçoit `idBouton={\`${id}-ajout\`}` ;
  - même fonction `agir` qu'à l'étape 4, la clé étant `p.id`.
- `ChampSlug` : `const champ = useRef<HTMLInputElement>(null);`, passer `ref={champ}` à `Champ`, qui transmet les props à son `<input>`. Le bouton « Modifier le lien » fait `setDeverrouille(true); champ.current?.focus();`.

- [ ] **Step 6: Boîte de lien de l'éditeur**

Dans `src/components/admin/champs/zone-tiptap.tsx` :
- `const boutonLien = useRef<HTMLButtonElement>(null);` posé sur le bouton « Lien » ;
- ajouter la fonction suivante, et l'utiliser pour « Fermer » et pour la touche `Escape` dans le champ (`e.preventDefault()`, pour ne pas fermer d'autre dialogue) :

```tsx
function fermerLien() {
  setLien(null);
  setErreurLien("");
  boutonLien.current?.focus();
}
```

- `onChange` du champ d'adresse : `setLien(e.target.value); setErreurLien("");` ;
- l'adresse devient `type="text"` avec `inputMode="url"` : la validation se fait déjà par `PROTOCOLES`, et le champ ne bloque plus la soumission du formulaire hôte.

- [ ] **Step 7: Écrire le test e2e clavier**

`e2e/accessibilite.spec.ts` (aucune écriture en base : rien n'est enregistré) :

```ts
import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

test("le focus clavier suit les éléments déplacés ou retirés", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/actualites/nouveau");
  const ajouter = page.getByRole("button", { name: "Ajouter une source" });
  await ajouter.click();
  await ajouter.click();

  await page.getByRole("button", { name: "Sources : descendre l'élément 1" }).click();
  await expect(page.getByRole("button", { name: "Sources : monter l'élément 2" })).toBeFocused();

  await page.getByRole("button", { name: "Sources : retirer l'élément 2" }).click();
  await expect(page.getByRole("button", { name: "Sources : retirer l'élément 1" })).toBeFocused();
  await page.getByRole("button", { name: "Sources : retirer l'élément 1" }).click();
  await expect(ajouter).toBeFocused();
});

test("la boîte de lien se ferme avec Échap et rend le focus", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/actualites/nouveau");
  await page.getByRole("textbox", { name: "Texte" }).click();
  const lien = page.getByRole("button", { name: "Lien" });
  await lien.click();
  await page.getByLabel("Adresse du lien").fill("pas-une-adresse");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "L'adresse doit commencer" })).toBeVisible();
  await page.getByLabel("Adresse du lien").press("Escape");
  await expect(page.getByLabel("Adresse du lien")).toHaveCount(0);
  await expect(lien).toBeFocused();
  await lien.click();
  await expect(page.getByRole("alert").filter({ hasText: "L'adresse doit commencer" })).toHaveCount(0);
});
```

- [ ] **Step 8: Vérifier**

Run: `npx vitest run src/lib/admin/liste.test.ts && npx tsc --noEmit && npx eslint src/components/admin src/app/admin && E2E_AUTORISE=1 npm run test:e2e`
Expected: tout passe, y compris les tests e2e existants des actualités.

- [ ] **Step 9: Commit**

```bash
git add src/lib/admin/liste.ts src/lib/admin/liste.test.ts src/components/admin "src/app/admin/(espace)/actualites/formulaire.tsx" e2e/accessibilite.spec.ts
git commit -m "Accessibilité clavier : focus après déplacement, retrait et déverrouillage ; boîte de lien fermable avec Échap

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 2: Règles communes de publication et briques de validation partagées

**Files:**
- Modify: `src/db/operations/commun.ts`
- Create: `src/db/operations/commun.test.ts`
- Modify: `src/db/operations/actualites.ts`
- Modify: `src/lib/validation/commun.ts`, `src/lib/validation/actualites.ts`

**Interfaces:**
- Produces, dans `src/db/operations/commun.ts` :
  - `type Statut = "brouillon" | "publie"`
  - `publication(intention: Intention, actuel: { statut: Statut; publieLe: Date | null } | null): { statut: Statut; publieLe: Date | null }`. `actuel` vaut `null` à la création.
  - `exigerSlugModifiable(actuel: { slug: string; publieLe: Date | null }, slug: string, modifierSlug: boolean, message: string): boolean`. Elle lève `ErreurMetier(message, "slug")` si le contenu a déjà été publié et que le slug change sans déverrouillage. Elle renvoie `true` si le slug change, ce qui signale qu'il faut vérifier qu'il est libre.
  - `verifierSlugLibre(tx: Tx, colonnes: { table: PgTable; id: AnyPgColumn; slug: AnyPgColumn }, slug: string, message: string, saufId?: string): Promise<void>`
- Produces, dans `src/lib/validation/commun.ts` : `listeVideos`, `listePhotos` (les schémas JSON utilisés par les actualités) et `idMediaFacultatif`. Ce dernier transforme `""` ou une valeur absente en `null`, et refuse tout ce qui n'est pas un uuid.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/db/operations/commun.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { ErreurMetier } from "./erreurs";
import { exigerSlugModifiable, publication } from "./commun";

const hier = new Date("2026-01-01T00:00:00.000Z");

describe("publication", () => {
  it("crée en brouillon ou publie d'un coup", () => {
    expect(publication("enregistrer", null)).toEqual({ statut: "brouillon", publieLe: null });
    const r = publication("publier", null);
    expect(r.statut).toBe("publie");
    expect(r.publieLe).toBeInstanceOf(Date);
  });
  it("garde la première date de publication", () => {
    expect(publication("depublier", { statut: "publie", publieLe: hier })).toEqual({ statut: "brouillon", publieLe: hier });
    expect(publication("publier", { statut: "brouillon", publieLe: hier })).toEqual({ statut: "publie", publieLe: hier });
    expect(publication("enregistrer", { statut: "publie", publieLe: hier })).toEqual({ statut: "publie", publieLe: hier });
  });
});

describe("exigerSlugModifiable", () => {
  it("laisse changer le lien d'un contenu jamais publié", () => {
    expect(exigerSlugModifiable({ slug: "a", publieLe: null }, "b", false, "x")).toBe(true);
    expect(exigerSlugModifiable({ slug: "a", publieLe: null }, "a", false, "x")).toBe(false);
  });
  it("exige le déverrouillage après une publication", () => {
    expect(() => exigerSlugModifiable({ slug: "a", publieLe: hier }, "b", false, "Verrouillé.")).toThrow(ErreurMetier);
    expect(exigerSlugModifiable({ slug: "a", publieLe: hier }, "b", true, "x")).toBe(true);
  });
});
```

Ajouter à `src/lib/validation/commun.test.ts` :

```ts
describe("idMediaFacultatif", () => {
  it("vaut null quand rien n'est choisi", () => {
    expect(idMediaFacultatif.parse("")).toBeNull();
    expect(idMediaFacultatif.parse(undefined)).toBeNull();
  });
  it("garde un uuid et refuse le reste", () => {
    const id = crypto.randomUUID();
    expect(idMediaFacultatif.parse(id)).toBe(id);
    expect(idMediaFacultatif.safeParse("pas-un-uuid").success).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/db/operations/commun.test.ts src/lib/validation/commun.test.ts`
Expected: FAIL (exports manquants).

- [ ] **Step 3: Implémenter**

Ajouter à `src/db/operations/commun.ts` :

```ts
import { and, eq, ne } from "drizzle-orm";
import type { AnyPgColumn, PgTable } from "drizzle-orm/pg-core";
import type { Tx } from "@/db/types";
import { ErreurMetier } from "./erreurs";

export type Statut = "brouillon" | "publie";

// Publier fixe la date de première publication ; dépublier la garde (le lien a pu être partagé).
export function publication(
  intention: Intention,
  actuel: { statut: Statut; publieLe: Date | null } | null,
): { statut: Statut; publieLe: Date | null } {
  const statut = intention === "publier" ? "publie" : intention === "depublier" ? "brouillon" : (actuel?.statut ?? "brouillon");
  return { statut, publieLe: actuel?.publieLe ?? (statut === "publie" ? new Date() : null) };
}

// Un lien déjà publié ne change que sur demande explicite. Renvoie vrai si le lien change.
export function exigerSlugModifiable(
  actuel: { slug: string; publieLe: Date | null },
  slug: string,
  modifierSlug: boolean,
  message: string,
): boolean {
  if (slug === actuel.slug) return false;
  if (actuel.publieLe && !modifierSlug) throw new ErreurMetier(message, "slug");
  return true;
}

export async function verifierSlugLibre(
  tx: Tx,
  colonnes: { table: PgTable; id: AnyPgColumn; slug: AnyPgColumn },
  slug: string,
  message: string,
  saufId?: string,
) {
  const memeSlug = eq(colonnes.slug, slug);
  const [autre] = await tx
    .select({ id: colonnes.id })
    .from(colonnes.table)
    .where(saufId ? and(memeSlug, ne(colonnes.id, saufId)) : memeSlug)
    .limit(1);
  if (autre) throw new ErreurMetier(message, "slug");
}
```

Si TypeScript refuse `.from(colonnes.table)` avec `PgTable`, typer le paramètre `table` avec l'union des tables concernées (`typeof actualites | typeof evenements`), en gardant la même logique.

Dans `src/db/operations/actualites.ts`, remplacer :
- la fonction locale `verifierSlugLibre` par l'appel `verifierSlugLibre(tx, { table: actualites, id: actualites.id, slug: actualites.slug }, d.slug, "Ce lien est déjà utilisé par une autre actualité.", saufId)` ;
- les calculs de `statut` et `publieLe` par `publication(intention, null)` (création) et `publication(o.intention, actuelle)` (modification) ;
- le bloc de verrouillage par `if (exigerSlugModifiable(actuelle, d.slug, o.modifierSlug, "Cette actualité a déjà été publiée : cliquez sur « Modifier le lien » pour changer son adresse.")) await verifierSlugLibre(…, id);`.

Les messages restent identiques, et les tests existants doivent passer sans modification.

Dans `src/lib/validation/commun.ts`, déplacer depuis `actualites.ts` les schémas `video` et `photos`, et ajouter `idMediaFacultatif` :

```ts
const video = z.object({ id: idYoutube, titre: z.string().trim().min(1, "Donnez un titre à chaque vidéo.") });
export const listeVideos = champJson(z.array(video).max(10, "10 vidéos au plus."));

export const listePhotos = champJson(
  z
    .array(z.uuid())
    .max(30, "30 photos au plus.")
    .refine((ids) => new Set(ids).size === ids.length, "Une photo figure deux fois."),
);

// Champ caché d'une image unique (affiche, logo, portrait) : vide quand aucune n'est choisie.
export const idMediaFacultatif = z
  .string()
  .optional()
  .transform((v) => v || null)
  .pipe(z.uuid({ error: "Image inattendue : choisissez-la de nouveau." }).nullable());
```

`src/lib/validation/actualites.ts` utilise ensuite `videos: listeVideos` et `photos: listePhotos`.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npm test && npx tsc --noEmit && npx eslint src/db src/lib`
Expected: PASS, y compris tous les tests existants des actualités, non modifiés.

- [ ] **Step 5: Commit**

```bash
git add src/db/operations src/lib/validation
git commit -m "Règles de publication et de lien communes ; briques de validation partagées (vidéos, photos, image facultative)

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 3: Dates des événements et schéma de validation

**Files:**
- Create: `src/lib/admin/dates.ts`, `src/lib/admin/dates.test.ts`
- Create: `src/lib/validation/evenements.ts`, `src/lib/validation/evenements.test.ts`

**Interfaces:**
- Consumes: `champJson`, `champSlug`, `htmlRiche`, `intention`, `caseACocher`, `listeVideos`, `listePhotos`, `idMediaFacultatif` (tâche 2).
- Produces:
  - `versDateLocale(date: Date): string` (`"2026-09-12T09:00"`) ; `depuisDateLocale(valeur: string): Date | null`
  - `schemaEvenement` : sa sortie est exactement `DonneesEvenement` (tâche 4) :
    `{ titre: string; slug: string; debut: Date; fin: Date | null; lieuNom: string; lieuVille: string; theme: string | null; resume: string; corps: string; partenaires: string[]; videos: Video[]; afficheId: string | null; photos: string[] }`
  - `schemaEnvoiEvenement` : la même chose, plus `intention`, `modifierSlug` et `version` (`z.iso.datetime().optional()`). La règle « fin après début » s'applique aux deux.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/admin/dates.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { depuisDateLocale, versDateLocale } from "./dates";

describe("dates des événements (Dakar, UTC+0)", () => {
  it("fait l'aller-retour sans glisser d'une heure", () => {
    const d = depuisDateLocale("2026-09-12T09:00")!;
    expect(d.toISOString()).toBe("2026-09-12T09:00:00.000Z");
    expect(versDateLocale(d)).toBe("2026-09-12T09:00");
  });
  it.each(["", "2026-09-12", "12/09/2026 09:00", "2026-13-40T25:00"])("refuse « %s »", (v) => {
    expect(depuisDateLocale(v)).toBeNull();
  });
});
```

`src/lib/validation/evenements.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { evenements as evenementsInitiaux } from "@/db/donnees-initiales/evenements";
import { versDateLocale } from "@/lib/admin/dates";
import { paragraphesEnHtml } from "@/lib/html";
import { schemaEnvoiEvenement, schemaEvenement } from "./evenements";

const valide = {
  titre: "Journée du contenu local",
  slug: "journee-contenu-local",
  debut: "2026-09-12T09:00",
  fin: "",
  lieuNom: "Hôtel Pullman Teranga",
  lieuVille: "Dakar",
  theme: "",
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  partenaires: '[{"nom":"CORICA"},{"nom":" MODEC "}]',
  videos: "[]",
  afficheId: "",
  photos: "[]",
};

describe("schemaEvenement", () => {
  it("lit un formulaire complet", () => {
    expect(schemaEvenement.parse(valide)).toEqual({
      titre: "Journée du contenu local",
      slug: "journee-contenu-local",
      debut: new Date("2026-09-12T09:00:00.000Z"),
      fin: null,
      lieuNom: "Hôtel Pullman Teranga",
      lieuVille: "Dakar",
      theme: null,
      resume: "Résumé.",
      corps: "<p>Texte.</p>",
      partenaires: ["CORICA", "MODEC"],
      videos: [],
      afficheId: null,
      photos: [],
    });
  });

  it("accepte les événements actuels du site", () => {
    for (const e of evenementsInitiaux) {
      const r = schemaEvenement.safeParse({
        titre: e.titre,
        slug: e.slug,
        debut: versDateLocale(new Date(e.debut)),
        fin: e.fin ? versDateLocale(new Date(e.fin)) : "",
        lieuNom: e.lieu.nom,
        lieuVille: e.lieu.ville,
        theme: e.theme ?? "",
        resume: e.resume,
        corps: paragraphesEnHtml(e.corps),
        partenaires: JSON.stringify((e.partenaires ?? []).map((nom) => ({ nom }))),
        videos: JSON.stringify(e.videos ?? []),
        afficheId: "",
        photos: "[]",
      });
      expect(r.success, `${e.slug} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("refuse une fin avant le début, sur le champ fin", () => {
    const r = schemaEvenement.safeParse({ ...valide, fin: "2026-09-12T08:00" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]).toMatchObject({ path: ["fin"], message: "La fin doit être après le début." });
  });

  it.each([
    ["debut", { debut: "" }],
    ["fin", { fin: "demain" }],
    ["lieuNom", { lieuNom: " " }],
    ["lieuVille", { lieuVille: "" }],
    ["corps", { corps: "<p></p>" }],
    ["partenaires", { partenaires: '[{"nom":""}]' }],
    ["afficheId", { afficheId: "pas-un-uuid" }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaEvenement.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });

  it("refuse un partenaire cité deux fois", () => {
    expect(schemaEvenement.safeParse({ ...valide, partenaires: '[{"nom":"CORICA"},{"nom":"corica"}]' }).success).toBe(false);
  });
});

describe("schemaEnvoiEvenement", () => {
  it("ajoute intention, déverrouillage et version, et garde la règle de fin", () => {
    expect(schemaEnvoiEvenement.parse({ ...valide, intention: "publier", version: "2026-10-10T10:00:00.000Z" })).toMatchObject({
      intention: "publier",
      modifierSlug: false,
      version: "2026-10-10T10:00:00.000Z",
    });
    expect(schemaEnvoiEvenement.safeParse({ ...valide, fin: "2026-09-11T09:00" }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/dates.test.ts src/lib/validation/evenements.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Implémenter**

`src/lib/admin/dates.ts` :

```ts
// Dakar est à UTC+0 toute l'année : l'heure saisie dans `datetime-local` est l'heure UTC.
const FORMAT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function versDateLocale(date: Date): string {
  return date.toISOString().slice(0, 16);
}

export function depuisDateLocale(valeur: string): Date | null {
  if (!FORMAT.test(valeur)) return null;
  const date = new Date(`${valeur}:00.000Z`);
  // Refuse les dates impossibles (13e mois, 25 h) que Date corrigerait silencieusement.
  return Number.isNaN(date.getTime()) || versDateLocale(date) !== valeur ? null : date;
}
```

`src/lib/validation/evenements.ts` :

```ts
import { z } from "zod";
import { depuisDateLocale } from "@/lib/admin/dates";
import { caseACocher, champJson, champSlug, htmlRiche, idMediaFacultatif, intention, listePhotos, listeVideos } from "./commun";

function dateHeure(message: string) {
  return z.string().transform((v, ctx) => {
    const date = depuisDateLocale(v.trim());
    if (!date) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return date;
  });
}

const texteFacultatif = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au plus.`)
    .optional()
    .transform((v) => v || null);

const partenaires = champJson(
  z
    .array(z.object({ nom: z.string().trim().min(1, "Nommez chaque partenaire.").max(120, "120 caractères au plus.") }))
    .max(30, "30 partenaires au plus.")
    .refine((l) => new Set(l.map((p) => p.nom.toLowerCase())).size === l.length, "Un partenaire figure deux fois."),
).transform((l) => l.map((p) => p.nom));

const champs = z.object({
  titre: z.string().trim().min(1, "Indiquez un titre.").max(200, "200 caractères au plus."),
  slug: champSlug,
  debut: dateHeure("Indiquez la date et l'heure de début."),
  fin: z
    .string()
    .optional()
    .transform((v) => v?.trim() || "")
    .pipe(z.union([z.literal("").transform(() => null), dateHeure("Date de fin invalide.")])),
  lieuNom: z.string().trim().min(1, "Indiquez le lieu.").max(200, "200 caractères au plus."),
  lieuVille: z.string().trim().min(1, "Indiquez la ville.").max(100, "100 caractères au plus."),
  theme: texteFacultatif(300),
  resume: z.string().trim().min(1, "Écrivez un résumé.").max(600, "600 caractères au plus."),
  corps: htmlRiche("Écrivez la présentation de l'événement."),
  partenaires,
  videos: listeVideos,
  afficheId: idMediaFacultatif,
  photos: listePhotos,
});

const finApresDebut = (e: { debut: Date; fin: Date | null }, ctx: z.RefinementCtx) => {
  if (e.fin && e.fin <= e.debut) ctx.addIssue({ code: "custom", path: ["fin"], message: "La fin doit être après le début." });
};

export const schemaEvenement = champs.superRefine(finApresDebut);

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiEvenement = champs
  .extend({ intention, modifierSlug: caseACocher, version: z.iso.datetime().optional() })
  .superRefine(finApresDebut);
```

Si `z.union([... .transform(...), ...])` dans un `pipe` ne compile pas avec la version installée de Zod 4, écrire `fin` comme `z.string().optional().transform((v, ctx) => …)` : une chaîne vide donne `null`, et une date invalide ajoute « Date de fin invalide. ». Le comportement doit rester le même.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/admin/dates.test.ts src/lib/validation/evenements.test.ts && npx tsc --noEmit`
Expected: PASS. Si un événement initial échoue sur une longueur, relever la limite concernée plutôt que de modifier les données.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/dates.ts src/lib/admin/dates.test.ts src/lib/validation/evenements.ts src/lib/validation/evenements.test.ts
git commit -m "Dates des événements en heure de Dakar et schéma de validation des événements

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 4: Opérations d'écriture des événements

**Files:**
- Create: `src/db/operations/evenements.ts`, `src/db/operations/evenements.test.ts`

**Interfaces:**
- Consumes: `publication`, `exigerSlugModifiable`, `verifierSlugLibre`, `memeVersion`, `CONFLIT`, `Intention` (tâche 2 et lot 1), `creerMedia`.
- Produces:
  - `type DonneesEvenement` (voir tâche 3)
  - `creerEvenement(db: Db, d: DonneesEvenement, intention: Intention): Promise<{ id: string }>`
  - `modifierEvenement(db: Db, id: string, d: DonneesEvenement, o: { version: string; intention: Intention; modifierSlug: boolean }): Promise<{ version: string }>`
  - `supprimerEvenement(db: Db, id: string): Promise<void>`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/db/operations/evenements.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { evenementPhotos, evenements } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { CONFLIT } from "./commun";
import { ErreurMetier } from "./erreurs";
import { creerEvenement, type DonneesEvenement, modifierEvenement, supprimerEvenement } from "./evenements";
import { creerMedia } from "./media";

const base: DonneesEvenement = {
  titre: "Journée du contenu local",
  slug: "journee-contenu-local",
  debut: new Date("2026-09-12T09:00:00.000Z"),
  fin: null,
  lieuNom: "Hôtel Pullman Teranga",
  lieuVille: "Dakar",
  theme: null,
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  partenaires: ["CORICA"],
  videos: [],
  afficheId: null,
  photos: [],
};

async function image(db: Db, n: number) {
  const m = await creerMedia(
    db,
    { url: `/images/ev-${n}.webp`, pathname: null, alt: `Image ${n}`, credit: null, width: 10, height: 10, mime: "image/webp", taille: null },
    null,
  );
  return m.id;
}

const lire = async (db: Db, id: string) => (await db.query.evenements.findFirst({ where: eq(evenements.id, id) }))!;
const version = async (db: Db, id: string) => (await lire(db, id)).majLe.toISOString();

describe("événements", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("crée un brouillon avec son affiche et ses partenaires", async () => {
    const affiche = await image(db, 1);
    const { id } = await creerEvenement(db, { ...base, afficheId: affiche }, "enregistrer");
    expect(await lire(db, id)).toMatchObject({ statut: "brouillon", publieLe: null, afficheId: affiche, partenaires: ["CORICA"] });
  });

  it("refuse un lien déjà pris, sur le champ slug", async () => {
    await creerEvenement(db, base, "enregistrer");
    const erreur = await creerEvenement(db, { ...base, titre: "Autre" }, "enregistrer").catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("slug");
  });

  it("publie, dépublie et garde la date de première publication", async () => {
    const { id } = await creerEvenement(db, base, "publier");
    const premiere = (await lire(db, id)).publieLe;
    await modifierEvenement(db, id, base, { version: await version(db, id), intention: "depublier", modifierSlug: false });
    expect(await lire(db, id)).toMatchObject({ statut: "brouillon", publieLe: premiere });
  });

  it("refuse une version périmée sans rien écrire, photos comprises", async () => {
    const photo = await image(db, 2);
    const { id } = await creerEvenement(db, base, "enregistrer");
    const v = await version(db, id);
    await modifierEvenement(db, id, { ...base, titre: "Premier" }, { version: v, intention: "enregistrer", modifierSlug: false });
    const erreur = await modifierEvenement(db, id, { ...base, titre: "Second", photos: [photo] }, { version: v, intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur.message).toBe(CONFLIT);
    expect((await lire(db, id)).titre).toBe("Premier");
    expect(await db.select().from(evenementPhotos).where(eq(evenementPhotos.evenementId, id))).toHaveLength(0);
  });

  it("verrouille le lien d'un événement publié", async () => {
    const { id } = await creerEvenement(db, base, "publier");
    const v = await version(db, id);
    const erreur = await modifierEvenement(db, id, { ...base, slug: "autre" }, { version: v, intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur.champ).toBe("slug");
    await modifierEvenement(db, id, { ...base, slug: "autre" }, { version: v, intention: "enregistrer", modifierSlug: true });
    expect((await lire(db, id)).slug).toBe("autre");
  });

  it("réécrit les photos dans l'ordre et enregistre la fin", async () => {
    const [a, b] = [await image(db, 3), await image(db, 4)];
    const { id } = await creerEvenement(db, { ...base, photos: [a, b] }, "enregistrer");
    const fin = new Date("2026-09-12T18:00:00.000Z");
    await modifierEvenement(db, id, { ...base, fin, photos: [b, a] }, { version: await version(db, id), intention: "enregistrer", modifierSlug: false });
    const photos = await db.select().from(evenementPhotos).where(eq(evenementPhotos.evenementId, id)).orderBy(evenementPhotos.ordre);
    expect(photos.map((p) => p.mediaId)).toEqual([b, a]);
    expect((await lire(db, id)).fin).toEqual(fin);
  });

  it("supprime l'événement et ses liaisons, pas les images", async () => {
    const affiche = await image(db, 5);
    const { id } = await creerEvenement(db, { ...base, afficheId: affiche, photos: [affiche] }, "enregistrer");
    await supprimerEvenement(db, id);
    expect(await db.select().from(evenementPhotos).where(eq(evenementPhotos.evenementId, id))).toHaveLength(0);
    expect(await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, affiche) })).toBeDefined();
    await expect(supprimerEvenement(db, id)).rejects.toThrow("Événement introuvable.");
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/db/operations/evenements.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/db/operations/evenements.ts` :

```ts
import { and, eq } from "drizzle-orm";
import { evenementPhotos, evenements } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import type { Video } from "@/lib/content/types";
import { CONFLIT, exigerSlugModifiable, type Intention, memeVersion, publication, verifierSlugLibre } from "./commun";
import { ErreurMetier } from "./erreurs";

export type DonneesEvenement = {
  titre: string;
  slug: string;
  debut: Date;
  fin: Date | null;
  lieuNom: string;
  lieuVille: string;
  theme: string | null;
  resume: string;
  corps: string;
  // Noms libres : un partenaire d'un événement peut ne pas figurer dans la table `partenaires`.
  partenaires: string[];
  videos: Video[];
  afficheId: string | null;
  // Identifiants des médias, dans l'ordre d'affichage.
  photos: string[];
};

const INTROUVABLE = "Événement introuvable.";
const SLUG_PRIS = "Ce lien est déjà utilisé par un autre événement.";
const colonnesSlug = { table: evenements, id: evenements.id, slug: evenements.slug };

async function remplacerPhotos(tx: Tx, evenementId: string, photos: string[]) {
  await tx.delete(evenementPhotos).where(eq(evenementPhotos.evenementId, evenementId));
  if (photos.length > 0) {
    await tx.insert(evenementPhotos).values(photos.map((mediaId, ordre) => ({ evenementId, mediaId, ordre })));
  }
}

export async function creerEvenement(db: Db, d: DonneesEvenement, intention: Intention): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS);
    const { photos, ...champs } = d;
    const [ligne] = await tx
      .insert(evenements)
      .values({ ...champs, ...publication(intention, null) })
      .returning({ id: evenements.id });
    await remplacerPhotos(tx, ligne.id, photos);
    return ligne;
  });
}

export async function modifierEvenement(
  db: Db,
  id: string,
  d: DonneesEvenement,
  o: { version: string; intention: Intention; modifierSlug: boolean },
): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuel = await tx.query.evenements.findFirst({
      where: eq(evenements.id, id),
      columns: { slug: true, statut: true, publieLe: true },
    });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    const message = "Cet événement a déjà été publié : cliquez sur « Modifier le lien » pour changer son adresse.";
    if (exigerSlugModifiable(actuel, d.slug, o.modifierSlug, message)) {
      await verifierSlugLibre(tx, colonnesSlug, d.slug, SLUG_PRIS, id);
    }
    const { photos, ...champs } = d;
    const [maj] = await tx
      .update(evenements)
      .set({ ...champs, ...publication(o.intention, actuel) })
      .where(and(eq(evenements.id, id), memeVersion(evenements.majLe, o.version)))
      .returning({ majLe: evenements.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    await remplacerPhotos(tx, id, photos);
    return { version: maj.majLe.toISOString() };
  });
}

export async function supprimerEvenement(db: Db, id: string): Promise<void> {
  // Les liaisons photos partent en cascade ; l'affiche et les photos restent dans la médiathèque.
  const lignes = await db.delete(evenements).where(eq(evenements.id, id)).returning({ id: evenements.id });
  if (lignes.length === 0) throw new ErreurMetier(INTROUVABLE);
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/db/operations && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/operations/evenements.ts src/db/operations/evenements.test.ts
git commit -m "Opérations des événements : publication, lien verrouillé, contrôle de version, photos ordonnées

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 5: Lectures de l'admin et aperçu des événements

**Files:**
- Create: `src/db/requetes/admin/evenements.ts`, `src/db/requetes/admin/evenements.test.ts`
- Modify: `src/db/requetes/evenements.ts` (option `brouillons`)
- Modify: `src/db/requetes/admin/apercu.ts`, `src/app/api/apercu/route.ts`
- Modify: `src/lib/content/evenements.ts`, `src/app/(site)/evenements/[slug]/page.tsx`

**Interfaces:**
- Consumes: `creerEvenement` (tâche 4), `MediaChoisi`, `versMediaChoisi`, `motifRecherche`, `PAR_PAGE`, `Filtre`, `versDateLocale`, `apercuAutorise`.
- Produces:
  - `type LigneEvenementAdmin = { id: string; titre: string; slug: string; debut: string; lieuVille: string; statut: "brouillon" | "publie" }` (`debut` en ISO)
  - `listerEvenementsAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneEvenementAdmin[]; total: number }>` : trié par début décroissant, recherche sur le titre
  - `type EvenementAdmin = { id; titre; slug; debut: string /* datetime-local */; fin: string /* "" si aucune */; lieuNom; lieuVille; theme: string; resume; corps; partenaires: string[]; videos: Video[]; affiche: MediaChoisi | null; photos: MediaChoisi[]; statut; dejaPublie: boolean; version: string }`
  - `lireEvenementAdmin(db: Db, id: string): Promise<EvenementAdmin | undefined>`
  - `suggestionsPartenaires(db: Db): Promise<string[]>` : les noms de tous les partenaires, par ordre
  - `trouverEvenement(db, slug, o?: { brouillons?: boolean })`
  - `TypeApercu = "actualite" | "evenement"`, avec `cheminApercu` renvoyant `/evenements/<slug>`
  - `getEvenementPourPage(slug: string): Promise<Evenement | undefined>`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/db/requetes/admin/evenements.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { creerEvenement, type DonneesEvenement } from "@/db/operations/evenements";
import { creerMedia } from "@/db/operations/media";
import { trouverEvenement } from "@/db/requetes/evenements";
import { partenaires } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { cheminApercu } from "./apercu";
import { lireEvenementAdmin, listerEvenementsAdmin, suggestionsPartenaires } from "./evenements";

const base: DonneesEvenement = {
  titre: "Forum",
  slug: "forum",
  debut: new Date("2025-11-05T09:00:00.000Z"),
  fin: new Date("2025-11-06T18:00:00.000Z"),
  lieuNom: "CICAD",
  lieuVille: "Diamniadio",
  theme: null,
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  partenaires: [],
  videos: [],
  afficheId: null,
  photos: [],
};

describe("lectures de l'admin des événements", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("liste brouillons et publiés, du plus récent au plus ancien, avec filtres", async () => {
    await creerEvenement(db, { ...base, slug: "ancien", titre: "Ancien", debut: new Date("2024-01-01T09:00:00Z"), fin: null }, "publier");
    await creerEvenement(db, { ...base, slug: "recent", titre: "Récent", debut: new Date("2026-01-01T09:00:00Z"), fin: null }, "enregistrer");
    const { lignes, total } = await listerEvenementsAdmin(db, { q: "", page: 1 });
    expect(total).toBe(2);
    expect(lignes.map((l) => [l.slug, l.statut])).toEqual([["recent", "brouillon"], ["ancien", "publie"]]);
    expect((await listerEvenementsAdmin(db, { q: "anc", page: 1 })).lignes.map((l) => l.slug)).toEqual(["ancien"]);
    expect((await listerEvenementsAdmin(db, { q: "", statut: "brouillon", page: 1 })).lignes.map((l) => l.slug)).toEqual(["recent"]);
  });

  it("lit une fiche prête pour le formulaire", async () => {
    const affiche = await creerMedia(db, { url: "/a.webp", pathname: null, alt: "Affiche", credit: null, width: 4, height: 3, mime: "image/webp", taille: null }, null);
    const { id } = await creerEvenement(db, { ...base, afficheId: affiche.id, partenaires: ["CORICA"] }, "publier");
    const fiche = await lireEvenementAdmin(db, id);
    expect(fiche).toMatchObject({
      debut: "2025-11-05T09:00",
      fin: "2025-11-06T18:00",
      theme: "",
      partenaires: ["CORICA"],
      statut: "publie",
      dejaPublie: true,
    });
    expect(fiche!.affiche?.alt).toBe("Affiche");
    expect(fiche!.version).toMatch(/\.\d{3}Z$/);
    expect(await lireEvenementAdmin(db, crypto.randomUUID())).toBeUndefined();
  });

  it("propose les noms des partenaires dans leur ordre", async () => {
    await db.insert(partenaires).values([
      { nom: "MODEC", description: "x", categorie: "Entreprise", ordre: 1 },
      { nom: "CORICA", description: "x", categorie: "Institution", ordre: 0 },
    ]);
    expect(await suggestionsPartenaires(db)).toEqual(["CORICA", "MODEC"]);
  });

  it("ne sert un brouillon qu'en aperçu et construit son chemin depuis la base", async () => {
    const { id } = await creerEvenement(db, base, "enregistrer");
    expect(await trouverEvenement(db, "forum")).toBeUndefined();
    expect((await trouverEvenement(db, "forum", { brouillons: true }))?.titre).toBe("Forum");
    expect(await cheminApercu(db, "evenement", id)).toBe("/evenements/forum");
    expect(await cheminApercu(db, "evenement", crypto.randomUUID())).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/db/requetes/admin/evenements.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter les lectures**

`src/db/requetes/admin/evenements.ts`, sur le modèle de `src/db/requetes/admin/actualites.ts` :

```ts
import { and, asc, desc, eq, ilike, type SQL } from "drizzle-orm";
import { evenements, partenaires } from "@/db/schema";
import type { Db } from "@/db/types";
import { versDateLocale } from "@/lib/admin/dates";
import type { Filtre } from "@/lib/admin/filtre";
import type { Video } from "@/lib/content/types";
import { type MediaChoisi, motifRecherche, PAR_PAGE, versMediaChoisi } from "./commun";

export type LigneEvenementAdmin = {
  id: string;
  titre: string;
  slug: string;
  debut: string;
  lieuVille: string;
  statut: "brouillon" | "publie";
};

export type EvenementAdmin = {
  id: string;
  titre: string;
  slug: string;
  // Valeurs prêtes pour `datetime-local` (heure de Dakar = UTC).
  debut: string;
  fin: string;
  lieuNom: string;
  lieuVille: string;
  theme: string;
  resume: string;
  corps: string;
  partenaires: string[];
  videos: Video[];
  affiche: MediaChoisi | null;
  photos: MediaChoisi[];
  statut: "brouillon" | "publie";
  dejaPublie: boolean;
  version: string;
};

export async function listerEvenementsAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneEvenementAdmin[]; total: number }> {
  const conditions: SQL[] = [];
  if (f.q) conditions.push(ilike(evenements.titre, motifRecherche(f.q)));
  if (f.statut) conditions.push(eq(evenements.statut, f.statut));
  const ou = conditions.length > 0 ? and(...conditions) : undefined;
  const [lignes, total] = await Promise.all([
    db
      .select({
        id: evenements.id,
        titre: evenements.titre,
        slug: evenements.slug,
        debut: evenements.debut,
        lieuVille: evenements.lieuVille,
        statut: evenements.statut,
      })
      .from(evenements)
      .where(ou)
      .orderBy(desc(evenements.debut), desc(evenements.creeLe))
      .limit(PAR_PAGE)
      .offset((f.page - 1) * PAR_PAGE),
    db.$count(evenements, ou),
  ]);
  return { lignes: lignes.map((l) => ({ ...l, debut: l.debut.toISOString() })), total };
}

export async function lireEvenementAdmin(db: Db, id: string): Promise<EvenementAdmin | undefined> {
  const e = await db.query.evenements.findFirst({
    where: eq(evenements.id, id),
    with: { affiche: true, photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  if (!e) return undefined;
  return {
    id: e.id,
    titre: e.titre,
    slug: e.slug,
    debut: versDateLocale(e.debut),
    fin: e.fin ? versDateLocale(e.fin) : "",
    lieuNom: e.lieuNom,
    lieuVille: e.lieuVille,
    theme: e.theme ?? "",
    resume: e.resume,
    corps: e.corps,
    partenaires: e.partenaires,
    videos: e.videos,
    affiche: e.affiche ? versMediaChoisi(e.affiche) : null,
    photos: e.photos.map((p) => versMediaChoisi(p.media)),
    statut: e.statut,
    dejaPublie: e.publieLe !== null,
    version: e.majLe.toISOString(),
  };
}

// Suggestions du champ « Partenaires » d'un événement (les noms restent libres).
export async function suggestionsPartenaires(db: Db): Promise<string[]> {
  const lignes = await db.select({ nom: partenaires.nom }).from(partenaires).orderBy(asc(partenaires.ordre), asc(partenaires.nom));
  return lignes.map((l) => l.nom);
}
```

Dans `src/db/requetes/evenements.ts`, donner à `trouverEvenement` le même troisième paramètre `o: { brouillons?: boolean } = {}` que `trouverActualite`, avec le même commentaire. `getEvenement` reste un appel à un seul argument.

Dans `src/db/requetes/admin/apercu.ts` :
- `export type TypeApercu = "actualite" | "evenement";`
- une branche `evenement` lit `evenements.slug` par id et renvoie `/evenements/${slug}`.

Dans `src/app/api/apercu/route.ts` : `const TYPES: TypeApercu[] = ["actualite", "evenement"];`.

Dans `src/lib/content/evenements.ts`, ajouter `getEvenementPourPage(slug)` sur le modèle exact de `getActualitePourPage`. Dans `src/app/(site)/evenements/[slug]/page.tsx`, remplacer les deux appels `getEvenement(slug)` par `getEvenementPourPage(slug)`.

- [ ] **Step 4: Vérifier**

Run: `npx vitest run src/db/requetes && npx tsc --noEmit && npm run build`
Expected: PASS. Dans la sortie du build, les pages `/evenements/<slug>` restent en `●` (SSG).

- [ ] **Step 5: Commit**

```bash
git add src/db/requetes src/app/api/apercu/route.ts src/lib/content/evenements.ts "src/app/(site)/evenements/[slug]/page.tsx"
git commit -m "Lectures de l'admin des événements et aperçu des brouillons d'événements

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 6: Server Actions des événements

**Files:**
- Create: `src/lib/admin/evenements.ts`, `src/lib/admin/evenements.test.ts`

**Interfaces:**
- Consumes: `schemaEnvoiEvenement` (tâche 3), les opérations de la tâche 4, `action`, `erreursDe`, `CONFLIT`, `TAGS`.
- Produces (fichier `"use server"`) :
  - `type ResultatEvenement = Resultat<{ version: string }>`
  - `creerEvenement(etat, donnees: FormData)` : redirige vers `/admin/evenements/<id>?cree=1`
  - `enregistrerEvenement(id: string, etat, donnees: FormData)`
  - `supprimerEvenementAction(id: string): Promise<Resultat>`
  - Messages : « Modifications enregistrées. », « Événement publié. », « Événement retiré du site. », « Événement supprimé. », « Événement introuvable. »

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/admin/evenements.test.ts`, calqué sur `src/lib/admin/actualites.test.ts` (même structure de mocks : `@/lib/session`, `@/db`, `@/db/operations/evenements`, `next/cache`, `next/navigation`) :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ creerEvenement: vi.fn(), modifierEvenement: vi.fn(), supprimerEvenement: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/evenements", () => ops);
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => ({ redirect }));

import { creerEvenement, enregistrerEvenement, supprimerEvenementAction } from "./evenements";

const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = {
    titre: "Forum",
    slug: "forum",
    debut: "2025-11-05T09:00",
    lieuNom: "CICAD",
    lieuVille: "Diamniadio",
    resume: "Résumé.",
    corps: "<p>Texte.</p>",
    ...champs,
  };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await creerEvenement(null, formulaire())).toEqual(refus);
    expect(await enregistrerEvenement(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z" }))).toEqual(refus);
    expect(await supprimerEvenementAction(ID)).toEqual(refus);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" }));

  it("renvoie l'erreur de fin sans écrire", async () => {
    const r = await creerEvenement(null, formulaire({ fin: "2025-11-04T09:00" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erreurs?.fin).toEqual(["La fin doit être après le début."]);
    expect(ops.creerEvenement).not.toHaveBeenCalled();
  });

  it("crée, invalide le cache des événements et redirige", async () => {
    ops.creerEvenement.mockResolvedValue({ id: ID });
    await creerEvenement(null, formulaire());
    expect(ops.creerEvenement).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ debut: new Date("2025-11-05T09:00:00.000Z"), fin: null, afficheId: null, partenaires: [] }),
      "enregistrer",
    );
    expect(cache.revalidateTag).toHaveBeenCalledWith("evenements", { expire: 0 });
    expect(redirect).toHaveBeenCalledWith(`/admin/evenements/${ID}?cree=1`);
  });

  it("enregistre avec la version et renvoie la nouvelle", async () => {
    ops.modifierEvenement.mockResolvedValue({ version: "2026-01-02T00:00:00.000Z" });
    const r = await enregistrerEvenement(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z", intention: "publier" }));
    expect(r).toEqual({ ok: true, message: "Événement publié.", donnees: { version: "2026-01-02T00:00:00.000Z" } });
    expect(cache.revalidatePath).toHaveBeenCalledWith(`/admin/evenements/${ID}`);
  });

  it("répond « introuvable » pour un identifiant invalide, sans requête", async () => {
    expect(await enregistrerEvenement("x", null, formulaire())).toEqual({ ok: false, message: "Événement introuvable." });
    expect(await supprimerEvenementAction("x")).toEqual({ ok: false, message: "Événement introuvable." });
    expect(ops.modifierEvenement).not.toHaveBeenCalled();
    expect(ops.supprimerEvenement).not.toHaveBeenCalled();
  });

  it("supprime et invalide le cache", async () => {
    ops.supprimerEvenement.mockResolvedValue(undefined);
    expect(await supprimerEvenementAction(ID)).toEqual({ ok: true, message: "Événement supprimé." });
    expect(cache.revalidateTag).toHaveBeenCalledWith("evenements", { expire: 0 });
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/evenements.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/lib/admin/evenements.ts` : même structure que `src/lib/admin/actualites.ts`, avec les différences suivantes.
- `schemaEnvoiEvenement`, `operations` de `@/db/operations/evenements` et `TAGS.evenements`.
- Chemins `/admin/evenements` et `/admin/evenements/${id}`, et redirection vers `/admin/evenements/${id}?cree=1`.
- Messages par intention :

```ts
const MESSAGES: Record<Intention, string> = {
  enregistrer: "Modifications enregistrées.",
  publier: "Événement publié.",
  depublier: "Événement retiré du site.",
};
```

- `INTROUVABLE` : « Événement introuvable. ». Message de suppression : « Événement supprimé. ».
- Le retrait des champs de contrôle (`modifierSlug`, `version`) ne doit pas copier `sansMeta` : le déplacer dans `src/lib/admin/resultat.ts` (export `sansMeta`) et l'importer depuis les deux fichiers d'actions.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/admin && npx tsc --noEmit && npx eslint src/lib/admin`
Expected: PASS (les tests des actions d'actualités aussi).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin
git commit -m "Server Actions des événements

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 7: Écrans des événements et liens d'usage de la médiathèque

**Files:**
- Create: `src/app/admin/(espace)/evenements/page.tsx`, `nouveau/page.tsx`, `[id]/page.tsx`, `formulaire.tsx`
- Modify: `src/app/admin/(espace)/[rubrique]/page.tsx` (retirer `evenements`)
- Modify: `src/db/operations/media.ts`, `src/db/operations/media.test.ts`

**Interfaces:**
- Consumes: `listerEvenementsAdmin`, `lireEvenementAdmin`, `suggestionsPartenaires`, `EvenementAdmin` (tâche 5) ; les actions de la tâche 6 ; `useFormulaire`, `ChampSlug`, `EditeurRiche`, `ListeEditable` (avec `idElement`), `ChampMedia`, `GaleriePhotos`, `BarrePublication`, `FiltresListe`, `Pagination`, `lireFiltre`, `formatDate` (`@/components/ui`).

- [ ] **Step 1: Pages et formulaire**

Les reproduire sur le modèle exact des fichiers de `src/app/admin/(espace)/actualites/`, avec les différences suivantes.

- **Liste** (`page.tsx`) :
  - titre « Événements », lien « Nouvel événement », `BASE = "/admin/evenements"` ;
  - chaque ligne affiche le titre, `formatDate(debut)`, la ville et le badge de statut ;
  - état vide : « Aucun événement pour le moment. », ou « Aucun événement ne correspond. » avec un filtre.
- **`nouveau/page.tsx`** : titre « Nouvel événement ». Elle charge `suggestionsPartenaires(db)` et la passe au formulaire.
- **`[id]/page.tsx`** : `lireEvenementAdmin`, `notFound()` si l'id est invalide ou introuvable, `messageInitial` « Événement créé. » si `?cree=1`, plus les suggestions. Pas de `key` sur le formulaire.
- **`formulaire.tsx`** : `FormulaireEvenement({ evenement?: EvenementAdmin; suggestions: string[]; messageInitial?: string })`. Champs, dans l'ordre :
  1. « Titre » (contrôlé, alimente `ChampSlug` avec `verrouille={evenement?.dejaPublie ?? false}`) ;
  2. « Début » : `type="datetime-local"`, `name="debut"`, `defaultValue={evenement?.debut}`, requis ;
  3. « Fin » : `type="datetime-local"`, `name="fin"`, `defaultValue={evenement?.fin ?? ""}`, avec l'aide « Facultative. Heure de Dakar. » ;
  4. « Lieu » (`lieuNom`) et « Ville » (`lieuVille`), côte à côte dès `sm` ;
  5. « Thème » (`theme`), facultatif ;
  6. « Résumé » : `textarea`, avec la même aide et le même style qu'aux actualités ;
  7. `EditeurRiche` « Présentation » (`name="corps"`) ;
  8. `ChampMedia` « Affiche » (`name="afficheId"`, `valeurInitiale={evenement?.affiche ?? null}`) ;
  9. `GaleriePhotos` « Photos » ;
  10. `ListeEditable<{ nom: string }>` « Partenaires de l'événement » (`name="partenaires"`, `valeurInitiale={(evenement?.partenaires ?? []).map((nom) => ({ nom }))}`, libellé d'ajout « Ajouter un partenaire »). Le rendu est un `Champ` « Nom du partenaire », avec `list={\`${idElement}-suggestions\`}` et un `<datalist id={\`${idElement}-suggestions\`}>` qui reprend `suggestions` ;
  11. `ListeEditable<Video>` « Vidéos YouTube », identique aux actualités ;
  12. `BarrePublication`, avec `apercu={\`/api/apercu?type=evenement&id=${evenement.id}\`}`, `libelleSupprimer="Supprimer l'événement"` et un retour à `/admin/evenements` après suppression.

Les champs internes des listes gardent `form=""`, et leurs ids viennent de `idElement`.

Dans `src/app/admin/(espace)/[rubrique]/page.tsx`, supprimer l'entrée `evenements`.

- [ ] **Step 2: Liens d'usage de la médiathèque**

Dans `src/db/operations/media.ts` (`usagesMedia`), sélectionner `evenements.id` pour les photos et l'affiche, et faire pointer leurs liens vers `/admin/evenements/${id}`. Mettre à jour le commentaire au-dessus du `return`. Dans `src/db/operations/media.test.ts`, remplacer l'attente `"/evenements/journee-nationale-contenu-local-2026"` par `/admin/evenements/${evt.id}`, où `evt` est lu en base par son slug, comme `actu`.

- [ ] **Step 3: Vérification manuelle sans écriture**

Démarrer `npx next dev -p 3100`. Avec `curl`, sans cookie, `/admin/evenements` et `/admin/evenements/nouveau` doivent répondre par une redirection 307 vers `/admin/connexion`. Arrêter ensuite le serveur que vous avez lancé, et seulement celui-là. Ne créer aucun contenu : le parcours dans un navigateur est couvert par la tâche 10.

- [ ] **Step 4: Lint, types, tests, build**

Run: `npx eslint . && npx tsc --noEmit && npm test && npm run build`
Expected: tout passe.

- [ ] **Step 5: Commit**

```bash
git add "src/app/admin/(espace)/evenements" "src/app/admin/(espace)/[rubrique]/page.tsx" src/db/operations/media.ts src/db/operations/media.test.ts
git commit -m "Écrans des événements : liste, création, modification, publication, aperçu, suppression

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 8: Partenaires : validation, opérations et lectures

**Files:**
- Create: `src/lib/validation/partenaires.ts`, `src/lib/validation/partenaires.test.ts`
- Create: `src/db/operations/partenaires.ts`, `src/db/operations/partenaires.test.ts`
- Create: `src/db/requetes/admin/partenaires.ts` (testé dans `src/db/operations/partenaires.test.ts`)

**Interfaces:**
- Consumes: `urlWeb`, `caseACocher`, `idMediaFacultatif`, `memeVersion`, `CONFLIT`, `categoriePartenaire` (schéma).
- Produces:
  - `schemaPartenaire` : sortie `DonneesPartenaire = { nom: string; description: string; categorie: "Institution" | "Entreprise" | "Événement"; url: string | null; logoId: string | null; visible: boolean }`
  - `schemaEnvoiPartenaire = schemaPartenaire.extend({ version: z.iso.datetime().optional() })`
  - `creerPartenaire(db, d): Promise<{ id: string }>` : le partenaire est placé en dernier
  - `modifierPartenaire(db, id, d, { version }): Promise<{ version: string }>`
  - `supprimerPartenaire(db, id): Promise<void>`
  - `deplacerPartenaire(db, id, sens: -1 | 1): Promise<void>`
  - `type LignePartenaireAdmin = { id: string; nom: string; categorie: …; visible: boolean; logo: MediaChoisi | null }` ; `listerPartenairesAdmin(db): Promise<LignePartenaireAdmin[]>`, tous les partenaires par ordre
  - `type PartenaireAdmin = { id; nom; description; categorie; url: string; logo: MediaChoisi | null; visible: boolean; version: string }` ; `lirePartenaireAdmin(db, id)`
  - Messages : « Partenaire introuvable. » ; nom en double : « Ce partenaire existe déjà. » sur le champ `nom`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/validation/partenaires.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { partenaires as partenairesInitiaux } from "@/db/donnees-initiales/organisation";
import { schemaEnvoiPartenaire, schemaPartenaire } from "./partenaires";

const valide = { nom: " CORICA ", description: "Comité.", categorie: "Institution", url: "", logoId: "", visible: "on" };

describe("schemaPartenaire", () => {
  it("lit un formulaire complet", () => {
    expect(schemaPartenaire.parse(valide)).toEqual({
      nom: "CORICA",
      description: "Comité.",
      categorie: "Institution",
      url: null,
      logoId: null,
      visible: true,
    });
  });
  it("accepte les partenaires actuels du site", () => {
    for (const p of partenairesInitiaux) {
      const r = schemaPartenaire.safeParse({ nom: p.nom, description: p.description, categorie: p.categorie, url: p.url ?? "", logoId: "" });
      expect(r.success, `${p.nom} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });
  it("une case décochée rend le partenaire invisible", () => {
    expect(schemaPartenaire.parse({ ...valide, visible: undefined }).visible).toBe(false);
  });
  it.each([
    ["nom", { nom: "" }],
    ["description", { description: " " }],
    ["categorie", { categorie: "Association" }],
    ["url", { url: "javascript:alert(1)" }],
    ["logoId", { logoId: "x" }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaPartenaire.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });
  it("refuse une version malformée", () => {
    expect(schemaEnvoiPartenaire.safeParse({ ...valide, version: "hier" }).success).toBe(false);
  });
});
```

`src/db/operations/partenaires.test.ts` :

```ts
import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { lirePartenaireAdmin, listerPartenairesAdmin } from "@/db/requetes/admin/partenaires";
import { partenaires } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { CONFLIT } from "./commun";
import { ErreurMetier } from "./erreurs";
import { creerPartenaire, type DonneesPartenaire, deplacerPartenaire, modifierPartenaire, supprimerPartenaire } from "./partenaires";

const p = (nom: string): DonneesPartenaire => ({ nom, description: "Description.", categorie: "Entreprise", url: null, logoId: null, visible: true });
const noms = async (db: Db) => (await db.select().from(partenaires).orderBy(asc(partenaires.ordre), asc(partenaires.nom))).map((l) => l.nom);

describe("partenaires", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("place un nouveau partenaire en dernier", async () => {
    await creerPartenaire(db, p("A"));
    await creerPartenaire(db, p("B"));
    expect(await noms(db)).toEqual(["A", "B"]);
  });

  it("refuse un nom déjà pris, quelle que soit la casse", async () => {
    await creerPartenaire(db, p("CORICA"));
    const erreur = await creerPartenaire(db, p("corica")).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("nom");
  });

  it("déplace d'un rang, sans effet aux extrémités", async () => {
    const [a, , c] = [await creerPartenaire(db, p("A")), await creerPartenaire(db, p("B")), await creerPartenaire(db, p("C"))];
    await deplacerPartenaire(db, c.id, -1);
    expect(await noms(db)).toEqual(["A", "C", "B"]);
    await deplacerPartenaire(db, a.id, -1);
    await deplacerPartenaire(db, (await lirePartenaireAdmin(db, c.id))!.id, 1);
    expect(await noms(db)).toEqual(["A", "B", "C"]);
    await deplacerPartenaire(db, c.id, 1);
    expect(await noms(db)).toEqual(["A", "B", "C"]);
  });

  it("répare des ordres en double ou troués sans changer l'ordre relatif", async () => {
    await db.insert(partenaires).values([
      { nom: "A", description: "x", categorie: "Entreprise", ordre: 0 },
      { nom: "B", description: "x", categorie: "Entreprise", ordre: 5 },
      { nom: "C", description: "x", categorie: "Entreprise", ordre: 5 },
    ]);
    const c = (await db.select().from(partenaires).where(eq(partenaires.nom, "C")))[0];
    await deplacerPartenaire(db, c.id, -1);
    expect(await noms(db)).toEqual(["A", "C", "B"]);
    expect((await db.select().from(partenaires).orderBy(asc(partenaires.ordre))).map((l) => l.ordre)).toEqual([0, 1, 2]);
  });

  it("déplace encore correctement après une suppression", async () => {
    const [, b, c] = [await creerPartenaire(db, p("A")), await creerPartenaire(db, p("B")), await creerPartenaire(db, p("C"))];
    await supprimerPartenaire(db, b.id);
    await deplacerPartenaire(db, c.id, -1);
    expect(await noms(db)).toEqual(["C", "A"]);
  });

  it("modifie avec contrôle de version", async () => {
    const { id } = await creerPartenaire(db, p("A"));
    const v = (await lirePartenaireAdmin(db, id))!.version;
    await modifierPartenaire(db, id, { ...p("A"), visible: false }, { version: v });
    const erreur = await modifierPartenaire(db, id, p("A"), { version: v }).catch((e) => e);
    expect(erreur.message).toBe(CONFLIT);
    expect((await lirePartenaireAdmin(db, id))!.visible).toBe(false);
  });

  it("liste tous les partenaires pour l'admin, visibles ou non", async () => {
    await creerPartenaire(db, p("A"));
    await creerPartenaire(db, { ...p("B"), visible: false });
    expect((await listerPartenairesAdmin(db)).map((l) => [l.nom, l.visible])).toEqual([["A", true], ["B", false]]);
  });

  it("signale un partenaire introuvable", async () => {
    await expect(supprimerPartenaire(db, crypto.randomUUID())).rejects.toThrow("Partenaire introuvable.");
    await expect(deplacerPartenaire(db, crypto.randomUUID(), 1)).rejects.toThrow("Partenaire introuvable.");
  });
});
```

Dans le test « déplace d'un rang », la ligne `await deplacerPartenaire(db, (await lirePartenaireAdmin(db, c.id))!.id, 1);` redescend C : l'ordre attendu redevient alors `["A", "B", "C"]`.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/validation/partenaires.test.ts src/db/operations/partenaires.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Implémenter**

`src/lib/validation/partenaires.ts` :

```ts
import { z } from "zod";
import { categoriePartenaire } from "@/db/schema";
import { caseACocher, idMediaFacultatif, urlWeb } from "./commun";

export const schemaPartenaire = z.object({
  nom: z.string().trim().min(1, "Indiquez le nom du partenaire.").max(120, "120 caractères au plus."),
  description: z.string().trim().min(1, "Décrivez le partenaire en une ou deux phrases.").max(600, "600 caractères au plus."),
  categorie: z.enum(categoriePartenaire.enumValues, { error: "Choisissez une catégorie." }),
  // Facultative : un champ vide donne null.
  url: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(urlWeb.optional())
    .transform((v) => v ?? null),
  logoId: idMediaFacultatif,
  visible: caseACocher,
});

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
export const schemaEnvoiPartenaire = schemaPartenaire.extend({ version: z.iso.datetime().optional() });
```

`src/db/operations/partenaires.ts` :

```ts
import { and, asc, eq, ne, sql } from "drizzle-orm";
import { partenaires } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import { CONFLIT, memeVersion } from "./commun";
import { ErreurMetier } from "./erreurs";

export type DonneesPartenaire = {
  nom: string;
  description: string;
  categorie: (typeof partenaires.$inferInsert)["categorie"];
  url: string | null;
  logoId: string | null;
  visible: boolean;
};

const INTROUVABLE = "Partenaire introuvable.";

async function verifierNomLibre(tx: Tx, nom: string, saufId?: string) {
  const memeNom = sql`lower(${partenaires.nom}) = lower(${nom})`;
  const [autre] = await tx
    .select({ id: partenaires.id })
    .from(partenaires)
    .where(saufId ? and(memeNom, ne(partenaires.id, saufId)) : memeNom)
    .limit(1);
  if (autre) throw new ErreurMetier("Ce partenaire existe déjà.", "nom");
}

export async function creerPartenaire(db: Db, d: DonneesPartenaire): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierNomLibre(tx, d.nom);
    const [{ dernier }] = await tx.select({ dernier: sql<number>`coalesce(max(${partenaires.ordre}), -1)` }).from(partenaires);
    const [ligne] = await tx
      .insert(partenaires)
      .values({ ...d, ordre: Number(dernier) + 1 })
      .returning({ id: partenaires.id });
    return ligne;
  });
}

export async function modifierPartenaire(db: Db, id: string, d: DonneesPartenaire, o: { version: string }): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuel = await tx.query.partenaires.findFirst({ where: eq(partenaires.id, id), columns: { id: true } });
    if (!actuel) throw new ErreurMetier(INTROUVABLE);
    await verifierNomLibre(tx, d.nom, id);
    const [maj] = await tx
      .update(partenaires)
      .set(d)
      .where(and(eq(partenaires.id, id), memeVersion(partenaires.majLe, o.version)))
      .returning({ majLe: partenaires.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    return { version: maj.majLe.toISOString() };
  });
}

export async function supprimerPartenaire(db: Db, id: string): Promise<void> {
  const lignes = await db.delete(partenaires).where(eq(partenaires.id, id)).returning({ id: partenaires.id });
  if (lignes.length === 0) throw new ErreurMetier(INTROUVABLE);
}

// Échange avec le voisin puis renumérote 0..n-1 : répare au passage les ordres en double ou troués.
export async function deplacerPartenaire(db: Db, id: string, sens: -1 | 1): Promise<void> {
  await db.transaction(async (tx) => {
    const lignes = await tx
      .select({ id: partenaires.id, ordre: partenaires.ordre })
      .from(partenaires)
      .orderBy(asc(partenaires.ordre), asc(partenaires.nom))
      .for("update");
    const index = lignes.findIndex((l) => l.id === id);
    if (index === -1) throw new ErreurMetier(INTROUVABLE);
    const cible = index + sens;
    if (cible < 0 || cible >= lignes.length) return;
    [lignes[index], lignes[cible]] = [lignes[cible], lignes[index]];
    for (const [ordre, ligne] of lignes.entries()) {
      if (ligne.ordre !== ordre) await tx.update(partenaires).set({ ordre }).where(eq(partenaires.id, ligne.id));
    }
  });
}
```

Si PGlite ou le driver refuse `.for("update")`, le retirer et le signaler dans le rapport. La transaction suffit pour l'usage prévu.

`src/db/requetes/admin/partenaires.ts` :

```ts
import { eq } from "drizzle-orm";
import { partenaires } from "@/db/schema";
import type { Db } from "@/db/types";
import { type MediaChoisi, versMediaChoisi } from "./commun";

type Categorie = (typeof partenaires.$inferSelect)["categorie"];

export type LignePartenaireAdmin = { id: string; nom: string; categorie: Categorie; visible: boolean; logo: MediaChoisi | null };

export type PartenaireAdmin = {
  id: string;
  nom: string;
  description: string;
  categorie: Categorie;
  url: string;
  logo: MediaChoisi | null;
  visible: boolean;
  version: string;
};

export async function listerPartenairesAdmin(db: Db): Promise<LignePartenaireAdmin[]> {
  const lignes = await db.query.partenaires.findMany({
    orderBy: (p, { asc }) => [asc(p.ordre), asc(p.nom)],
    with: { logo: true },
  });
  return lignes.map((p) => ({ id: p.id, nom: p.nom, categorie: p.categorie, visible: p.visible, logo: p.logo ? versMediaChoisi(p.logo) : null }));
}

export async function lirePartenaireAdmin(db: Db, id: string): Promise<PartenaireAdmin | undefined> {
  const p = await db.query.partenaires.findFirst({ where: eq(partenaires.id, id), with: { logo: true } });
  if (!p) return undefined;
  return {
    id: p.id,
    nom: p.nom,
    description: p.description,
    categorie: p.categorie,
    url: p.url ?? "",
    logo: p.logo ? versMediaChoisi(p.logo) : null,
    visible: p.visible,
    version: p.majLe.toISOString(),
  };
}
```

Le site public trie les partenaires par `ordre` seul. Pour que le site et l'admin aient le même départage, ajouter `asc(p.nom)` en second critère dans `listerPartenaires` (`src/db/requetes/organisation.ts`). Les tests existants de `requetes.test.ts` doivent rester verts.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/validation src/db && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/partenaires.ts src/lib/validation/partenaires.test.ts src/db/operations/partenaires.ts src/db/operations/partenaires.test.ts src/db/requetes/admin/partenaires.ts src/db/requetes/organisation.ts
git commit -m "Partenaires : validation, opérations (ordre réparé à chaque déplacement) et lectures de l'admin

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 9: Partenaires : Server Actions et écrans

**Files:**
- Create: `src/lib/admin/partenaires.ts`, `src/lib/admin/partenaires.test.ts`
- Create: `src/app/admin/(espace)/partenaires/page.tsx`, `liste.tsx`, `nouveau/page.tsx`, `[id]/page.tsx`, `formulaire.tsx`
- Modify: `src/app/admin/(espace)/[rubrique]/page.tsx` (retirer `partenaires`)
- Modify: `src/db/operations/media.ts`, `src/db/operations/media.test.ts` (lien d'usage d'un logo)

**Interfaces:**
- Consumes: tâche 8 ; `useFormulaire`, `ChampMedia`, `BoutonConfirmation`, `useFocusDiffere`, composants de `ui.tsx`.
- Produces (fichier `"use server"`) :
  - `type ResultatPartenaire = Resultat<{ version: string }>`
  - `creerPartenaire(etat, donnees)` : redirige vers `/admin/partenaires/<id>?cree=1`
  - `enregistrerPartenaire(id, etat, donnees)` : message « Partenaire enregistré. »
  - `supprimerPartenaireAction(id)` : « Partenaire supprimé. »
  - `deplacerPartenaireAction(id: string, sens: -1 | 1): Promise<Resultat>` : refuse un `sens` autre que -1 ou 1 avec « Déplacement impossible. »
  - Chaque écriture appelle `revalidateTag(TAGS.partenaires, { expire: 0 })` et `revalidatePath("/admin/partenaires")`, plus `/admin/partenaires/${id}` après un enregistrement.

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/admin/partenaires.test.ts`, sur le modèle de `evenements.test.ts` (tâche 6), avec les mocks `@/lib/session`, `@/db`, `@/db/operations/partenaires`, `next/cache` et `next/navigation`. Les cas :
- **Sans rôle** : les quatre actions renvoient `{ ok: false, message: "Accès refusé." }` sans appeler d'opération.
- **Création** : avec `nom`, `description`, `categorie="Institution"` et sans `visible`, `creerPartenaire` est appelée avec `expect.objectContaining({ visible: false, url: null, logoId: null })`. `revalidateTag("partenaires", { expire: 0 })` est appelé et la redirection va vers `/admin/partenaires/${ID}?cree=1`.
- **Enregistrement sans version** : la réponse est `{ ok: false, message: CONFLIT }` et l'opération n'est pas appelée.
- **Déplacement** : `deplacerPartenaireAction(ID, 1)` appelle `deplacerPartenaire({}, ID, 1)` et invalide le cache. `deplacerPartenaireAction(ID, 2 as never)` renvoie `{ ok: false, message: "Déplacement impossible." }`.
- **Identifiant invalide** : `"x"` donne « Partenaire introuvable. » pour enregistrer, supprimer et déplacer, sans aucun appel d'opération.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/partenaires.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter les actions**

`src/lib/admin/partenaires.ts`, sur le modèle de `src/lib/admin/evenements.ts`, sans intention ni slug. On réutilise `sansMeta` de `resultat.ts` ou on retire seulement `version`. L'action de déplacement :

```ts
export async function deplacerPartenaireAction(id: string, sens: -1 | 1): Promise<Resultat> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    if (sens !== -1 && sens !== 1) return { ok: false, message: "Déplacement impossible." };
    await operations.deplacerPartenaire(db, id, sens);
    invalider();
    return { ok: true };
  });
}
```

- [ ] **Step 4: Écrans**

- **`page.tsx`** (serveur) : `exigerSession()`, `listerPartenairesAdmin(db)`, titre « Partenaires », lien « Nouveau partenaire ». Elle rend `<ListePartenaires lignes={…} />`, ou un `EtatVide` « Aucun partenaire pour le moment. ». Ajouter la phrase « L'ordre de cette liste est celui de la page Partenaires du site. ».
- **`liste.tsx`** (client) : `ListePartenaires({ lignes })`, une `<ol>`. Chaque ligne contient :
  - le logo en vignette ou un carré vide ;
  - le nom, en lien vers `/admin/partenaires/${id}` ;
  - la catégorie ;
  - un `Badge` « Visible » (vert) ou « Masqué » (moutarde) ;
  - les boutons ↑ et ↓, avec les ids `partenaire-${id}-haut` et `-bas`, les `aria-label` « Monter {nom} » et « Descendre {nom} », et `disabled` aux extrémités.

  Au clic, `demarrer(async () => { … })` appelle `deplacerPartenaireAction`. Le focus est confié à `useFocusDiffere(lignes)`, avec pour cible le même bouton, ou l'autre flèche si le partenaire arrive à une extrémité (`cibleFocusApres`, indices de la liste). Une erreur s'affiche avec `Alerte`, et les boutons sont `disabled` pendant la transition.
- **`formulaire.tsx`** (client) : `FormulairePartenaire({ partenaire?: PartenaireAdmin; messageInitial?: string })`, avec `useFormulaire`, `noValidate` et le champ caché `version`. Les champs :
  - « Nom » ;
  - `Selection` « Catégorie », avec les options `Institution`, `Entreprise` et `Événement` et une valeur par défaut `Institution` ;
  - `textarea` « Description », sur le modèle du résumé des actualités ;
  - « Site web » (`type="url"`, facultatif) ;
  - `ChampMedia` « Logo » (`name="logoId"`) ;
  - la case « Visible sur le site » (`name="visible"`, `defaultChecked={partenaire?.visible ?? true}`), avec un `<input type="checkbox">` dans un `<label>` d'au moins 44 px.

  Barre en bas : `Bouton type="submit"` « Enregistrer » (« Enregistrement… » pendant l'envoi), puis, si le partenaire existe, `BoutonConfirmation` « Supprimer le partenaire » (question « Supprimer définitivement ce partenaire ? Son logo reste dans la médiathèque. ») qui ramène à la liste.
- **`nouveau/page.tsx`** et **`[id]/page.tsx`** : sur le modèle des événements, avec les titres « Nouveau partenaire » et `partenaire.nom`, et le message « Partenaire ajouté. » après création.
- Retirer `partenaires` de `[rubrique]/page.tsx`. S'il ne reste plus de rubrique « bientôt » que `membres`, `bureau` et `reglages`, laisser le fichier en place.
- Dans `usagesMedia`, le lien d'un logo devient `/admin/partenaires/${p.id}`, avec `partenaires.id` sélectionné. Mettre à jour `media.test.ts` si un logo y est vérifié, sinon ajouter une attente sur un logo du seed.

- [ ] **Step 5: Vérifier**

Run: `npx vitest run src/lib/admin src/db && npx eslint . && npx tsc --noEmit && npm run build`
Expected: tout passe. Vérifier aussi avec `curl`, sans cookie, que `/admin/partenaires` redirige vers la connexion. Arrêter ensuite le serveur lancé.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/partenaires.ts src/lib/admin/partenaires.test.ts "src/app/admin/(espace)/partenaires" "src/app/admin/(espace)/[rubrique]/page.tsx" src/db/operations/media.ts src/db/operations/media.test.ts
git commit -m "Partenaires : liste ordonnée, création, modification, visibilité, suppression

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 10: Parcours de bout en bout des événements et des partenaires

**Files:**
- Create: `e2e/evenements.spec.ts`, `e2e/partenaires.spec.ts`
- Modify: `e2e/nettoyage.ts`, `e2e/preparation.ts`

- [ ] **Step 1: Nettoyage**

Dans `e2e/nettoyage.ts`, et au début de `preparation()` après la garde `E2E_AUTORISE` :

```ts
await db.delete(evenements).where(like(evenements.slug, "e2e-%"));
await db.delete(partenaires).where(like(partenaires.nom, "E2E %"));
```

- [ ] **Step 2: Parcours des événements**

`e2e/evenements.spec.ts` :

```ts
import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const TITRE = "E2E Événement de test";
const SLUG = "e2e-evenement-de-test";

test("un éditeur prépare un événement, le prévisualise puis le supprime", async ({ page, context }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/evenements");
  await page.getByRole("link", { name: "Nouvel événement" }).click();

  await page.getByLabel("Titre", { exact: true }).fill(TITRE);
  await expect(page.getByLabel("Lien de la page")).toHaveValue(SLUG);
  await page.getByLabel("Début").fill("2026-12-05T09:00");
  await page.getByLabel("Fin", { exact: true }).fill("2026-12-05T08:00");
  await page.getByLabel("Lieu", { exact: true }).fill("CICAD");
  await page.getByLabel("Ville").fill("Diamniadio");
  await page.getByLabel("Résumé").fill("Un résumé de test.");
  await page.getByRole("textbox", { name: "Présentation" }).click();
  await page.keyboard.type("Présentation de l'événement.");
  await page.getByRole("button", { name: "Ajouter un partenaire" }).click();
  await page.getByLabel("Nom du partenaire").fill("E2E partenaire libre");

  // Fin avant le début : erreur sur le champ, saisie conservée.
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByText("La fin doit être après le début.")).toBeVisible();
  await expect(page.getByLabel("Titre", { exact: true })).toHaveValue(TITRE);
  await expect(page.getByLabel("Nom du partenaire")).toHaveValue("E2E partenaire libre");

  await page.getByLabel("Fin", { exact: true }).fill("2026-12-05T18:00");
  await page.getByRole("button", { name: "Choisir une image" }).click();
  const fenetre = page.getByRole("dialog");
  const premiereImage = fenetre.locator("button[aria-pressed]").first();
  await expect(premiereImage, "La médiathèque doit contenir au moins une image (seed).").toBeVisible();
  await premiereImage.click();
  await fenetre.getByRole("button", { name: /^Valider/ }).click();

  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/\/admin\/evenements\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Événement créé." })).toBeVisible();
  // L'heure saisie est relue à l'identique (Dakar = UTC).
  await expect(page.getByLabel("Début")).toHaveValue("2026-12-05T09:00");

  expect((await page.request.get(`/evenements/${SLUG}`)).status()).toBe(404);

  const [apercu] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1, name: TITRE })).toBeVisible();
  await expect(apercu.getByText("E2E partenaire libre")).toBeVisible();
  await apercu.getByRole("button", { name: "Quitter l'aperçu" }).click();
  await expect(apercu.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await apercu.close();

  await page.getByRole("button", { name: "Supprimer l'événement" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/evenements$/);
  await expect(page.getByText(TITRE)).toHaveCount(0);
});
```

Si la page publique d'un événement n'affiche pas les partenaires comme du texte simple, ajuster le sélecteur `E2E partenaire libre` d'après le DOM réel, sans affaiblir la vérification.

- [ ] **Step 3: Parcours des partenaires**

`e2e/partenaires.spec.ts` :

```ts
import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const NOM = "E2E Partenaire de test";
// Base partagée avec la production : le partenaire de test reste masqué sauf sur une base dédiée.
const baseDediee = process.env.E2E_BASE_DEDIEE === "1";

test("un éditeur ajoute un partenaire masqué, le déplace puis le supprime", async ({ page }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/partenaires");
  await page.getByRole("link", { name: "Nouveau partenaire" }).click();

  await page.getByLabel("Nom", { exact: true }).fill(NOM);
  await page.getByLabel("Catégorie").selectOption("Entreprise");
  await page.getByLabel("Description").fill("Partenaire créé par les tests.");
  await page.getByLabel("Visible sur le site").uncheck();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page).toHaveURL(/\/admin\/partenaires\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Partenaire ajouté." })).toBeVisible();

  // Nom en double : erreur sur le champ.
  await page.goto("/admin/partenaires/nouveau");
  await page.getByLabel("Nom", { exact: true }).fill(NOM.toUpperCase());
  await page.getByLabel("Description").fill("Doublon.");
  await page.getByLabel("Visible sur le site").uncheck();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Ce partenaire existe déjà.").first()).toBeVisible();

  // Nouveau = dernier de la liste ; on le monte d'un rang, le focus reste sur le bouton.
  await page.goto("/admin/partenaires");
  const ligne = page.getByRole("listitem").filter({ hasText: NOM });
  await expect(ligne.getByText("Masqué")).toBeVisible();
  await expect(page.getByRole("button", { name: `Descendre ${NOM}` })).toBeDisabled();
  const monter = page.getByRole("button", { name: `Monter ${NOM}` });
  await monter.click();
  await expect(page.getByRole("button", { name: `Descendre ${NOM}` })).toBeEnabled();
  await expect(monter).toBeFocused();

  // Masqué : absent de la page publique.
  await page.goto("/partenaires");
  await expect(page.getByText(NOM)).toHaveCount(0);

  if (baseDediee) {
    await page.goto("/admin/partenaires");
    await page.getByRole("link", { name: NOM }).click();
    await page.getByLabel("Visible sur le site").check();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Partenaire enregistré." })).toBeVisible();
    await page.goto("/partenaires");
    await expect(page.getByText(NOM)).toBeVisible();
  }

  await page.goto("/admin/partenaires");
  await page.getByRole("link", { name: NOM }).click();
  await page.getByRole("button", { name: "Supprimer le partenaire" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/partenaires$/);
  await expect(page.getByText(NOM)).toHaveCount(0);
});
```

Monter un partenaire de test renumérote les partenaires réels, mais leur ordre relatif ne change pas, et la suppression du partenaire de test laisse cet ordre intact (tâche 8).

- [ ] **Step 4: Lancer les tests e2e et vérifier la base**

Run: `E2E_AUTORISE=1 npm run test:e2e`
Expected: tous les tests passent, anciens et nouveaux. Ensuite, avec un petit script `node --env-file=.env.local --import tsx -e …` qui utilise `src/db`, vérifier qu'il reste 0 événement `e2e-%`, 0 partenaire `E2E %` et 0 compte `@ademig.test`, et que l'ordre relatif des partenaires réels est inchangé. Relever cet ordre **avant** le lancement pour pouvoir comparer.

- [ ] **Step 5: Commit**

```bash
git add e2e
git commit -m "E2E : événement (erreur de fin, affiche, aperçu, suppression) et partenaire masqué (doublon, déplacement, suppression)

Co-Authored-By: <modèle> <noreply@anthropic.com>"
```

---

### Task 11: Vérification finale du lot

- [ ] **Step 1: Suite complète**

Run: `npx eslint . && npx tsc --noEmit && npm test && npm run build && E2E_AUTORISE=1 npm run test:e2e`
Expected: tout passe. Dans le build, `/actualites/[slug]` et `/evenements/[slug]` restent en SSG.

- [ ] **Step 2: Non-régression du site public**

Avec `npx next dev -p 3100`, ouvrir `/`, `/evenements`, chaque `/evenements/<slug>` et `/partenaires` : le contenu et l'ordre des partenaires sont les mêmes qu'avant, sans bandeau d'aperçu ni erreur dans la console.

- [ ] **Step 3: Données de test**

Il ne reste aucun événement `e2e-%`, aucun partenaire `E2E %`, ni aucun compte `@ademig.test`.

- [ ] **Step 4: Rapport**

Faire le point avec l'utilisateur. L'ouverture de la PR se décide avec lui (skill finishing-a-development-branch).
