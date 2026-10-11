# Back office ADEMIG — Sous-projet 2, lot 4 : réglages et textes du site — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modifier depuis `/admin/reglages` les coordonnées, les réseaux sociaux et une liste fermée de textes clés des pages Accueil et L'Amicale, sans redéploiement. Le lot ferme le sous-projet 2 : la page générique « Bientôt disponible » disparaît et le tableau de bord mène à toutes les rubriques.

**Architecture:** Même chaîne que les lots 1 à 3 : schéma Zod (`src/lib/validation/reglages.ts`) → Server Action (`src/lib/admin/reglages.ts`, via `action("editeur")`) → opération pure testée sur PGlite (`src/db/operations/reglages.ts`) → `revalidateTag(TAGS.reglages)`. La table `reglages` n'a qu'une ligne (id = 1). Chaque onglet a son propre formulaire et n'écrit que sa colonne (`contact`, `reseaux` ou `textes`), sous le contrôle de version de la ligne (`maj_le`). Les onglets sont des liens (`?onglet=`) : changer d'onglet recharge la page, donc la version à jour. Le catalogue `src/lib/content/textes.ts` déclare chaque texte éditable avec son texte d'origine. Les pages publiques affichent `fusionnerTextes(reglages.textes)[clé]` : le texte enregistré, ou le texte d'origine si la clé est absente ou vide.

**Tech Stack:** Next.js 16.3 (App Router, Server Actions), React 19.2, Drizzle 0.45 (Neon / PGlite), Zod 4, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-back-office-contenus-design.md` (sections 3.1, 3.4, 4.1, 4.6, 4.7, 6, 7, 8 : lot 4). Plans précédents, livrés et fusionnés : lots 1 à 3 (`docs/superpowers/plans/2026-10-10-back-office-contenus-lot{1,2,3}.md`, PR #2, #3 et #4).

## Global Constraints

- Lire avant de coder les guides Next 16 de `node_modules/next/dist/docs/` utiles à la tâche : forms, server-actions, how-revalidation-works (AGENTS.md : « This is NOT the Next.js you know »).
- Code, noms, commentaires et textes d'interface en français, comme le reste du dépôt ; densité de commentaires identique.
- Toute Server Action passe par `action("editeur", fn)` de `src/lib/admin/action.ts` et renvoie `Resultat<T>` ; une erreur de saisie ne lève jamais d'exception. Pages de l'admin : `exigerSession()`.
- Chaque écriture appelle `revalidateTag(TAGS.reglages, { expire: 0 })` et `revalidatePath("/admin/reglages")`.
- Aucune migration de base : ne pas lancer `db:generate`. La table `reglages` (`contact`, `reseaux`, `textes`, `maj_le`) couvre tout.
- Ne pas changer la forme de `Reglages` (`src/lib/content/types.ts`) ni la clé de cache de `getReglages` : le pied de page, l'en-tête, la page Contact et les données structurées la lisent déjà.
- Textes du site : texte brut, jamais de HTML. Les clés inconnues sont refusées par la validation. La mise en page, les icônes, les images et **les valeurs chiffrées des graphiques** restent dans le code.
- Pas de `cacheComponents` ni de `"use cache"`.
- Formulaires : `useFormulaire` (soumission par `onSubmit`, sans perte de saisie), `noValidate` sur le `<form>`, contrôle de version via `memeVersion`. Les champs internes d'une `ListeEditable` portent `form=""`.
- Admin : cibles d'au moins 44 px (`min-h-11`), focus visible, utilisable à 360 px, contraste AA, composants de `src/components/admin/ui.tsx` et `src/components/admin/champs/`.
- Base partagée avec la production. Les tests e2e :
  - n'enregistrent aucune valeur différente de la valeur en place, sauf si `E2E_BASE_DEDIEE=1` ;
  - préfixent tout texte de test par `E2E ` ;
  - retirent tout texte `E2E …` des réglages dans `e2e/nettoyage.ts` et au début de `e2e/preparation.ts`, même après un échec.
- Dev local sur le port 3100 : `npx next dev -p 3100`. E2E : `E2E_AUTORISE=1 npm run test:e2e`.
- Commits : messages en français, terminés par une ligne `Co-Authored-By:` au nom du modèle qui écrit le code, sur la branche `back-office-contenus-lot4`. Ne jamais pousser.

## Review Focus

- **Texte remis à l'origine, ou vidé** : il n'est pas stocké, et la page publique affiche le texte d'origine. Un texte stocké vide, fait d'espaces ou qui n'est pas une chaîne n'est jamais affiché tel quel (tests de `textesAEnregistrer` et `fusionnerTextes`, tâche 1 ; test de l'action, tâche 5).
- **Deux onglets ou deux éditeurs à la fois** : une version périmée est refusée avec le message de conflit, et rien n'est écrit. Enregistrer un onglet ne touche pas aux deux autres colonnes (tests PGlite, tâche 4).
- **Ligne `reglages` absente** (seed jamais lancé) : l'écran affiche les valeurs d'origine ; le premier enregistrement crée la ligne ; une seconde création concurrente donne le conflit (tests PGlite, tâche 4).
- **Adresse de réseau dangereuse ou non sécurisée** (`http://`, `javascript:`, sans protocole) et **deux réseaux du même nom** : refusés, le message dit quel élément corriger (tests Zod, tâche 3 ; e2e, tâche 7).
- **Texte trop long, email invalide** : erreur sous le champ, la saisie reste à l'écran et rien n'est écrit (tests Zod, tâche 3 ; e2e, tâche 7).

---

## Liste arrêtée des textes éditables

La spec (3.4) demande d'arrêter la liste dans le plan. Relevé fait dans `src/app/(site)/page.tsx` et `src/app/(site)/amicale/page.tsx` au commit `5321c71`. Les textes d'origine sont recopiés **à l'identique** (apostrophes droites, espaces simples).

| Clé | Libellé dans l'admin | Forme | Max |
|---|---|---|---|
| `accueil.accroche` | Titre principal | ligne | 120 |
| `accueil.devise.reflechir` | Devise : Réfléchir | paragraphe | 240 |
| `accueil.devise.proposer` | Devise : Proposer | paragraphe | 240 |
| `accueil.devise.agir` | Devise : Agir | paragraphe | 240 |
| `accueil.forum.titre` | Forum : titre de la section | ligne | 100 |
| `accueil.forum.candidatures` | Forum : légende du chiffre 1 000 | ligne | 80 |
| `accueil.forum.postes` | Forum : légende du chiffre 188 | ligne | 80 |
| `accueil.forum.entreprises` | Forum : légende du chiffre 16 | ligne | 80 |
| `accueil.valeur.titre` | Contenu local : titre de la section | ligne | 100 |
| `accueil.valeur.achats.titre` | Contenu local : titre de la barre à 50 % | ligne | 60 |
| `accueil.valeur.achats.texte` | Contenu local : texte de la barre à 50 % | paragraphe | 240 |
| `accueil.valeur.candidats.titre` | Contenu local : titre de la barre à 10 % | ligne | 60 |
| `accueil.valeur.candidats.texte` | Contenu local : texte de la barre à 10 % | paragraphe | 240 |
| `accueil.valeur.source` | Contenu local : source des chiffres | paragraphe | 240 |
| `amicale.intro` | En-tête : introduction | ligne | 160 |
| `amicale.ecole.paragraphe1` | Une école, un réseau : premier paragraphe | paragraphe | 900 |
| `amicale.ecole.paragraphe2` | Une école, un réseau : second paragraphe | paragraphe | 900 |
| `amicale.mission1.titre` … `amicale.mission4.titre` | Mission 1 (à 4) : titre | ligne | 80 |
| `amicale.mission1.texte` … `amicale.mission4.texte` | Mission 1 (à 4) : texte | paragraphe | 320 |

Choix à faire relire :
- **Pas de clé « introduction » sur l'accueil** : la page n'a pas de paragraphe d'introduction aujourd'hui (le hero n'a qu'un titre, le nom complet et deux boutons). En ajouter un changerait la mise en page.
- **Les chiffres eux-mêmes restent dans le code** (1 000, 188, 16, 86,4 %, 50 %, 10 %), comme le titre du camembert, qui les cite : seules les légendes et les textes sont éditables. Les libellés de l'admin rappellent le chiffre concerné.
- **Ajout par rapport à la spec** : les deux paragraphes « Une école, un réseau » de L'Amicale, qui sont du texte pur et que le bureau voudra pouvoir corriger.
- Les verbes de la devise (Réfléchir, Proposer, Agir) restent dans le code : ils reprennent `site.motto`.

## Choix de l'interface des textes

Chaque champ est **prérempli avec le texte affiché** (enregistré, sinon d'origine), pour qu'on corrige un mot sans tout retaper. À l'enregistrement, un texte égal au texte d'origine, ou vide, n'est pas stocké : sa clé est vidée, comme le demande la spec. « Rétablir le texte d'origine » remet le texte d'origine dans le champ (il faut ensuite enregistrer). Un badge « Modifié » et l'aide « Texte d'origine : … » signalent les textes qui diffèrent.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/content/textes.ts` (+ test) | catalogue `TEXTES`, `CleTexte`, `normaliserTexte`, `fusionnerTextes`, `textesAEnregistrer` |
| `src/app/(site)/page.tsx`, `src/app/(site)/amicale/page.tsx` (modif.) | lisent leurs textes par `fusionnerTextes` |
| `src/lib/validation/reglages.ts` (+ test) | `schemaCoordonnees`, `schemaReseaux`, `schemaTextes` |
| `src/db/operations/reglages.ts` (+ test) | `modifierReglages` (une partie, contrôle de version, création si la ligne manque) |
| `src/db/requetes/admin/reglages.ts` (testé avec l'opération) | `lireReglagesAdmin` |
| `src/lib/admin/reglages.ts` (+ test) | Server Actions `enregistrerCoordonnees`, `enregistrerReseaux`, `enregistrerTextes` |
| `src/app/admin/(espace)/reglages/page.tsx`, `coordonnees.tsx`, `reseaux.tsx`, `textes.tsx` | écran à onglets et ses trois formulaires |
| `src/app/admin/(espace)/[rubrique]/page.tsx` (supprimé) | plus aucune rubrique « Bientôt disponible » |
| `src/app/admin/(espace)/page.tsx` (modif.) | raccourcis vers toutes les rubriques |
| `e2e/reglages.spec.ts`, `e2e/nettoyage.ts`, `e2e/preparation.ts` | parcours e2e et nettoyage des textes de test |

---

### Task 1: Catalogue des textes éditables

**Files:**
- Create: `src/lib/content/textes.ts`
- Test: `src/lib/content/textes.test.ts`

**Interfaces:**
- Produces, dans `src/lib/content/textes.ts` (module pur, importable côté client comme côté serveur) :
  - `type DefinitionTexte = { groupe: "Accueil" | "L'Amicale"; libelle: string; forme: "ligne" | "paragraphe"; max: number; defaut: string }`
  - `const TEXTES` (objet `as const satisfies Record<string, DefinitionTexte>`, dans l'ordre d'affichage)
  - `type CleTexte = keyof typeof TEXTES`
  - `const CLES_TEXTES: CleTexte[]`
  - `normaliserTexte(cle: CleTexte, valeur: string): string`
  - `fusionnerTextes(enregistres: Record<string, string>): Record<CleTexte, string>`
  - `textesAEnregistrer(saisie: Partial<Record<CleTexte, string>>): Record<string, string>`

- [ ] **Step 1: Créer la branche**

```bash
git switch -c back-office-contenus-lot4
```

- [ ] **Step 2: Write the failing test**

Créer `src/lib/content/textes.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { CLES_TEXTES, fusionnerTextes, normaliserTexte, TEXTES, textesAEnregistrer } from "./textes";

describe("catalogue des textes", () => {
  it("a des clés lisibles, des libellés uniques et des textes d'origine qui tiennent dans leur limite", () => {
    for (const cle of CLES_TEXTES) {
      const t = TEXTES[cle];
      expect(cle).toMatch(/^[a-z0-9]+(\.[a-z0-9]+)+$/);
      expect(t.defaut.length, cle).toBeLessThanOrEqual(t.max);
      expect(normaliserTexte(cle, t.defaut), cle).toBe(t.defaut);
    }
    const libelles = CLES_TEXTES.map((cle) => TEXTES[cle].libelle);
    expect(new Set(libelles).size).toBe(libelles.length);
  });

  it("range les textes de l'accueil avant ceux de L'Amicale", () => {
    const groupes = CLES_TEXTES.map((cle) => TEXTES[cle].groupe);
    expect(groupes.lastIndexOf("Accueil")).toBeLessThan(groupes.indexOf("L'Amicale"));
  });
});

describe("normaliserTexte", () => {
  it("une ligne ne garde aucun retour à la ligne", () => {
    expect(normaliserTexte("accueil.accroche", "  Les ingénieurs\n  du Sénégal ")).toBe("Les ingénieurs du Sénégal");
  });

  it("un paragraphe garde ses retours à la ligne, au format Unix", () => {
    expect(normaliserTexte("accueil.devise.agir", " Ligne 1\r\nLigne 2 ")).toBe("Ligne 1\nLigne 2");
  });
});

describe("fusionnerTextes", () => {
  it("rend le texte d'origine pour une clé absente, vide ou mal formée", () => {
    const t = fusionnerTextes({ "accueil.accroche": "   ", "amicale.intro": 42 as unknown as string });
    expect(t["accueil.accroche"]).toBe(TEXTES["accueil.accroche"].defaut);
    expect(t["amicale.intro"]).toBe(TEXTES["amicale.intro"].defaut);
    expect(t["amicale.mission1.titre"]).toBe("Soutenir l'ENSMG");
    expect(Object.keys(t)).toEqual(CLES_TEXTES);
  });

  it("rend le texte enregistré et ignore les clés inconnues", () => {
    const t = fusionnerTextes({ "accueil.accroche": "Nouveau titre", "accueil.disparu": "x" });
    expect(t["accueil.accroche"]).toBe("Nouveau titre");
    expect(Object.keys(t)).not.toContain("accueil.disparu");
  });
});

describe("textesAEnregistrer", () => {
  it("ne garde que les textes qui diffèrent du texte d'origine, nettoyés", () => {
    expect(
      textesAEnregistrer({
        "accueil.accroche": `  ${TEXTES["accueil.accroche"].defaut} `,
        "amicale.intro": "",
        "amicale.mission1.titre": "  Appuyer l'école  ",
        "accueil.devise.agir": "Ligne 1\r\nLigne 2",
      }),
    ).toEqual({ "amicale.mission1.titre": "Appuyer l'école", "accueil.devise.agir": "Ligne 1\nLigne 2" });
  });

  it("une saisie vide ou remise à l'origine vide toutes les clés", () => {
    expect(textesAEnregistrer({})).toEqual({});
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/content/textes.test.ts`
Expected: FAIL, « Failed to resolve import "./textes" ».

- [ ] **Step 4: Write minimal implementation**

Créer `src/lib/content/textes.ts`. Les textes d'origine sont ceux des deux pages, recopiés à l'identique (vérifier caractère par caractère : la tâche 2 contrôle qu'ils ne restent pas en double dans les pages).

```ts
// Textes clés de l'accueil et de L'Amicale, modifiables dans Réglages > Textes du site.
// Le texte d'origine s'affiche tant que la clé est absente ou vide en base.

export type DefinitionTexte = {
  groupe: "Accueil" | "L'Amicale";
  libelle: string;
  forme: "ligne" | "paragraphe";
  max: number;
  defaut: string;
};

// L'ordre est celui de l'écran des réglages : page par page, de haut en bas.
export const TEXTES = {
  "accueil.accroche": {
    groupe: "Accueil",
    libelle: "Titre principal",
    forme: "ligne",
    max: 120,
    defaut: "Les ingénieurs des mines et de la géologie du Sénégal",
  },
  "accueil.devise.reflechir": {
    groupe: "Accueil",
    libelle: "Devise : Réfléchir",
    forme: "paragraphe",
    max: 240,
    defaut:
      "Des journées de réflexion sur le contenu local, la souveraineté sur les ressources et le transfert de compétences.",
  },
  "accueil.devise.proposer": {
    groupe: "Accueil",
    libelle: "Devise : Proposer",
    forme: "paragraphe",
    max: 240,
    defaut: "Des recommandations remises aux autorités et une parole d'experts dans le débat public.",
  },
  "accueil.devise.agir": {
    groupe: "Accueil",
    libelle: "Devise : Agir",
    forme: "paragraphe",
    max: 240,
    defaut: "L'encadrement des stagiaires de l'ENSMG, l'appui à l'école et l'emploi des jeunes diplômés.",
  },
  "accueil.forum.titre": {
    groupe: "Accueil",
    libelle: "Forum : titre de la section",
    forme: "ligne",
    max: 100,
    defaut: "Le forum de recrutement 2025 en chiffres",
  },
  "accueil.forum.candidatures": {
    groupe: "Accueil",
    libelle: "Forum : légende du chiffre 1 000",
    forme: "ligne",
    max: 80,
    defaut: "candidatures reçues, et plus",
  },
  "accueil.forum.postes": {
    groupe: "Accueil",
    libelle: "Forum : légende du chiffre 188",
    forme: "ligne",
    max: 80,
    defaut: "postes proposés",
  },
  "accueil.forum.entreprises": {
    groupe: "Accueil",
    libelle: "Forum : légende du chiffre 16",
    forme: "ligne",
    max: 80,
    defaut: "entreprises présentes",
  },
  "accueil.valeur.titre": {
    groupe: "Accueil",
    libelle: "Contenu local : titre de la section",
    forme: "ligne",
    max: 100,
    defaut: "Contenu local : où va la valeur extraite ?",
  },
  "accueil.valeur.achats.titre": {
    groupe: "Accueil",
    libelle: "Contenu local : titre de la barre à 50 %",
    forme: "ligne",
    max: 60,
    defaut: "Achats locaux",
  },
  "accueil.valeur.achats.texte": {
    groupe: "Accueil",
    libelle: "Contenu local : texte de la barre à 50 %",
    forme: "paragraphe",
    max: 240,
    defaut:
      "Plus de la moitié des volumes d'achats du secteur vont à des fournisseurs sénégalais, soit 1 100 milliards de FCFA.",
  },
  "accueil.valeur.candidats.titre": {
    groupe: "Accueil",
    libelle: "Contenu local : titre de la barre à 10 %",
    forme: "ligne",
    max: 60,
    defaut: "Candidats retenus",
  },
  "accueil.valeur.candidats.texte": {
    groupe: "Accueil",
    libelle: "Contenu local : texte de la barre à 10 %",
    forme: "paragraphe",
    max: 240,
    defaut:
      "Une centaine de jeunes diplômés, sur plus de 1 000 candidats, ont rencontré les recruteurs au SIM Sénégal 2025.",
  },
  "accueil.valeur.source": {
    groupe: "Accueil",
    libelle: "Contenu local : source des chiffres",
    forme: "paragraphe",
    max: 240,
    defaut: "Chiffres présentés lors de la Journée nationale sur le contenu local, le 12 septembre 2026.",
  },
  "amicale.intro": {
    groupe: "L'Amicale",
    libelle: "En-tête : introduction",
    forme: "ligne",
    max: 160,
    defaut: "Les ingénieurs formés à Dakar aux métiers des mines et de la géologie",
  },
  "amicale.ecole.paragraphe1": {
    groupe: "L'Amicale",
    libelle: "Une école, un réseau : premier paragraphe",
    forme: "paragraphe",
    max: 900,
    defaut:
      "L'École nationale supérieure des mines et de la géologie (ENSMG) de l'Université Cheikh Anta Diop forme depuis des décennies les cadres du Sénégal et de la sous-région dans l'ingénierie et la géologie. Elle est l'héritière de l'Institut des sciences de la Terre (IST), devenu école nationale supérieure par décrets en 2021 et 2022.",
  },
  "amicale.ecole.paragraphe2": {
    groupe: "L'Amicale",
    libelle: "Une école, un réseau : second paragraphe",
    forme: "paragraphe",
    max: 900,
    defaut:
      "Ses diplômés travaillent dans l'exploration et l'exploitation minière, le pétrole et le gaz, l'hydrogéologie, le génie civil, l'environnement et l'administration. L'ADEMIG les réunit pour entretenir la solidarité entre promotions, soutenir l'école et peser, par l'expertise, sur l'avenir du secteur extractif sénégalais.",
  },
  "amicale.mission1.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 1 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Soutenir l'ENSMG",
  },
  "amicale.mission1.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 1 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Encadrement des stagiaires, cours et séminaires donnés par des ingénieurs en activité, aides matérielles et financières à l'école.",
  },
  "amicale.mission2.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 2 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Ouvrir les portes de l'emploi",
  },
  "amicale.mission2.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 2 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Mise en relation des jeunes diplômés avec les entreprises, comme lors du forum de recrutement minier du SIM Sénégal 2025.",
  },
  "amicale.mission3.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 3 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Éclairer le débat public",
  },
  "amicale.mission3.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 3 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Des prises de position fondées sur la science, pour que les décisions sur les ressources naturelles reposent sur des faits géologiques exacts.",
  },
  "amicale.mission4.titre": {
    groupe: "L'Amicale",
    libelle: "Mission 4 : titre",
    forme: "ligne",
    max: 80,
    defaut: "Faire vivre le contenu local",
  },
  "amicale.mission4.texte": {
    groupe: "L'Amicale",
    libelle: "Mission 4 : texte",
    forme: "paragraphe",
    max: 320,
    defaut:
      "Des propositions pour que les compétences, les entreprises et le financement sénégalais prennent toute leur place dans le secteur extractif.",
  },
} as const satisfies Record<string, DefinitionTexte>;

export type CleTexte = keyof typeof TEXTES;

export const CLES_TEXTES = Object.keys(TEXTES) as CleTexte[];

// Espaces de bord retirés ; une ligne (titre, légende) ne garde aucun retour à la ligne.
export function normaliserTexte(cle: CleTexte, valeur: string): string {
  const texte = valeur.replace(/\r\n?/g, "\n").trim();
  return TEXTES[cle].forme === "ligne" ? texte.replace(/\s+/g, " ") : texte;
}

// Textes affichés : la valeur enregistrée si elle a du contenu, sinon le texte d'origine.
export function fusionnerTextes(enregistres: Record<string, string>): Record<CleTexte, string> {
  return Object.fromEntries(
    CLES_TEXTES.map((cle) => {
      const valeur = enregistres[cle];
      const texte = typeof valeur === "string" ? valeur.trim() : "";
      return [cle, texte || TEXTES[cle].defaut];
    }),
  ) as Record<CleTexte, string>;
}

// Ne stocke que les textes qui diffèrent de l'origine : rétablir un texte vide sa clé.
export function textesAEnregistrer(saisie: Partial<Record<CleTexte, string>>): Record<string, string> {
  const textes: Record<string, string> = {};
  for (const cle of CLES_TEXTES) {
    const texte = normaliserTexte(cle, saisie[cle] ?? "");
    if (texte && texte !== TEXTES[cle].defaut) textes[cle] = texte;
  }
  return textes;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/content/textes.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/content/textes.ts src/lib/content/textes.test.ts
git commit -m "Catalogue des textes éditables de l'accueil et de L'Amicale"
```

---

### Task 2: Les pages Accueil et L'Amicale lisent leurs textes

**Files:**
- Modify: `src/app/(site)/page.tsx`
- Modify: `src/app/(site)/amicale/page.tsx`
- Test: `src/lib/content/textes.test.ts` (ajout)

**Interfaces:**
- Consumes: `fusionnerTextes`, `CleTexte`, `TEXTES`, `CLES_TEXTES` (tâche 1) ; `getReglages()` de `src/lib/content/reglages.ts` (existant, renvoie `Reglages` avec `textes: Record<string, string>`).
- Produces: rien de nouveau ; les deux pages restent des Server Components.

- [ ] **Step 1: Write the failing test**

Ajouter à la fin de `src/lib/content/textes.test.ts` (et `import { readFileSync } from "node:fs";` en tête du fichier) :

```ts
// Chaque texte du catalogue doit être lu par sa page, sinon le modifier dans l'admin n'aurait aucun effet.
const PAGES = { Accueil: "src/app/(site)/page.tsx", "L'Amicale": "src/app/(site)/amicale/page.tsx" } as const;

describe("pages du site", () => {
  it("chaque texte est lu par sa page, qui n'en garde plus de copie", () => {
    for (const cle of CLES_TEXTES) {
      const source = readFileSync(PAGES[TEXTES[cle].groupe], "utf8");
      expect(source, cle).toContain(`"${cle}"`);
      expect(source, cle).not.toContain(TEXTES[cle].defaut);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/content/textes.test.ts`
Expected: FAIL sur « pages du site » (`accueil.accroche` absent de la page).

- [ ] **Step 3: Brancher l'accueil**

Dans `src/app/(site)/page.tsx` :

1. Ajouter les imports :

```ts
import { getReglages } from "@/lib/content/reglages";
import { type CleTexte, fusionnerTextes } from "@/lib/content/textes";
```

2. Remplacer la constante `devise` par :

```ts
const devise: { verbe: string; icone: IconeName; texte: CleTexte }[] = [
  { verbe: "Réfléchir", icone: "lampe", texte: "accueil.devise.reflechir" },
  { verbe: "Proposer", icone: "partage", texte: "accueil.devise.proposer" },
  { verbe: "Agir", icone: "casque", texte: "accueil.devise.agir" },
];
```

3. Lire les réglages avec le reste :

```ts
  const [actualites, evenements, membres, partenaires, reglages] = await Promise.all([
    getActualites(),
    getEvenements(),
    getMembres(),
    getPartenaires(),
    getReglages(),
  ]);
  const dernierEvenement = evenements[0];
  const t = fusionnerTextes(reglages.textes);
```

4. Remplacer chaque texte du catalogue par sa clé, sans toucher au reste du JSX :
   - le `<h1 data-hero="titre">` : `{t["accueil.accroche"]}` ;
   - dans la devise : `<p className="mt-2 max-w-xs leading-relaxed">{t[d.texte]}</p>` ;
   - `<SectionTitle id="forum">{t["accueil.forum.titre"]}</SectionTitle>` ;
   - les trois `GrandChiffre` : `legende={t["accueil.forum.candidatures"]}`, `legende={t["accueil.forum.postes"]}`, `legende={t["accueil.forum.entreprises"]}` (les `valeur` restent 1000, 188 et 16) ;
   - `<SectionTitle id="valeur">{t["accueil.valeur.titre"]}</SectionTitle>` ;
   - les deux `BarrePourcentage` : `titre={t["accueil.valeur.achats.titre"]}` et `texte={t["accueil.valeur.achats.texte"]}`, puis `titre={t["accueil.valeur.candidats.titre"]}` et `texte={t["accueil.valeur.candidats.texte"]}` (les `pourcentage` restent 50 et 10) ;
   - le paragraphe de source : `<p className="mt-10 text-center text-sm">{t["accueil.valeur.source"]}</p>`.
   - Le `Camembert` (titre et parts) ne change pas.

- [ ] **Step 4: Brancher L'Amicale**

Dans `src/app/(site)/amicale/page.tsx` :

1. Ajouter les imports :

```ts
import { getReglages } from "@/lib/content/reglages";
import { type CleTexte, fusionnerTextes } from "@/lib/content/textes";
```

2. Remplacer la constante `missions` par :

```ts
const missions: { titre: CleTexte; texte: CleTexte; icone: IconeName; ton: Ton }[] = [
  { titre: "amicale.mission1.titre", texte: "amicale.mission1.texte", icone: "mineur", ton: "ocre" },
  { titre: "amicale.mission2.titre", texte: "amicale.mission2.texte", icone: "partage", ton: "moutarde" },
  { titre: "amicale.mission3.titre", texte: "amicale.mission3.texte", icone: "lampe", ton: "brun" },
  { titre: "amicale.mission4.titre", texte: "amicale.mission4.texte", icone: "lingots", ton: "ocre" },
];
```

3. Rendre la page asynchrone et lire les textes :

```tsx
export default async function Amicale() {
  const t = fusionnerTextes((await getReglages()).textes);
  return (
```

4. Remplacer :
   - `intro="…"` du `PageHeader` par `intro={t["amicale.intro"]}` ;
   - le contenu de `<div className="texte-long mt-6">` par :

```tsx
          <div className="texte-long mt-6">
            <p>{t["amicale.ecole.paragraphe1"]}</p>
            <p>{t["amicale.ecole.paragraphe2"]}</p>
          </div>
```

   - la liste des missions (la clé React devient la clé du titre, unique même si deux titres saisis se ressemblent) :

```tsx
          {missions.map((m) => (
            <li key={m.titre} className="flex gap-5">
              <IconeCarre icone={m.icone} ton={m.ton} taille="sm" />
              <div>
                <h3 className="font-titre text-2xl leading-tight">{t[m.titre]}</h3>
                <p className="mt-2 leading-relaxed">{t[m.texte]}</p>
              </div>
            </li>
          ))}
```

   - Les `metadata`, la devise et le reste de la page ne changent pas.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/content/textes.test.ts && npx tsc --noEmit && npx eslint "src/app/(site)"`
Expected: PASS, aucune erreur de type ni de lint.

- [ ] **Step 6: Non-régression à l'écran**

Lancer `npx next dev -p 3100` (si le port est déjà servi par ce projet, le réutiliser), puis :

```bash
curl -s http://localhost:3100/ | grep -c "Le forum de recrutement 2025 en chiffres"
curl -s http://localhost:3100/amicale | grep -c "Faire vivre le contenu local"
```

Expected: chaque commande affiche au moins `1`. Ouvrir `/` et `/amicale` dans un navigateur : textes, ordre et mise en page identiques à `main`, aucune erreur dans la console.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(site)/page.tsx" "src/app/(site)/amicale/page.tsx" src/lib/content/textes.test.ts
git commit -m "Accueil et L'Amicale : textes clés lus depuis les réglages, texte d'origine par défaut"
```

---

### Task 3: Schémas de validation des réglages

**Files:**
- Create: `src/lib/validation/reglages.ts`
- Test: `src/lib/validation/reglages.test.ts`

**Interfaces:**
- Consumes: `champJson` de `src/lib/validation/commun.ts` ; `CLES_TEXTES`, `CleTexte`, `TEXTES`, `normaliserTexte`, `textesAEnregistrer` (tâche 1) ; type `Contact` de `src/lib/content/types.ts`.
- Produces (champs du formulaire → sortie) :
  - `schemaCoordonnees` : entrée `{ email, telephone?, presseNom, presseTelephone, rue, boitePostale, ville, pays, version? }` → `{ version?: string; contact: Contact }`
  - `schemaReseaux` : entrée `{ reseaux (JSON), version? }` → `{ version?: string; reseaux: Reseau[] }`
  - `schemaTextes` : entrée `{ [cle de TEXTES]: string, version? }`, toute autre clé refusée → `{ version?: string; textes: Record<string, string> }` (seulement les textes modifiés)

- [ ] **Step 1: Write the failing test**

Créer `src/lib/validation/reglages.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import { TEXTES } from "@/lib/content/textes";
import { schemaCoordonnees, schemaReseaux, schemaTextes } from "./reglages";

const coordonnees = {
  email: " contact@ademig.sn ",
  telephone: "",
  presseNom: "Birama Ndoye",
  presseTelephone: "+221 77 552 52 25",
  rue: "ENSMG, Bâtiment BRGM, Route de l'Université",
  boitePostale: "BP 5396 Dakar-Fann",
  ville: "Dakar",
  pays: "Sénégal",
};
const champsEnErreur = (r: { error?: { issues: { path: PropertyKey[] }[] } }) => r.error!.issues.map((i) => String(i.path[0])).sort();

describe("schemaCoordonnees", () => {
  it("rend les coordonnées actuelles du site", () => {
    expect(schemaCoordonnees.parse(coordonnees)).toEqual({ contact: reglagesInitiaux.contact });
  });

  it("garde un téléphone saisi", () => {
    expect(schemaCoordonnees.parse({ ...coordonnees, telephone: " +221 33 824 00 00 " }).contact.phone).toBe("+221 33 824 00 00");
  });

  it("refuse un email invalide et un téléphone fantaisiste", () => {
    const r = schemaCoordonnees.safeParse({ ...coordonnees, email: "pas-une-adresse", telephone: "appelez-nous" });
    expect(r.success).toBe(false);
    expect(champsEnErreur(r)).toEqual(["email", "telephone"]);
  });

  it("exige le contact presse et l'adresse", () => {
    const r = schemaCoordonnees.safeParse({ ...coordonnees, presseNom: " ", pays: "" });
    expect(champsEnErreur(r)).toEqual(["pays", "presseNom"]);
  });

  it("refuse une version malformée", () => {
    expect(schemaCoordonnees.safeParse({ ...coordonnees, version: "hier" }).success).toBe(false);
  });
});

describe("schemaReseaux", () => {
  const json = (v: unknown) => JSON.stringify(v);

  it("accepte les réseaux actuels du site", () => {
    expect(schemaReseaux.parse({ reseaux: json(reglagesInitiaux.reseaux) }).reseaux).toEqual(reglagesInitiaux.reseaux);
  });

  it("refuse une adresse qui n'est pas en https, sur l'élément fautif", () => {
    for (const url of ["http://exemple.com", "javascript:alert(1)", "exemple.com"]) {
      const r = schemaReseaux.safeParse({ reseaux: json([{ label: "YouTube", url: "https://www.youtube.com/@ADEMIG-SN" }, { label: "X", url }]) });
      expect(r.success, url).toBe(false);
      expect(r.error!.issues[0].path, url).toEqual(["reseaux", 1, "url"]);
    }
  });

  it("refuse deux réseaux du même nom et un JSON illisible", () => {
    const doublon = schemaReseaux.safeParse({
      reseaux: json([
        { label: "LinkedIn", url: "https://a.sn" },
        { label: "linkedin ", url: "https://b.sn" },
      ]),
    });
    expect(doublon.error!.issues[0].message).toBe("Deux réseaux portent le même nom.");
    expect(schemaReseaux.safeParse({ reseaux: "[{" }).success).toBe(false);
  });
});

describe("schemaTextes", () => {
  it("n'enregistre que les textes modifiés", () => {
    const r = schemaTextes.parse({
      "accueil.accroche": TEXTES["accueil.accroche"].defaut,
      "amicale.intro": " Nouvelle intro ",
      version: "2026-10-11T10:00:00.000Z",
    });
    expect(r).toEqual({ version: "2026-10-11T10:00:00.000Z", textes: { "amicale.intro": "Nouvelle intro" } });
  });

  it("refuse une clé inconnue", () => {
    expect(schemaTextes.safeParse({ "accueil.inconnu": "x" }).success).toBe(false);
  });

  it("refuse un texte trop long, sur son champ", () => {
    const { max } = TEXTES["amicale.intro"];
    const r = schemaTextes.safeParse({ "amicale.intro": "x".repeat(max + 1) });
    expect(r.error!.issues[0].path).toEqual(["amicale.intro"]);
    expect(r.error!.issues[0].message).toBe(`${max} caractères au plus.`);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/validation/reglages.test.ts`
Expected: FAIL, « Failed to resolve import "./reglages" ».

- [ ] **Step 3: Write minimal implementation**

Créer `src/lib/validation/reglages.ts` :

```ts
import { z } from "zod";
import { CLES_TEXTES, type CleTexte, normaliserTexte, TEXTES, textesAEnregistrer } from "@/lib/content/textes";
import { champJson } from "./commun";

// La version est relue en SQL (::timestamptz) : on refuse tout ce qui n'est pas une date ISO.
const version = z.iso.datetime().optional();

const requis = (message: string, max: number) => z.string().trim().min(1, message).max(max, `${max} caractères au plus.`);

const FORMAT_TELEPHONE = /^\+?[0-9][0-9 .()-]{5,24}$/;
const MESSAGE_TELEPHONE = "Numéro invalide (ex. : +221 77 552 52 25).";

export const schemaCoordonnees = z
  .object({
    email: z.string().trim().max(120, "120 caractères au plus.").pipe(z.email("Adresse email invalide.")),
    // Facultatif : un champ vide donne null.
    telephone: z
      .string()
      .optional()
      .transform((v) => v?.trim() || null)
      .pipe(z.string().regex(FORMAT_TELEPHONE, MESSAGE_TELEPHONE).nullable()),
    presseNom: requis("Indiquez le nom du contact presse.", 120),
    presseTelephone: z.string().trim().regex(FORMAT_TELEPHONE, MESSAGE_TELEPHONE),
    rue: requis("Indiquez la rue.", 200),
    boitePostale: requis("Indiquez la boîte postale.", 80),
    ville: requis("Indiquez la ville.", 80),
    pays: requis("Indiquez le pays.", 80),
    version,
  })
  .transform(({ version, email, telephone, presseNom, presseTelephone, rue, boitePostale, ville, pays }) => ({
    version,
    contact: {
      email,
      phone: telephone,
      press: { name: presseNom, phone: presseTelephone },
      address: { street: rue, postalBox: boitePostale, city: ville, country: pays },
    },
  }));

const reseau = z.object({
  label: z.string().trim().min(1, "Nommez chaque réseau.").max(40, "40 caractères au plus."),
  url: z.string().trim().pipe(z.url({ protocol: /^https$/, error: "Adresse invalide : elle doit commencer par https://." })),
});

export const schemaReseaux = z.object({
  reseaux: champJson(
    z
      .array(reseau)
      .max(12, "12 réseaux au plus.")
      .refine((liste) => new Set(liste.map((r) => r.label.toLowerCase())).size === liste.length, "Deux réseaux portent le même nom."),
  ),
  version,
});

function champTexte(cle: CleTexte) {
  const { max } = TEXTES[cle];
  return z
    .string()
    .default("")
    .transform((v) => normaliserTexte(cle, v))
    .pipe(z.string().max(max, `${max} caractères au plus.`));
}

// Objet strict : une clé hors du catalogue est refusée, jamais stockée.
export const schemaTextes = z
  .strictObject({ ...Object.fromEntries(CLES_TEXTES.map((cle) => [cle, champTexte(cle)])), version })
  .transform(({ version, ...saisie }) => ({ version, textes: textesAEnregistrer(saisie as Partial<Record<CleTexte, string>>) }));
```

Note : si TypeScript infère mal le type de sortie du `strictObject` construit par `Object.fromEntries`, typer la forme explicitement : `const forme = Object.fromEntries(…) as Record<CleTexte, ReturnType<typeof champTexte>>;` puis `z.strictObject({ ...forme, version })`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/validation/reglages.test.ts && npx tsc --noEmit`
Expected: PASS (11 tests), aucune erreur de type.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/reglages.ts src/lib/validation/reglages.test.ts
git commit -m "Validation des réglages : coordonnées, réseaux en https, textes du catalogue seulement"
```

---

### Task 4: Écriture et lecture des réglages

**Files:**
- Create: `src/db/operations/reglages.ts`
- Create: `src/db/requetes/admin/reglages.ts`
- Test: `src/db/operations/reglages.test.ts`

**Interfaces:**
- Consumes: `CONFLIT`, `memeVersion` (`src/db/operations/commun.ts`) ; `ErreurMetier` ; `reglagesInitiaux` (`src/db/donnees-initiales/reglages.ts`) ; table `reglages` ; type `Reglages`.
- Produces:
  - `type PartieReglages = Partial<Reglages>` et `modifierReglages(db: Db, partie: PartieReglages, o: { version: string | null }): Promise<{ version: string }>` — lève `ErreurMetier(CONFLIT)` si la version ne correspond plus, ou si `version` est `null` alors que la ligne existe déjà.
  - `type ReglagesAdmin = Reglages & { version: string | null }` et `lireReglagesAdmin(db: Db): Promise<ReglagesAdmin>` — `version: null` quand la ligne n'existe pas.

- [ ] **Step 1: Write the failing test**

Créer `src/db/operations/reglages.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import { lireReglagesAdmin } from "@/db/requetes/admin/reglages";
import { lireReglages } from "@/db/requetes/reglages";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { CONFLIT } from "./commun";
import { modifierReglages } from "./reglages";

const PERIMEE = "2020-01-01T00:00:00.000Z";

describe("réglages", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("sans ligne en base, lit les valeurs d'origine puis crée la ligne au premier enregistrement", async () => {
    expect(await lireReglagesAdmin(db)).toEqual({ ...reglagesInitiaux, version: null });
    const { version } = await modifierReglages(db, { textes: { "amicale.intro": "Intro" } }, { version: null });
    expect(await lireReglagesAdmin(db)).toEqual({ ...reglagesInitiaux, textes: { "amicale.intro": "Intro" }, version });
  });

  it("refuse une seconde création : quelqu'un a enregistré entre-temps", async () => {
    await modifierReglages(db, { reseaux: [] }, { version: null });
    await expect(modifierReglages(db, { reseaux: [] }, { version: null })).rejects.toThrow(CONFLIT);
  });

  it("n'écrit que la partie envoyée, et le site public la lit", async () => {
    const { version } = await modifierReglages(db, { textes: {} }, { version: null });
    const nouveau = await modifierReglages(db, { textes: { "accueil.accroche": "Titre" } }, { version });
    expect(nouveau.version).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await lireReglages(db)).toEqual({ ...reglagesInitiaux, textes: { "accueil.accroche": "Titre" } });
    const lu = await lireReglagesAdmin(db);
    expect(lu.version).toBe(nouveau.version);
  });

  it("refuse une version périmée sans rien écrire", async () => {
    await modifierReglages(db, { textes: {} }, { version: null });
    const contact = { ...reglagesInitiaux.contact, email: "autre@ademig.sn" };
    await expect(modifierReglages(db, { contact }, { version: PERIMEE })).rejects.toThrow(CONFLIT);
    expect((await lireReglages(db)).contact).toEqual(reglagesInitiaux.contact);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/db/operations/reglages.test.ts`
Expected: FAIL, « Failed to resolve import "@/db/requetes/admin/reglages" ».

- [ ] **Step 3: Write minimal implementation**

Créer `src/db/operations/reglages.ts` :

```ts
import { and, eq } from "drizzle-orm";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import { reglages } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Reglages } from "@/lib/content/types";
import { CONFLIT, memeVersion } from "./commun";
import { ErreurMetier } from "./erreurs";

// Chaque onglet n'écrit que sa colonne ; la version de l'unique ligne les protège toutes.
export type PartieReglages = Partial<Reglages>;

export async function modifierReglages(db: Db, partie: PartieReglages, o: { version: string | null }): Promise<{ version: string }> {
  const [ligne] = o.version
    ? await db
        .update(reglages)
        .set(partie)
        .where(and(eq(reglages.id, 1), memeVersion(reglages.majLe, o.version)))
        .returning({ majLe: reglages.majLe })
    : // Sans ligne en base (seed jamais lancé), le premier enregistrement la crée à partir des valeurs d'origine.
      await db
        .insert(reglages)
        .values({ id: 1, ...reglagesInitiaux, ...partie })
        .onConflictDoNothing()
        .returning({ majLe: reglages.majLe });
  if (!ligne) throw new ErreurMetier(CONFLIT);
  return { version: ligne.majLe.toISOString() };
}
```

Créer `src/db/requetes/admin/reglages.ts` :

```ts
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import type { Db } from "@/db/types";
import type { Reglages } from "@/lib/content/types";

// Version null : la ligne n'existe pas encore, le premier enregistrement la créera.
export type ReglagesAdmin = Reglages & { version: string | null };

export async function lireReglagesAdmin(db: Db): Promise<ReglagesAdmin> {
  const ligne = await db.query.reglages.findFirst();
  if (!ligne) return { ...reglagesInitiaux, version: null };
  return { contact: ligne.contact, reseaux: ligne.reseaux, textes: ligne.textes, version: ligne.majLe.toISOString() };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/db/operations/reglages.test.ts src/db/requetes/requetes.test.ts`
Expected: PASS (les 4 nouveaux tests, et « rend les réglages initiaux » toujours vert).

- [ ] **Step 5: Commit**

```bash
git add src/db/operations/reglages.ts src/db/operations/reglages.test.ts src/db/requetes/admin/reglages.ts
git commit -m "Réglages : écriture d'une partie sous contrôle de version, création de la ligne si elle manque"
```

---

### Task 5: Server Actions des réglages

**Files:**
- Create: `src/lib/admin/reglages.ts`
- Test: `src/lib/admin/reglages.test.ts`

**Interfaces:**
- Consumes: `action` ; `lireFormulaire`, `Resultat` ; `modifierReglages`, `PartieReglages` (tâche 4) ; `schemaCoordonnees`, `schemaReseaux`, `schemaTextes` (tâche 3) ; `TAGS.reglages`.
- Produces (fichier `"use server"`, signatures compatibles avec `useFormulaire`) :
  - `type ResultatReglages = Resultat<{ version: string }>`
  - `enregistrerCoordonnees(_etat: ResultatReglages | null, donnees: FormData): Promise<ResultatReglages>` — message « Coordonnées enregistrées. »
  - `enregistrerReseaux(…)` — « Réseaux enregistrés. »
  - `enregistrerTextes(…)` — « Textes enregistrés. »

- [ ] **Step 1: Write the failing test**

Créer `src/lib/admin/reglages.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CONFLIT } from "@/db/operations/commun";
import { ErreurMetier } from "@/db/operations/erreurs";
import { TEXTES } from "@/lib/content/textes";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ modifierReglages: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/reglages", () => ops);
vi.mock("next/cache", () => cache);

import { enregistrerCoordonnees, enregistrerReseaux, enregistrerTextes } from "./reglages";

const VERSION = "2026-10-11T10:00:00.000Z";
const NOUVELLE = "2026-10-11T11:00:00.000Z";
const coordonnees = {
  email: "contact@ademig.sn",
  presseNom: "Birama Ndoye",
  presseTelephone: "+221 77 552 52 25",
  rue: "ENSMG",
  boitePostale: "BP 5396 Dakar-Fann",
  ville: "Dakar",
  pays: "Sénégal",
};

function formulaire(champs: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(champs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await enregistrerCoordonnees(null, formulaire({ ...coordonnees, version: VERSION }))).toEqual(refus);
    expect(await enregistrerReseaux(null, formulaire({ reseaux: "[]", version: VERSION }))).toEqual(refus);
    expect(await enregistrerTextes(null, formulaire({ version: VERSION }))).toEqual(refus);
    expect(ops.modifierReglages).not.toHaveBeenCalled();
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => {
    exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" });
    ops.modifierReglages.mockResolvedValue({ version: NOUVELLE });
  });

  it("enregistre les coordonnées, invalide le cache et renvoie la nouvelle version", async () => {
    const r = await enregistrerCoordonnees(null, formulaire({ ...coordonnees, version: VERSION }));
    expect(r).toEqual({ ok: true, message: "Coordonnées enregistrées.", donnees: { version: NOUVELLE } });
    expect(ops.modifierReglages).toHaveBeenCalledWith(
      {},
      { contact: expect.objectContaining({ email: "contact@ademig.sn", phone: null }) },
      { version: VERSION },
    );
    expect(cache.revalidateTag).toHaveBeenCalledWith("reglages", { expire: 0 });
    expect(cache.revalidatePath).toHaveBeenCalledWith("/admin/reglages");
  });

  it("une saisie invalide renvoie les erreurs par champ sans écrire", async () => {
    const r = await enregistrerCoordonnees(null, formulaire({ ...coordonnees, email: "x", version: VERSION }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erreurs?.email).toEqual(["Adresse email invalide."]);
    expect(ops.modifierReglages).not.toHaveBeenCalled();
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("sans version, demande la création de la ligne", async () => {
    await enregistrerReseaux(null, formulaire({ reseaux: "[]" }));
    expect(ops.modifierReglages).toHaveBeenCalledWith({}, { reseaux: [] }, { version: null });
  });

  it("un texte remis à l'origine n'est pas enregistré", async () => {
    const r = await enregistrerTextes(null, formulaire({ "accueil.accroche": TEXTES["accueil.accroche"].defaut, version: VERSION }));
    expect(r).toEqual({ ok: true, message: "Textes enregistrés.", donnees: { version: NOUVELLE } });
    expect(ops.modifierReglages).toHaveBeenCalledWith({}, { textes: {} }, { version: VERSION });
  });

  it("un conflit de version devient un message", async () => {
    ops.modifierReglages.mockRejectedValue(new ErreurMetier(CONFLIT));
    expect(await enregistrerTextes(null, formulaire({ version: VERSION }))).toEqual({ ok: false, message: CONFLIT });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/admin/reglages.test.ts`
Expected: FAIL, « Failed to resolve import "./reglages" ».

- [ ] **Step 3: Write minimal implementation**

Créer `src/lib/admin/reglages.ts` :

```ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { z } from "zod";
import { db } from "@/db";
import { modifierReglages, type PartieReglages } from "@/db/operations/reglages";
import { action } from "@/lib/admin/action";
import { lireFormulaire, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaCoordonnees, schemaReseaux, schemaTextes } from "@/lib/validation/reglages";

export type ResultatReglages = Resultat<{ version: string }>;

// Les trois onglets suivent le même chemin : validation, écriture de leur seule partie, invalidation.
function enregistrer(schema: z.ZodType<PartieReglages & { version?: string }>, donnees: FormData, message: string) {
  return action<{ version: string }>("editeur", async () => {
    const saisie = lireFormulaire(schema, donnees);
    if (!saisie.ok) return saisie.resultat;
    const { version, ...partie } = saisie.data;
    // Sans version, la ligne n'existait pas à l'affichage : l'opération la crée, ou signale le conflit.
    const r = await modifierReglages(db, partie, { version: version ?? null });
    revalidateTag(TAGS.reglages, { expire: 0 });
    revalidatePath("/admin/reglages");
    return { ok: true, message, donnees: { version: r.version } };
  });
}

export async function enregistrerCoordonnees(_etat: ResultatReglages | null, donnees: FormData): Promise<ResultatReglages> {
  return enregistrer(schemaCoordonnees, donnees, "Coordonnées enregistrées.");
}

export async function enregistrerReseaux(_etat: ResultatReglages | null, donnees: FormData): Promise<ResultatReglages> {
  return enregistrer(schemaReseaux, donnees, "Réseaux enregistrés.");
}

export async function enregistrerTextes(_etat: ResultatReglages | null, donnees: FormData): Promise<ResultatReglages> {
  return enregistrer(schemaTextes, donnees, "Textes enregistrés.");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/admin/reglages.test.ts && npx tsc --noEmit`
Expected: PASS (6 tests), aucune erreur de type.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/reglages.ts src/lib/admin/reglages.test.ts
git commit -m "Server Actions des réglages : coordonnées, réseaux et textes"
```

---

### Task 6: Écran des réglages, fin de la page « Bientôt disponible », tableau de bord

**Files:**
- Create: `src/app/admin/(espace)/reglages/page.tsx`
- Create: `src/app/admin/(espace)/reglages/coordonnees.tsx`
- Create: `src/app/admin/(espace)/reglages/reseaux.tsx`
- Create: `src/app/admin/(espace)/reglages/textes.tsx`
- Delete: `src/app/admin/(espace)/[rubrique]/page.tsx`
- Modify: `src/app/admin/(espace)/page.tsx`

**Interfaces:**
- Consumes: `lireReglagesAdmin`, `ReglagesAdmin` (tâche 4) ; `enregistrerCoordonnees`, `enregistrerReseaux`, `enregistrerTextes` (tâche 5) ; `TEXTES`, `CLES_TEXTES`, `CleTexte`, `fusionnerTextes`, `normaliserTexte` (tâche 1) ; `useFormulaire`, `ListeEditable`, `Alerte`, `Badge`, `Bouton`, `Champ`, `ZoneTexte`, `TitrePage` (existants).
- Produces: les libellés que l'e2e (tâche 7) utilise :
  - liens d'onglet « Coordonnées », « Réseaux sociaux », « Textes du site » (`aria-current="page"` sur l'onglet ouvert) ;
  - champs « Email de contact », « Téléphone », « Nom du contact presse », « Téléphone du contact presse », « Rue », « Boîte postale », « Ville », « Pays » ;
  - liste « Réseaux sociaux », bouton « Ajouter un réseau », champs « Nom du réseau » et « Adresse » ;
  - un champ par texte, libellé `TEXTES[cle].libelle`, et un bouton « Rétablir le texte d'origine » dont le nom accessible est `Rétablir le texte d'origine : <libellé>` ;
  - bouton « Enregistrer » dans chaque onglet.

- [ ] **Step 1: Page à onglets**

Créer `src/app/admin/(espace)/reglages/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireReglagesAdmin } from "@/db/requetes/admin/reglages";
import { exigerSession } from "@/lib/session";
import { FormulaireCoordonnees } from "./coordonnees";
import { FormulaireReseaux } from "./reseaux";
import { FormulaireTextes } from "./textes";

export const metadata: Metadata = { title: "Réglages" };

const ONGLETS = [
  { valeur: "coordonnees", libelle: "Coordonnées" },
  { valeur: "reseaux", libelle: "Réseaux sociaux" },
  { valeur: "textes", libelle: "Textes du site" },
] as const;

// Chaque onglet est une page à part : en changer recharge la version à jour de la ligne.
export default async function Reglages({ searchParams }: PageProps<"/admin/reglages">) {
  await exigerSession();
  const { onglet: demande } = await searchParams;
  const onglet = ONGLETS.find((o) => o.valeur === demande)?.valeur ?? "coordonnees";
  const reglages = await lireReglagesAdmin(db);

  return (
    <>
      <TitrePage>Réglages</TitrePage>
      <nav aria-label="Rubriques des réglages" className="mb-8 flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <Link
            key={o.valeur}
            href={`/admin/reglages?onglet=${o.valeur}`}
            aria-current={o.valeur === onglet ? "page" : undefined}
            className={`inline-flex min-h-11 items-center border-[1.5px] border-encre px-4 py-2 font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-moutarde ${
              o.valeur === onglet ? "bg-encre text-papier" : "bg-papier hover:bg-sable"
            }`}
          >
            {o.libelle}
          </Link>
        ))}
      </nav>
      {onglet === "coordonnees" && <FormulaireCoordonnees contact={reglages.contact} version={reglages.version} />}
      {onglet === "reseaux" && <FormulaireReseaux reseaux={reglages.reseaux} version={reglages.version} />}
      {onglet === "textes" && <FormulaireTextes textes={reglages.textes} version={reglages.version} />}
    </>
  );
}
```

- [ ] **Step 2: Formulaire des coordonnées**

Créer `src/app/admin/(espace)/reglages/coordonnees.tsx` :

```tsx
"use client";

import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { enregistrerCoordonnees } from "@/lib/admin/reglages";
import type { Contact } from "@/lib/content/types";

export function FormulaireCoordonnees({ contact, version: versionInitiale }: { contact: Contact; version: string | null }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(enregistrerCoordonnees);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || versionInitiale;

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="max-w-2xl space-y-6">
      <Alerte resultat={resultat} />
      {version && <input type="hidden" name="version" value={version} />}
      <Champ
        label="Email de contact"
        name="email"
        type="email"
        defaultValue={contact.email}
        aide="Affiché dans l'en-tête, le pied de page et la page Contact."
        erreurs={erreurs?.email}
        required
      />
      <Champ label="Téléphone" name="telephone" type="tel" defaultValue={contact.phone ?? ""} aide="Facultatif." erreurs={erreurs?.telephone} />
      <fieldset className="space-y-4 border-[1.5px] border-encre p-4">
        <legend className="px-1 font-bold">Contact presse</legend>
        <Champ label="Nom du contact presse" name="presseNom" defaultValue={contact.press.name} erreurs={erreurs?.presseNom} required />
        <Champ label="Téléphone du contact presse" name="presseTelephone" type="tel" defaultValue={contact.press.phone} erreurs={erreurs?.presseTelephone} required />
      </fieldset>
      <fieldset className="space-y-4 border-[1.5px] border-encre p-4">
        <legend className="px-1 font-bold">Adresse</legend>
        <Champ label="Rue" name="rue" defaultValue={contact.address.street} erreurs={erreurs?.rue} required />
        <Champ label="Boîte postale" name="boitePostale" defaultValue={contact.address.postalBox} erreurs={erreurs?.boitePostale} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Champ label="Ville" name="ville" defaultValue={contact.address.city} erreurs={erreurs?.ville} required />
          <Champ label="Pays" name="pays" defaultValue={contact.address.country} erreurs={erreurs?.pays} required />
        </div>
      </fieldset>
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}
```

- [ ] **Step 3: Formulaire des réseaux**

Créer `src/app/admin/(espace)/reglages/reseaux.tsx` :

```tsx
"use client";

import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { enregistrerReseaux } from "@/lib/admin/reglages";
import type { Reseau } from "@/lib/content/types";

export function FormulaireReseaux({ reseaux, version: versionInitiale }: { reseaux: Reseau[]; version: string | null }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(enregistrerReseaux);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || versionInitiale;

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="max-w-3xl space-y-6">
      <Alerte resultat={resultat} />
      {version && <input type="hidden" name="version" value={version} />}
      <p>
        L&apos;ordre de cette liste est celui des liens du pied de page et de la page Contact. Chaque adresse commence par
        https://.
      </p>
      <ListeEditable
        libelle="Réseaux sociaux"
        name="reseaux"
        valeurInitiale={reseaux}
        nouvelElement={() => ({ label: "", url: "" })}
        libelleAjout="Ajouter un réseau"
        erreurs={erreurs?.reseaux}
        rendu={(r, modifier, _i, idElement) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`${idElement}-label`} label="Nom du réseau" name={`${idElement}-label`} form="" value={r.label} onChange={(e) => modifier({ label: e.target.value })} />
            <Champ id={`${idElement}-url`} label="Adresse" name={`${idElement}-url`} form="" type="url" value={r.url} onChange={(e) => modifier({ url: e.target.value })} />
          </div>
        )}
      />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}
```

- [ ] **Step 4: Formulaire des textes**

Créer `src/app/admin/(espace)/reglages/textes.tsx` :

```tsx
"use client";

import { useState } from "react";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Badge, Bouton, Champ, ZoneTexte } from "@/components/admin/ui";
import { enregistrerTextes } from "@/lib/admin/reglages";
import { CLES_TEXTES, type CleTexte, fusionnerTextes, normaliserTexte, TEXTES } from "@/lib/content/textes";

const GROUPES = [...new Set(CLES_TEXTES.map((cle) => TEXTES[cle].groupe))];

// Chaque champ montre le texte affiché sur le site ; un texte égal à l'origine, ou vide, n'est pas stocké.
export function FormulaireTextes({ textes, version: versionInitiale }: { textes: Record<string, string>; version: string | null }) {
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(enregistrerTextes);
  const [valeurs, setValeurs] = useState(() => fusionnerTextes(textes));
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || versionInitiale;

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="max-w-3xl space-y-10">
      <Alerte resultat={resultat} />
      {version && <input type="hidden" name="version" value={version} />}
      <p>
        Ces textes apparaissent sur les pages Accueil et L&apos;Amicale. Texte brut seulement ; un champ laissé vide
        reprend le texte d&apos;origine.
      </p>
      {GROUPES.map((groupe) => (
        <fieldset key={groupe} className="space-y-8">
          <legend className="font-titre mb-4 text-2xl">{groupe}</legend>
          {CLES_TEXTES.filter((cle) => TEXTES[cle].groupe === groupe).map((cle) => (
            <ChampTexte
              key={cle}
              cle={cle}
              valeur={valeurs[cle]}
              erreurs={erreurs?.[cle]}
              onChange={(valeur) => setValeurs((actuelles) => ({ ...actuelles, [cle]: valeur }))}
            />
          ))}
        </fieldset>
      ))}
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}

function ChampTexte({ cle, valeur, erreurs, onChange }: { cle: CleTexte; valeur: string; erreurs?: string[]; onChange: (valeur: string) => void }) {
  const { libelle, forme, max, defaut } = TEXTES[cle];
  const texte = normaliserTexte(cle, valeur);
  const etat = texte === defaut ? "origine" : texte === "" ? "vide" : "modifie";
  const aide = [
    `Jusqu'à ${max} caractères.`,
    etat === "modifie" && `Texte d'origine : ${defaut}`,
    etat === "vide" && "Laissé vide, le texte d'origine sera affiché.",
  ]
    .filter(Boolean)
    .join(" ");
  const id = `texte-${cle.replaceAll(".", "-")}`;

  return (
    <div>
      {forme === "ligne" ? (
        <Champ id={id} label={libelle} name={cle} value={valeur} aide={aide} erreurs={erreurs} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <ZoneTexte id={id} label={libelle} name={cle} value={valeur} aide={aide} erreurs={erreurs} rows={max > 400 ? 6 : 3} onChange={(e) => onChange(e.target.value)} />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {etat === "modifie" && <Badge ton="moutarde">Modifié</Badge>}
        <Bouton
          type="button"
          variante="secondaire"
          disabled={etat === "origine"}
          onClick={() => onChange(defaut)}
          aria-label={`Rétablir le texte d'origine : ${libelle}`}
        >
          Rétablir le texte d&apos;origine
        </Bouton>
      </div>
    </div>
  );
}
```

Note : pas d'attribut `maxLength` sur les champs (le navigateur tronquerait un collage sans prévenir) ; la limite est annoncée par l'aide et vérifiée par le serveur.

- [ ] **Step 5: Supprimer la page générique et mettre à jour le tableau de bord**

```bash
git rm "src/app/admin/(espace)/[rubrique]/page.tsx"
```

Dans `src/app/admin/(espace)/page.tsx`, remplacer la constante `raccourcis` par :

```ts
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
```

et supprimer le paragraphe final « Les actualités, les événements, … dans la prochaine étape du back office. » (tout le `<p className="mt-10 max-w-2xl">…</p>`).

- [ ] **Step 6: Vérifier**

Run: `npx tsc --noEmit && npx eslint src && npm test`
Expected: aucune erreur ; tous les tests passent. (Si `PageProps<"/admin/reglages">` est inconnu, lancer `npx next typegen` puis relancer.)

Puis, avec `npx next dev -p 3100` et une session d'éditeur :
- `/admin/reglages` ouvre l'onglet Coordonnées, préremplis avec les valeurs actuelles ; les trois onglets se parcourent au clavier et l'onglet ouvert est signalé ;
- dans Textes du site, modifier un champ affiche « Modifié » et l'aide « Texte d'origine : … » ; « Rétablir le texte d'origine » remet le texte et se désactive ; **ne pas enregistrer** (base partagée avec la production) ;
- à 360 px de large, aucun défilement horizontal ;
- `/admin/inconnu` renvoie la page 404 ; le tableau de bord montre les nouveaux raccourcis et plus le paragraphe « prochaine étape ».

- [ ] **Step 7: Commit**

```bash
git add "src/app/admin/(espace)/reglages" "src/app/admin/(espace)/page.tsx"
git commit -m "Écran des réglages à onglets ; fin de la page « Bientôt disponible » ; raccourcis du tableau de bord"
```

---

### Task 7: Parcours de bout en bout des réglages

**Files:**
- Create: `e2e/reglages.spec.ts`
- Modify: `e2e/nettoyage.ts`
- Modify: `e2e/preparation.ts`

**Interfaces:**
- Consumes: les libellés produits par la tâche 6 ; `COMPTES`, `seConnecterEtAttendre` (`e2e/comptes.ts`).
- Produces: `retirerTextesDeTest(): Promise<void>` exporté par `e2e/nettoyage.ts`, appelé aussi par `e2e/preparation.ts`.

- [ ] **Step 1: Nettoyage des textes de test**

Dans `e2e/nettoyage.ts`, ajouter `reglages` à l'import du schéma, `sql` à l'import de drizzle-orm, puis :

```ts
// Textes de test (« E2E … ») retirés des réglages : le site garde ses textes réels, même après un échec.
export async function retirerTextesDeTest() {
  await db
    .update(reglages)
    .set({
      textes: sql`(select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) from jsonb_each(${reglages.textes}) where value #>> '{}' not like 'E2E %')`,
    })
    .where(sql`${reglages.textes}::text like '%"E2E %'`);
}
```

et l'appeler dans `nettoyage()` juste avant la suppression des comptes : `await retirerTextesDeTest();`.

Dans `e2e/preparation.ts`, importer `import { retirerTextesDeTest } from "./nettoyage";` et appeler `await retirerTextesDeTest();` juste après la suppression des partenaires `E2E %`.

- [ ] **Step 2: Écrire le parcours**

Créer `e2e/reglages.spec.ts` :

```ts
import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

// Base partagée avec la production : on n'enregistre une valeur différente que sur une base dédiée.
const baseDediee = process.env.E2E_BASE_DEDIEE === "1";
const INTRO = "Les ingénieurs formés à Dakar aux métiers des mines et de la géologie";

test.beforeEach(async ({ page }) => {
  // Une saisie non enregistrée déclenche l'avertissement de sortie : on l'accepte.
  page.on("dialog", (d) => d.accept());
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
});

test("les coordonnées et les réseaux refusent une saisie invalide sans rien écrire", async ({ page }) => {
  await page.goto("/admin/reglages");
  await expect(page.getByRole("link", { name: "Coordonnées" })).toHaveAttribute("aria-current", "page");
  const email = page.getByLabel("Email de contact");
  const emailActuel = await email.inputValue();

  await email.fill("pas-une-adresse");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Adresse email invalide.").first()).toBeVisible();
  await expect(email).toHaveValue("pas-une-adresse");
  await page.goto("/admin/reglages");
  await expect(page.getByLabel("Email de contact")).toHaveValue(emailActuel);

  // Réseaux : une adresse en http:// est refusée, et le message dit quel élément corriger.
  await page.getByRole("link", { name: "Réseaux sociaux" }).click();
  await expect(page.getByRole("link", { name: "Réseaux sociaux" })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Ajouter un réseau" }).click();
  const rang = await page.getByLabel("Nom du réseau").count();
  await page.getByLabel("Nom du réseau").last().fill("E2E Réseau");
  await page.getByLabel("Adresse", { exact: true }).last().fill("http://exemple.com");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(`Élément ${rang} : Adresse invalide : elle doit commencer par https://.`)).toBeVisible();
  await page.goto("/admin/reglages?onglet=reseaux");
  await expect(page.getByLabel("Nom du réseau")).toHaveCount(rang - 1);
});

test("un texte du site se corrige, se rétablit et reste dans sa limite", async ({ page }) => {
  await page.goto("/admin/reglages?onglet=textes");
  const intro = page.getByLabel("En-tête : introduction");
  const rétablir = page.getByRole("button", { name: "Rétablir le texte d'origine : En-tête : introduction" });

  // Enregistrer sans rien changer : aucun texte n'est modifié, mais le formulaire réel passe la validation stricte.
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Textes enregistrés." })).toBeVisible();

  // Trop long : erreur sous le champ, saisie conservée.
  await intro.fill("x".repeat(161));
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("160 caractères au plus.")).toBeVisible();
  await expect(intro).toHaveValue("x".repeat(161));

  // Rétablir remet le texte d'origine dans le champ, sans enregistrer.
  await rétablir.click();
  await expect(intro).toHaveValue(INTRO);
  await expect(rétablir).toBeDisabled();

  if (baseDediee) {
    await intro.fill("E2E Introduction de test");
    await expect(page.getByText("Modifié", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Textes enregistrés." })).toBeVisible();
    await page.goto("/amicale");
    await expect(page.getByText("E2E Introduction de test")).toBeVisible();

    await page.goto("/admin/reglages?onglet=textes");
    await rétablir.click();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Textes enregistrés." })).toBeVisible();
    await page.goto("/amicale");
    await expect(page.getByText(INTRO)).toBeVisible();
  }
});
```

Note : le premier « Enregistrer » sans changement réécrit les textes déjà en place à l'identique (seule `maj_le` change). C'est sans effet visible sur la production, et c'est le seul moyen de vérifier, sur la base partagée, que le formulaire réel n'envoie aucun champ que `schemaTextes` refuserait. L'assertion `rétablir` désactivé suppose que le texte d'origine est affiché après le clic, ce qui est vrai quel que soit le texte en base.

- [ ] **Step 3: Lancer les parcours**

Run: `E2E_AUTORISE=1 npx playwright test e2e/reglages.spec.ts`
Expected: 2 tests PASS.

Puis vérifier qu'aucun texte de test ne reste :

```bash
node --env-file=.env.local --import tsx --input-type=module -e 'import { db } from "./src/db"; const r = await db.query.reglages.findFirst(); console.log(JSON.stringify(r?.textes)); process.exit(0);'
```

Expected: aucune valeur qui commence par `E2E ` (en production aujourd'hui : `{}`).

- [ ] **Step 4: Commit**

```bash
git add e2e/reglages.spec.ts e2e/nettoyage.ts e2e/preparation.ts
git commit -m "E2E : réglages invalides refusés, texte corrigé puis rétabli, textes de test nettoyés"
```

---

### Task 8: Vérification finale du lot

- [ ] **Step 1: Suite complète**

Run: `npx eslint . && npx tsc --noEmit && npm test && npm run build && E2E_AUTORISE=1 npm run test:e2e`
Expected: tout passe. Dans le build, `/` et `/amicale` restent statiques (○ ou ISR), pas dynamiques.

- [ ] **Step 2: Non-régression du site public**

Avec `npx next dev -p 3100`, ouvrir `/`, `/amicale`, `/contact` et le pied de page de n'importe quelle page : textes, coordonnées et réseaux identiques à `main`, aucune erreur dans la console.

- [ ] **Step 3: Données de test**

Les réglages en base ne contiennent aucun texte `E2E …`, aucun réseau `E2E Réseau`, et l'email de contact est inchangé. Il ne reste aucun compte `@ademig.test`.

- [ ] **Step 4: Point ouvert du lot 3**

Vérifier sur la production que `/bureau` affiche « Élu le 22 septembre 2024 ». Sinon, le signaler à l'utilisateur (clé de cache `["bureau"]` de `getBureau`, `src/lib/content/organisation.ts`).

- [ ] **Step 5: Rapport**

Faire le point avec l'utilisateur. L'ouverture de la PR se décide avec lui (skill finishing-a-development-branch).
