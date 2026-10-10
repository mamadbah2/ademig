# Back office ADEMIG — Sous-projet 2, lot 1 : socle et actualités — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer le socle commun des formulaires de contenu (éditeur riche, listes éditables, choix d'images, barre de publication, aperçu par Draft Mode) et la gestion complète des actualités dans `/admin`.

**Architecture:** Chaque contenu suit la même chaîne : schéma Zod (`src/lib/validation`) → Server Action (`src/lib/admin`, via `action()`) → opération pure testée sur PGlite (`src/db/operations`) → `revalidateTag`. Les écrans de l'admin sont des Server Components qui lisent `src/db/requetes/admin` et passent des données sérialisables à un formulaire client. L'aperçu passe par le Draft Mode de Next, et un brouillon n'est lu que si le Draft Mode est actif **et** qu'une session admin existe.

**Tech Stack:** Next.js 16.3 (App Router, Server Actions), React 19.2, Drizzle 0.45 (Neon / PGlite), Zod 4, Tiptap 3, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-back-office-contenus-design.md`. Les lots 2 (événements, partenaires), 3 (membres, bureau) et 4 (réglages, textes) auront chacun leur plan, écrit après la fusion de ce lot pour réutiliser ses composants tels qu'ils auront été livrés.

## Global Constraints

- Lire avant de coder les guides Next 16 de `node_modules/next/dist/docs/` : draft-mode, forms, server-actions, how-revalidation-works (AGENTS.md : « This is NOT the Next.js you know »).
- Code, noms, commentaires et textes d'interface en français, comme le reste du dépôt ; densité de commentaires identique (une ligne quand le pourquoi n'est pas évident).
- Toute Server Action passe par `action(role, fn)` de `src/lib/admin/action.ts` et renvoie `Resultat<T>` ; une erreur de saisie ne lève jamais d'exception.
- Droits : l'éditeur fait tout sur les contenus → `action("editeur", …)` et `exigerSession()` dans les pages.
- Tout HTML enregistré passe par `nettoyerHtml` (dans le schéma Zod).
- Chaque écriture appelle `revalidateTag(TAGS.actualites, { expire: 0 })` et `revalidatePath` des pages admin concernées.
- Aucune migration de base : le schéma existant suffit. Ne pas lancer `db:generate`.
- Pas de `cacheComponents`, pas de `"use cache"` (les getters restent en `unstable_cache`).
- Admin : boutons et liens d'au moins 44 px (`min-h-11`), focus visible, utilisable à 360 px, contraste AA, composants de `src/components/admin/ui.tsx`.
- Base partagée avec la production : aucun test e2e ne publie de contenu sauf si `E2E_BASE_DEDIEE=1` ; tout contenu e2e a un slug qui commence par `e2e-`.
- Dev local sur le port 3100 : `npx next dev -p 3100`. E2E : `E2E_AUTORISE=1 npm run test:e2e`.
- Commits : messages en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, sur la branche `back-office-contenus`. Ne jamais pousser sur `main`.

## Review Focus

- **Saisie perdue après une erreur** : React 19 vide les champs non contrôlés d'un `<form action={…}>` après chaque envoi ; une erreur de validation ne doit rien effacer (soumission par `onSubmit` + `startTransition`, testée en e2e, tâche 11).
- **Faux conflit au premier enregistrement** : `maj_le` créé par `defaultNow()` est stocké à la microseconde, le navigateur ne renvoie que la milliseconde ; la comparaison tronque à la milliseconde (test PGlite, tâche 2).
- **HTML collé ou forgé** : `<script>`, `onclick`, liens `javascript:` et balises hors liste blanche disparaissent ; un corps qui ne contient que des balises vides est refusé (tests Zod, tâche 3).
- **Cookie d'aperçu sans session** (session expirée, déconnexion, cookie copié) : aucun brouillon n'est servi, et la lecture de session n'a lieu que si le Draft Mode est actif, pour ne pas rendre dynamiques les pages statiques (test unitaire, tâche 9).
- **Slug d'une actualité publiée changé sans déverrouillage** par une requête forgée : refusé côté serveur (test PGlite, tâche 2).

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/admin/slug.ts` (+ test) | `slugifier()` |
| `src/lib/html.ts` (modif., + test) | ajout de `texteDe()` |
| `src/lib/validation/commun.ts` (+ test) | briques Zod partagées : `champJson`, `champSlug`, `urlWeb`, `htmlRiche`, `idYoutube`, `intention`, `caseACocher`, `extraireIdYoutube` |
| `src/lib/validation/actualites.ts` (+ test) | `schemaActualite`, `schemaEnvoiActualite` |
| `src/db/operations/commun.ts` | `memeVersion()`, `CONFLIT`, type `Intention` |
| `src/db/operations/actualites.ts` (+ test) | créer, modifier (publication, slug, concurrence, photos), supprimer |
| `src/db/requetes/admin/commun.ts` | `MediaChoisi`, `versMediaChoisi`, `PAR_PAGE`, `motifRecherche` |
| `src/db/requetes/admin/actualites.ts` (+ test) | liste paginée et fiche de l'admin |
| `src/db/requetes/admin/apercu.ts` (+ test) | `cheminApercu()` |
| `src/db/requetes/actualites.ts` (modif.) | option `{ brouillons }` de `trouverActualite` |
| `src/lib/admin/filtre.ts` (+ test) | `lireFiltre()`, `urlListe()` |
| `src/lib/admin/liste.ts` (+ test) | `deplacer()`, `retirer()` (listes ordonnées) |
| `src/lib/admin/actualites.ts` (+ test) | Server Actions des actualités |
| `src/lib/apercu.ts` (+ test) | `apercuAutorise()` |
| `src/lib/admin/apercu-actions.ts` | Server Action `quitterApercu()` |
| `src/lib/content/actualites.ts` (modif.) | `getActualitePourPage()` |
| `src/app/api/apercu/route.ts` | activation du Draft Mode |
| `src/components/bandeau-apercu.tsx` | bandeau du site en aperçu |
| `src/components/coquille-site.tsx` (modif.) | affiche le bandeau |
| `src/components/admin/selecteur-media.tsx` (modif.) | portail, ordre des réponses, renvoie des `MediaChoisi` |
| `src/components/admin/champs/use-formulaire.ts` | soumission sans remise à zéro + avertissement `beforeunload` |
| `src/components/admin/champs/liste-editable.tsx` | `ListeEditable<T>` |
| `src/components/admin/champs/champ-media.tsx` | `ChampMedia`, `GaleriePhotos` |
| `src/components/admin/champs/champ-slug.tsx` | slug suivi du titre, verrou |
| `src/components/admin/champs/editeur-riche.tsx` | champ + chargement différé |
| `src/components/admin/champs/zone-tiptap.tsx` | éditeur Tiptap et barre d'outils |
| `src/components/admin/champs/barre-publication.tsx` | statut, boutons d'enregistrement, aperçu, suppression |
| `src/components/admin/liste.tsx` | `FiltresListe`, `Pagination` |
| `src/app/admin/(espace)/actualites/page.tsx` | liste |
| `src/app/admin/(espace)/actualites/nouveau/page.tsx` | création |
| `src/app/admin/(espace)/actualites/[id]/page.tsx` | modification |
| `src/app/admin/(espace)/actualites/formulaire.tsx` | formulaire client |
| `src/app/admin/(espace)/[rubrique]/page.tsx` (modif.) | retire « actualites » |
| `src/app/(site)/actualites/[slug]/page.tsx` (modif.) | lit `getActualitePourPage` |
| `src/app/globals.css` (modif.) | styles `.texte-long` des titres, listes, citations, liens |
| `e2e/actualites.spec.ts`, `e2e/nettoyage.ts`, `e2e/preparation.ts` | parcours e2e et nettoyage `e2e-` |

---

### Task 1: Utilitaires purs (slug, texte du HTML, briques Zod)

**Files:**
- Create: `src/lib/admin/slug.ts`, `src/lib/admin/slug.test.ts`
- Modify: `src/lib/html.ts`, `src/lib/html.test.ts`
- Create: `src/lib/validation/commun.ts`, `src/lib/validation/commun.test.ts`

**Interfaces:**
- Produces:
  - `slugifier(texte: string): string`
  - `texteDe(html: string): string` (texte visible, espaces normalisés)
  - `extraireIdYoutube(texte: string): string | null`
  - Zod : `champJson<T extends z.ZodType>(schema: T)`, `champSlug`, `urlWeb`, `htmlRiche(message: string)`, `idYoutube`, `intention` (`"enregistrer" | "publier" | "depublier"`, défaut `"enregistrer"`), `caseACocher` (booléen depuis une case HTML)

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/admin/slug.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { slugifier } from "./slug";

describe("slugifier", () => {
  it("retire accents, ponctuation et majuscules", () => {
    expect(slugifier("Journée nationale du Contenu local : 2026 !")).toBe("journee-nationale-du-contenu-local-2026");
  });
  it("traite les apostrophes et ligatures", () => {
    expect(slugifier("L'œuvre de l’amicale")).toBe("l-oeuvre-de-l-amicale");
  });
  it("ne laisse ni tiret en tête ni en fin", () => {
    expect(slugifier("  -- Forum --  ")).toBe("forum");
  });
  it("coupe à 80 caractères sans finir par un tiret", () => {
    const slug = slugifier("mot ".repeat(40));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
  it("renvoie une chaîne vide quand il n'y a rien à garder", () => {
    expect(slugifier("!!!")).toBe("");
  });
});
```

Ajouter à `src/lib/html.test.ts` (garder les tests existants, ajouter `texteDe` à l'import) :

```ts
describe("texteDe", () => {
  it("garde le texte visible et normalise les espaces", () => {
    expect(texteDe("<p>Un <strong>texte</strong></p><p>  suivi </p>")).toBe("Un texte suivi");
  });
  it("renvoie une chaîne vide pour des balises vides", () => {
    expect(texteDe("<p></p><p><br></p>")).toBe("");
  });
});
```

`src/lib/validation/commun.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { caseACocher, champJson, champSlug, extraireIdYoutube, htmlRiche, intention, urlWeb } from "./commun";

describe("champJson", () => {
  const schema = champJson(z.array(z.object({ label: z.string() })));
  it("lit un tableau JSON", () => {
    expect(schema.parse('[{"label":"a"}]')).toEqual([{ label: "a" }]);
  });
  it("vaut une liste vide quand le champ est absent", () => {
    expect(schema.parse(undefined)).toEqual([]);
  });
  it("refuse un JSON illisible sans lever d'exception", () => {
    const r = schema.safeParse("[{");
    expect(r.success).toBe(false);
  });
  it("valide le contenu", () => {
    expect(schema.safeParse('[{"label":1}]').success).toBe(false);
  });
});

describe("champSlug", () => {
  it("accepte minuscules, chiffres et tirets", () => {
    expect(champSlug.parse(" forum-2025 ")).toBe("forum-2025");
  });
  it.each(["Forum", "forum--2025", "-forum", "forum_2025", ""])("refuse « %s »", (v) => {
    expect(champSlug.safeParse(v).success).toBe(false);
  });
});

describe("urlWeb", () => {
  it("accepte http et https", () => {
    expect(urlWeb.parse(" https://ensmg.ucad.sn/ ")).toBe("https://ensmg.ucad.sn/");
  });
  it.each(["javascript:alert(1)", "ftp://exemple.sn", "pas une adresse"])("refuse %s", (v) => {
    expect(urlWeb.safeParse(v).success).toBe(false);
  });
});

describe("htmlRiche", () => {
  const schema = htmlRiche("Écrivez le texte.");
  it("nettoie le HTML", () => {
    expect(schema.parse('<p onclick="x()">Bonjour<script>alert(1)</script></p>')).toBe("<p>Bonjour</p>");
  });
  it("retire les liens javascript:", () => {
    expect(schema.parse('<p><a href="javascript:alert(1)">lien</a></p>')).toBe('<p><a rel="noopener">lien</a></p>');
  });
  it("refuse un texte vide une fois nettoyé", () => {
    const r = schema.safeParse("<p></p><script>alert(1)</script>");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Écrivez le texte.");
  });
});

describe("extraireIdYoutube", () => {
  it.each([
    ["dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
  ])("lit %s", (texte, id) => {
    expect(extraireIdYoutube(texte)).toBe(id);
  });
  it.each(["", "trop-court", "https://vimeo.com/123", "https://youtube.com/watch?v=xx"])("refuse « %s »", (t) => {
    expect(extraireIdYoutube(t)).toBeNull();
  });
});

describe("intention et caseACocher", () => {
  it("enregistre par défaut", () => {
    expect(intention.parse(undefined)).toBe("enregistrer");
  });
  it("refuse une intention inconnue", () => {
    expect(intention.safeParse("effacer").success).toBe(false);
  });
  it("lit une case HTML", () => {
    expect(caseACocher.parse("on")).toBe(true);
    expect(caseACocher.parse(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/slug.test.ts src/lib/html.test.ts src/lib/validation/commun.test.ts`
Expected: FAIL (modules et exports introuvables).

- [ ] **Step 3: Implémenter**

`src/lib/admin/slug.ts` :

```ts
const LONGUEUR_MAX = 80;

// Adresse lisible tirée d'un titre : « Journée du contenu local » → « journee-du-contenu-local ».
export function slugifier(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LONGUEUR_MAX)
    .replace(/-+$/, "");
}
```

Ajouter à `src/lib/html.ts` :

```ts
// Texte visible d'un HTML : sert à refuser un contenu qui n'a que des balises vides.
export function texteDe(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

`src/lib/validation/commun.ts` :

```ts
import { z } from "zod";
import { nettoyerHtml, texteDe } from "@/lib/html";

// Liste envoyée par un composant client dans un champ caché, en JSON.
export function champJson<T extends z.ZodType>(schema: T) {
  return z
    .string()
    .default("[]")
    .transform((texte, ctx) => {
      try {
        return JSON.parse(texte) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Valeur illisible : rechargez la page." });
        return z.NEVER;
      }
    })
    .pipe(schema);
}

export const champSlug = z
  .string()
  .trim()
  .min(1, "Indiquez le lien de la page.")
  .max(80, "80 caractères au plus.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lettres minuscules, chiffres et tirets seulement (ex. : forum-sim-2025).");

export const urlWeb = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/, error: "Adresse web invalide : elle doit commencer par http:// ou https://." }));

// Le nettoyage a lieu dans le schéma : aucune donnée validée ne contient de HTML brut.
export function htmlRiche(message: string) {
  return z
    .string()
    .transform(nettoyerHtml)
    .refine((html) => texteDe(html).length > 0, message);
}

const ID_YOUTUBE = /^[\w-]{11}$/;

// Accepte l'identifiant seul ou une adresse YouTube collée telle quelle.
export function extraireIdYoutube(texte: string): string | null {
  const t = texte.trim();
  if (ID_YOUTUBE.test(t)) return t;
  try {
    const url = new URL(t);
    const hote = url.hostname.replace(/^(www\.|m\.)/, "");
    let id: string | null = null;
    if (hote === "youtu.be") id = url.pathname.slice(1);
    else if (hote === "youtube.com" || hote === "youtube-nocookie.com") {
      id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1] ?? null;
    }
    return id && ID_YOUTUBE.test(id) ? id : null;
  } catch {
    return null;
  }
}

export const idYoutube = z
  .string()
  .transform((texte, ctx) => {
    const id = extraireIdYoutube(texte);
    if (!id) {
      ctx.addIssue({ code: "custom", message: "Collez l'adresse de la vidéo YouTube ou son identifiant." });
      return z.NEVER;
    }
    return id;
  });

export const intention = z.enum(["enregistrer", "publier", "depublier"]).default("enregistrer");

// Une case cochée envoie « on » ; décochée, elle n'envoie rien.
export const caseACocher = z.preprocess((v) => v === "on" || v === "true" || v === "1", z.boolean());
```

Si `z.url({ protocol, error })` ne se comporte pas comme attendu dans la version installée de Zod 4, vérifier la signature dans `node_modules/zod/v4/classic/schemas.d.ts` avant d'adapter.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/admin/slug.test.ts src/lib/html.test.ts src/lib/validation/commun.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/slug.ts src/lib/admin/slug.test.ts src/lib/html.ts src/lib/html.test.ts src/lib/validation/commun.ts src/lib/validation/commun.test.ts
git commit -m "Utilitaires des formulaires de contenu : slug, texte du HTML, briques Zod

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Opérations d'écriture des actualités

**Files:**
- Create: `src/db/operations/commun.ts`
- Create: `src/db/operations/actualites.ts`, `src/db/operations/actualites.test.ts`

**Interfaces:**
- Consumes: `ErreurMetier` (`src/db/operations/erreurs.ts`), `Db`, `Tx` (`src/db/types.ts`), `creerDbTest()` (`src/test/db.ts`), `creerMedia()` (`src/db/operations/media.ts`).
- Produces:
  - `src/db/operations/commun.ts` : `type Intention = "enregistrer" | "publier" | "depublier"` ; `CONFLIT: string` ; `memeVersion(colonne: AnyPgColumn, version: string): SQL`
  - `src/db/operations/actualites.ts` :
    - `type DonneesActualite = { titre: string; slug: string; date: string; resume: string; corps: string; sources: Source[]; videos: Video[]; photos: string[] }` (`photos` = ids de médias dans l'ordre)
    - `creerActualite(db: Db, d: DonneesActualite, intention: Intention): Promise<{ id: string }>`
    - `modifierActualite(db: Db, id: string, d: DonneesActualite, o: { version: string; intention: Intention; modifierSlug: boolean }): Promise<{ version: string }>`
    - `supprimerActualite(db: Db, id: string): Promise<void>`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/db/operations/actualites.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { actualitePhotos, actualites } from "@/db/schema";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { creerActualite, type DonneesActualite, modifierActualite, supprimerActualite } from "./actualites";
import { CONFLIT } from "./commun";
import { ErreurMetier } from "./erreurs";
import { creerMedia } from "./media";

const base: DonneesActualite = {
  titre: "Forum de recrutement",
  slug: "forum-de-recrutement",
  date: "2025-11-20",
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  sources: [{ label: "APS", url: "https://aps.sn/" }],
  videos: [],
  photos: [],
};

async function image(db: Db, n: number) {
  const m = await creerMedia(
    db,
    { url: `/images/test-${n}.webp`, pathname: null, alt: `Image ${n}`, credit: null, width: 10, height: 10, mime: "image/webp", taille: null },
    null,
  );
  return m.id;
}

async function lire(db: Db, id: string) {
  return (await db.query.actualites.findFirst({ where: eq(actualites.id, id) }))!;
}

// Version telle que le formulaire la renvoie : à la milliseconde.
const versionDe = (d: Date) => d.toISOString();

describe("actualités", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("crée un brouillon sans date de publication", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    const a = await lire(db, id);
    expect(a).toMatchObject({ statut: "brouillon", publieLe: null, slug: "forum-de-recrutement" });
  });

  it("crée et publie d'un coup", async () => {
    const { id } = await creerActualite(db, base, "publier");
    const a = await lire(db, id);
    expect(a.statut).toBe("publie");
    expect(a.publieLe).toBeInstanceOf(Date);
  });

  it("refuse un slug déjà pris, sur le champ slug", async () => {
    await creerActualite(db, base, "enregistrer");
    const erreur = await creerActualite(db, { ...base, titre: "Autre" }, "enregistrer").catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("slug");
  });

  it("accepte la version lue juste après la création (maj_le à la microseconde en base)", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    const version = versionDe((await lire(db, id)).majLe);
    const r = await modifierActualite(db, id, { ...base, titre: "Nouveau titre" }, { version, intention: "enregistrer", modifierSlug: false });
    expect((await lire(db, id)).titre).toBe("Nouveau titre");
    expect(r.version).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("refuse une version périmée sans rien écrire", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    const version = versionDe((await lire(db, id)).majLe);
    await modifierActualite(db, id, { ...base, titre: "Premier" }, { version, intention: "enregistrer", modifierSlug: false });
    const erreur = await modifierActualite(db, id, { ...base, titre: "Second" }, { version, intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.message).toBe(CONFLIT);
    expect((await lire(db, id)).titre).toBe("Premier");
  });

  it("publie, dépublie et garde la date de première publication", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    let v = (await modifierActualite(db, id, base, { version: versionDe((await lire(db, id)).majLe), intention: "publier", modifierSlug: false })).version;
    const premiere = (await lire(db, id)).publieLe;
    expect(premiere).toBeInstanceOf(Date);
    v = (await modifierActualite(db, id, base, { version: v, intention: "depublier", modifierSlug: false })).version;
    expect(await lire(db, id)).toMatchObject({ statut: "brouillon", publieLe: premiere });
    await modifierActualite(db, id, base, { version: v, intention: "publier", modifierSlug: false });
    expect((await lire(db, id)).publieLe).toEqual(premiere);
  });

  it("garde le statut quand on enregistre simplement", async () => {
    const { id } = await creerActualite(db, base, "publier");
    await modifierActualite(db, id, { ...base, resume: "Autre" }, { version: versionDe((await lire(db, id)).majLe), intention: "enregistrer", modifierSlug: false });
    expect((await lire(db, id)).statut).toBe("publie");
  });

  it("change librement le slug d'un brouillon jamais publié", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    await modifierActualite(db, id, { ...base, slug: "nouveau-lien" }, { version: versionDe((await lire(db, id)).majLe), intention: "enregistrer", modifierSlug: false });
    expect((await lire(db, id)).slug).toBe("nouveau-lien");
  });

  it("refuse de changer le slug d'une actualité déjà publiée sans déverrouillage", async () => {
    const { id } = await creerActualite(db, base, "publier");
    const version = versionDe((await lire(db, id)).majLe);
    const erreur = await modifierActualite(db, id, { ...base, slug: "nouveau-lien" }, { version, intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("slug");
    await modifierActualite(db, id, { ...base, slug: "nouveau-lien" }, { version, intention: "enregistrer", modifierSlug: true });
    expect((await lire(db, id)).slug).toBe("nouveau-lien");
  });

  it("refuse un slug pris par une autre actualité lors d'une modification", async () => {
    await creerActualite(db, { ...base, slug: "deja-pris" }, "enregistrer");
    const { id } = await creerActualite(db, base, "enregistrer");
    const erreur = await modifierActualite(db, id, { ...base, slug: "deja-pris" }, { version: versionDe((await lire(db, id)).majLe), intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur.champ).toBe("slug");
  });

  it("réécrit les photos dans l'ordre donné", async () => {
    const [a, b, c] = [await image(db, 1), await image(db, 2), await image(db, 3)];
    const { id } = await creerActualite(db, { ...base, photos: [a, b] }, "enregistrer");
    await modifierActualite(db, id, { ...base, photos: [c, a] }, { version: versionDe((await lire(db, id)).majLe), intention: "enregistrer", modifierSlug: false });
    const photos = await db.select().from(actualitePhotos).where(eq(actualitePhotos.actualiteId, id)).orderBy(actualitePhotos.ordre);
    expect(photos.map((p) => [p.mediaId, p.ordre])).toEqual([[c, 0], [a, 1]]);
  });

  it("signale une actualité introuvable", async () => {
    const erreur = await modifierActualite(db, crypto.randomUUID(), base, { version: new Date().toISOString(), intention: "enregistrer", modifierSlug: false }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.message).toBe("Actualité introuvable.");
  });

  it("supprime l'actualité et ses liaisons, pas les images", async () => {
    const img = await image(db, 1);
    const { id } = await creerActualite(db, { ...base, photos: [img] }, "enregistrer");
    await supprimerActualite(db, id);
    expect(await db.query.actualites.findFirst({ where: eq(actualites.id, id) })).toBeUndefined();
    expect(await db.query.media.findFirst({ where: (m, { eq }) => eq(m.id, img) })).toBeDefined();
    await expect(supprimerActualite(db, id)).rejects.toThrow("Actualité introuvable.");
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/db/operations/actualites.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Implémenter**

`src/db/operations/commun.ts` :

```ts
import { type SQL, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export type Intention = "enregistrer" | "publier" | "depublier";

export const CONFLIT = "Ce contenu a été modifié entre-temps. Rechargez la page pour voir la dernière version.";

// `maj_le` peut être stocké à la microseconde ; le formulaire ne renvoie que la milliseconde.
export function memeVersion(colonne: AnyPgColumn, version: string): SQL {
  return sql`date_trunc('milliseconds', ${colonne}) = ${version}::timestamptz`;
}
```

`src/db/operations/actualites.ts` :

```ts
import { and, eq, ne } from "drizzle-orm";
import { actualitePhotos, actualites } from "@/db/schema";
import type { Db, Tx } from "@/db/types";
import type { Source, Video } from "@/lib/content/types";
import { CONFLIT, type Intention, memeVersion } from "./commun";
import { ErreurMetier } from "./erreurs";

export type DonneesActualite = {
  titre: string;
  slug: string;
  date: string;
  resume: string;
  corps: string;
  sources: Source[];
  videos: Video[];
  // Identifiants des médias, dans l'ordre d'affichage (le premier sert de vignette).
  photos: string[];
};

const INTROUVABLE = "Actualité introuvable.";

async function verifierSlugLibre(tx: Tx, slug: string, saufId?: string) {
  const memeSlug = eq(actualites.slug, slug);
  const [autre] = await tx
    .select({ id: actualites.id })
    .from(actualites)
    .where(saufId ? and(memeSlug, ne(actualites.id, saufId)) : memeSlug)
    .limit(1);
  if (autre) throw new ErreurMetier("Ce lien est déjà utilisé par une autre actualité.", "slug");
}

async function remplacerPhotos(tx: Tx, actualiteId: string, photos: string[]) {
  await tx.delete(actualitePhotos).where(eq(actualitePhotos.actualiteId, actualiteId));
  if (photos.length > 0) {
    await tx.insert(actualitePhotos).values(photos.map((mediaId, ordre) => ({ actualiteId, mediaId, ordre })));
  }
}

export async function creerActualite(db: Db, d: DonneesActualite, intention: Intention): Promise<{ id: string }> {
  return db.transaction(async (tx) => {
    await verifierSlugLibre(tx, d.slug);
    const { photos, ...champs } = d;
    const publier = intention === "publier";
    const [ligne] = await tx
      .insert(actualites)
      .values({ ...champs, statut: publier ? "publie" : "brouillon", publieLe: publier ? new Date() : null })
      .returning({ id: actualites.id });
    await remplacerPhotos(tx, ligne.id, photos);
    return ligne;
  });
}

export async function modifierActualite(
  db: Db,
  id: string,
  d: DonneesActualite,
  o: { version: string; intention: Intention; modifierSlug: boolean },
): Promise<{ version: string }> {
  return db.transaction(async (tx) => {
    const actuelle = await tx.query.actualites.findFirst({
      where: eq(actualites.id, id),
      columns: { slug: true, statut: true, publieLe: true },
    });
    if (!actuelle) throw new ErreurMetier(INTROUVABLE);
    if (d.slug !== actuelle.slug) {
      // Un lien déjà publié a pu être partagé : on ne le change que sur demande explicite.
      if (actuelle.publieLe && !o.modifierSlug) {
        throw new ErreurMetier("Cette actualité a déjà été publiée : cliquez sur « Modifier le lien » pour changer son adresse.", "slug");
      }
      await verifierSlugLibre(tx, d.slug, id);
    }
    const statut = o.intention === "publier" ? "publie" : o.intention === "depublier" ? "brouillon" : actuelle.statut;
    const publieLe = actuelle.publieLe ?? (statut === "publie" ? new Date() : null);
    const { photos, ...champs } = d;
    const [maj] = await tx
      .update(actualites)
      .set({ ...champs, statut, publieLe })
      .where(and(eq(actualites.id, id), memeVersion(actualites.majLe, o.version)))
      .returning({ majLe: actualites.majLe });
    if (!maj) throw new ErreurMetier(CONFLIT);
    await remplacerPhotos(tx, id, photos);
    return { version: maj.majLe.toISOString() };
  });
}

export async function supprimerActualite(db: Db, id: string): Promise<void> {
  // Les liaisons photos partent en cascade ; les images restent dans la médiathèque.
  const lignes = await db.delete(actualites).where(eq(actualites.id, id)).returning({ id: actualites.id });
  if (lignes.length === 0) throw new ErreurMetier(INTROUVABLE);
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/db/operations/actualites.test.ts`
Expected: PASS. Si le test « version lue juste après la création » échoue, vérifier que `memeVersion` tronque bien la colonne et non le paramètre ; ne pas affaiblir le test.

- [ ] **Step 5: Commit**

```bash
git add src/db/operations/commun.ts src/db/operations/actualites.ts src/db/operations/actualites.test.ts
git commit -m "Opérations des actualités : publication, slug verrouillé, contrôle de version, photos ordonnées

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Schéma de validation des actualités

**Files:**
- Create: `src/lib/validation/actualites.ts`, `src/lib/validation/actualites.test.ts`

**Interfaces:**
- Consumes: briques de `src/lib/validation/commun.ts` (tâche 1).
- Produces:
  - `schemaActualite` : objet Zod dont la sortie est exactement `DonneesActualite` (tâche 2)
  - `schemaEnvoiActualite = schemaActualite.extend({ intention, modifierSlug: caseACocher, version: z.string().optional() })`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/validation/actualites.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { actualites as actualitesInitiales } from "@/db/donnees-initiales/actualites";
import { paragraphesEnHtml } from "@/lib/html";
import { schemaActualite, schemaEnvoiActualite } from "./actualites";

const valide = {
  titre: " Forum ",
  slug: "forum",
  date: "2025-11-20",
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  sources: '[{"label":"APS","url":"https://aps.sn/"}]',
  videos: '[{"id":"https://youtu.be/dQw4w9WgXcQ","titre":"Reportage"}]',
  photos: "[]",
};

describe("schemaActualite", () => {
  it("lit un formulaire complet", () => {
    expect(schemaActualite.parse(valide)).toEqual({
      titre: "Forum",
      slug: "forum",
      date: "2025-11-20",
      resume: "Résumé.",
      corps: "<p>Texte.</p>",
      sources: [{ label: "APS", url: "https://aps.sn/" }],
      videos: [{ id: "dQw4w9WgXcQ", titre: "Reportage" }],
      photos: [],
    });
  });

  it("accepte les actualités actuelles du site", () => {
    for (const a of actualitesInitiales) {
      const r = schemaActualite.safeParse({
        ...a,
        corps: paragraphesEnHtml(a.corps),
        sources: JSON.stringify(a.sources ?? []),
        videos: JSON.stringify(a.videos ?? []),
        photos: "[]",
      });
      expect(r.success, `${a.slug} : ${JSON.stringify(r.error?.issues)}`).toBe(true);
    }
  });

  it("nettoie le corps", () => {
    const r = schemaActualite.parse({ ...valide, corps: '<p>Texte<img src=x onerror="alert(1)"></p>' });
    expect(r.corps).toBe("<p>Texte</p>");
  });

  it.each([
    ["titre", { titre: "  " }],
    ["date", { date: "20/11/2025" }],
    ["resume", { resume: "" }],
    ["corps", { corps: "<p></p>" }],
    ["sources", { sources: '[{"label":"APS","url":"javascript:alert(1)"}]' }],
    ["videos", { videos: '[{"id":"pas-une-video","titre":"x"}]' }],
    ["photos", { photos: '["pas-un-uuid"]' }],
  ])("signale le champ %s", (champ, modif) => {
    const r = schemaActualite.safeParse({ ...valide, ...modif });
    expect(r.success).toBe(false);
    expect(r.error?.issues.some((i) => i.path[0] === champ)).toBe(true);
  });

  it("refuse une photo choisie deux fois", () => {
    const id = crypto.randomUUID();
    expect(schemaActualite.safeParse({ ...valide, photos: JSON.stringify([id, id]) }).success).toBe(false);
  });
});

describe("schemaEnvoiActualite", () => {
  it("ajoute intention, déverrouillage et version", () => {
    const r = schemaEnvoiActualite.parse({ ...valide, intention: "publier", modifierSlug: "on", version: "2026-10-10T10:00:00.000Z" });
    expect(r).toMatchObject({ intention: "publier", modifierSlug: true, version: "2026-10-10T10:00:00.000Z" });
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/validation/actualites.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/lib/validation/actualites.ts` :

```ts
import { z } from "zod";
import { caseACocher, champJson, champSlug, htmlRiche, idYoutube, intention, urlWeb } from "./commun";

const source = z.object({ label: z.string().trim().min(1, "Nommez chaque source."), url: urlWeb });
const video = z.object({ id: idYoutube, titre: z.string().trim().min(1, "Donnez un titre à chaque vidéo.") });

export const schemaActualite = z.object({
  titre: z.string().trim().min(1, "Indiquez un titre.").max(200, "200 caractères au plus."),
  slug: champSlug,
  date: z.iso.date({ error: "Indiquez une date valide." }),
  resume: z.string().trim().min(1, "Écrivez un résumé.").max(600, "600 caractères au plus."),
  corps: htmlRiche("Écrivez le texte de l'actualité."),
  sources: champJson(z.array(source).max(20, "20 sources au plus.")),
  videos: champJson(z.array(video).max(10, "10 vidéos au plus.")),
  photos: champJson(
    z
      .array(z.uuid())
      .max(30, "30 photos au plus.")
      .refine((ids) => new Set(ids).size === ids.length, "Une photo figure deux fois."),
  ),
});

export const schemaEnvoiActualite = schemaActualite.extend({
  intention,
  modifierSlug: caseACocher,
  version: z.string().optional(),
});
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/validation/actualites.test.ts`
Expected: PASS. Si une actualité initiale échoue sur une longueur, relever la limite concernée plutôt que de modifier les données.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation/actualites.ts src/lib/validation/actualites.test.ts
git commit -m "Schéma de validation des actualités

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Lectures de l'admin, filtres de liste et lecture des brouillons

**Files:**
- Create: `src/db/requetes/admin/commun.ts`
- Create: `src/db/requetes/admin/actualites.ts`, `src/db/requetes/admin/actualites.test.ts`
- Create: `src/db/requetes/admin/apercu.ts` (testé dans le même fichier de test)
- Modify: `src/db/requetes/actualites.ts` (option `brouillons`)
- Create: `src/lib/admin/filtre.ts`, `src/lib/admin/filtre.test.ts`

**Interfaces:**
- Consumes: `creerActualite` (tâche 2), `creerMedia`.
- Produces:
  - `type MediaChoisi = { id: string; url: string; alt: string; width: number; height: number; mime: string }` et `versMediaChoisi(m: typeof media.$inferSelect): MediaChoisi`
  - `PAR_PAGE = 25`, `motifRecherche(texte: string): string`
  - `type LigneActualiteAdmin = { id: string; titre: string; slug: string; date: string; statut: "brouillon" | "publie" }`
  - `listerActualitesAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneActualiteAdmin[]; total: number }>`
  - `type ActualiteAdmin = { id: string; titre: string; slug: string; date: string; resume: string; corps: string; sources: Source[]; videos: Video[]; statut: "brouillon" | "publie"; dejaPubliee: boolean; version: string; photos: MediaChoisi[] }`
  - `lireActualiteAdmin(db: Db, id: string): Promise<ActualiteAdmin | undefined>`
  - `type TypeApercu = "actualite"` ; `cheminApercu(db: Db, type: TypeApercu, id: string): Promise<string | null>`
  - `trouverActualite(db: Db, slug: string, o?: { brouillons?: boolean }): Promise<Actualite | undefined>`
  - `type Filtre = { q: string; statut?: "brouillon" | "publie"; page: number }` ; `lireFiltre(p: Record<string, string | string[] | undefined>): Filtre` ; `urlListe(base: string, f: Filtre, page: number): string`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/admin/filtre.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { lireFiltre, urlListe } from "./filtre";

describe("lireFiltre", () => {
  it("lit recherche, statut et page", () => {
    expect(lireFiltre({ q: " forum ", statut: "publie", page: "3" })).toEqual({ q: "forum", statut: "publie", page: 3 });
  });
  it("ignore les valeurs inattendues", () => {
    expect(lireFiltre({ q: ["a", "b"], statut: "supprime", page: "-2" })).toEqual({ q: "", statut: undefined, page: 1 });
    expect(lireFiltre({ page: "abc" }).page).toBe(1);
  });
});

describe("urlListe", () => {
  it("ne garde que les paramètres utiles", () => {
    expect(urlListe("/admin/actualites", { q: "", page: 1 }, 1)).toBe("/admin/actualites");
    expect(urlListe("/admin/actualites", { q: "forum sim", statut: "brouillon", page: 1 }, 2)).toBe(
      "/admin/actualites?q=forum+sim&statut=brouillon&page=2",
    );
  });
});
```

`src/db/requetes/admin/actualites.test.ts` :

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { creerActualite, type DonneesActualite } from "@/db/operations/actualites";
import { creerMedia } from "@/db/operations/media";
import { trouverActualite } from "@/db/requetes/actualites";
import type { Db } from "@/db/types";
import { creerDbTest } from "@/test/db";
import { lireActualiteAdmin, listerActualitesAdmin } from "./actualites";
import { cheminApercu } from "./apercu";
import { PAR_PAGE } from "./commun";

const base: DonneesActualite = {
  titre: "Forum",
  slug: "forum",
  date: "2025-11-20",
  resume: "Résumé.",
  corps: "<p>Texte.</p>",
  sources: [],
  videos: [],
  photos: [],
};

describe("lectures de l'admin", () => {
  let db: Db;
  beforeEach(async () => {
    db = await creerDbTest();
  });

  it("liste brouillons et publiées, de la plus récente à la plus ancienne", async () => {
    await creerActualite(db, { ...base, slug: "ancienne", titre: "Ancienne", date: "2024-01-01" }, "publier");
    await creerActualite(db, { ...base, slug: "recente", titre: "Récente", date: "2026-01-01" }, "enregistrer");
    const { lignes, total } = await listerActualitesAdmin(db, { q: "", page: 1 });
    expect(total).toBe(2);
    expect(lignes.map((l) => [l.slug, l.statut])).toEqual([["recente", "brouillon"], ["ancienne", "publie"]]);
  });

  it("filtre par statut et par recherche littérale", async () => {
    await creerActualite(db, { ...base, slug: "a", titre: "Forum 100% emploi" }, "publier");
    await creerActualite(db, { ...base, slug: "b", titre: "Journée" }, "enregistrer");
    expect((await listerActualitesAdmin(db, { q: "", statut: "brouillon", page: 1 })).lignes.map((l) => l.slug)).toEqual(["b"]);
    expect((await listerActualitesAdmin(db, { q: "100%", page: 1 })).lignes.map((l) => l.slug)).toEqual(["a"]);
    expect((await listerActualitesAdmin(db, { q: "%", page: 1 })).total).toBe(1);
  });

  it("pagine par 25", async () => {
    for (let i = 0; i < PAR_PAGE + 2; i++) {
      await creerActualite(db, { ...base, slug: `a-${i}`, date: `2025-01-${String((i % 28) + 1).padStart(2, "0")}` }, "enregistrer");
    }
    const page2 = await listerActualitesAdmin(db, { q: "", page: 2 });
    expect(page2.total).toBe(PAR_PAGE + 2);
    expect(page2.lignes).toHaveLength(2);
  });

  it("lit une fiche avec ses photos dans l'ordre et une version à la milliseconde", async () => {
    const m1 = await creerMedia(db, { url: "/a.webp", pathname: null, alt: "A", credit: null, width: 4, height: 3, mime: "image/webp", taille: null }, null);
    const m2 = await creerMedia(db, { url: "/b.webp", pathname: null, alt: "B", credit: null, width: 4, height: 3, mime: "image/webp", taille: null }, null);
    const { id } = await creerActualite(db, { ...base, photos: [m2.id, m1.id] }, "publier");
    const fiche = await lireActualiteAdmin(db, id);
    expect(fiche).toMatchObject({ id, slug: "forum", statut: "publie", dejaPubliee: true });
    expect(fiche!.photos.map((p) => p.alt)).toEqual(["B", "A"]);
    expect(fiche!.version).toMatch(/\.\d{3}Z$/);
    expect(await lireActualiteAdmin(db, crypto.randomUUID())).toBeUndefined();
  });

  it("ne sert un brouillon au site public que sur demande", async () => {
    await creerActualite(db, base, "enregistrer");
    expect(await trouverActualite(db, "forum")).toBeUndefined();
    expect((await trouverActualite(db, "forum", { brouillons: true }))?.titre).toBe("Forum");
  });

  it("construit le chemin d'aperçu depuis la base", async () => {
    const { id } = await creerActualite(db, base, "enregistrer");
    expect(await cheminApercu(db, "actualite", id)).toBe("/actualites/forum");
    expect(await cheminApercu(db, "actualite", crypto.randomUUID())).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/filtre.test.ts src/db/requetes/admin/actualites.test.ts`
Expected: FAIL (modules introuvables).

- [ ] **Step 3: Implémenter**

`src/lib/admin/filtre.ts` :

```ts
export type Filtre = { q: string; statut?: "brouillon" | "publie"; page: number };

const texte = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// Recherche, statut et page viennent de l'URL : la liste se partage et survit au rechargement.
export function lireFiltre(p: Record<string, string | string[] | undefined>): Filtre {
  const statut = texte(p.statut);
  const page = Number(texte(p.page));
  return {
    q: texte(p.q).trim(),
    statut: statut === "brouillon" || statut === "publie" ? statut : undefined,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function urlListe(base: string, f: Filtre, page: number): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.statut) p.set("statut", f.statut);
  if (page > 1) p.set("page", String(page));
  const requete = p.toString();
  return requete ? `${base}?${requete}` : base;
}
```

`src/db/requetes/admin/commun.ts` :

```ts
import type { media } from "@/db/schema";

export const PAR_PAGE = 25;

// Image telle que les formulaires de l'admin l'affichent et la renvoient.
export type MediaChoisi = { id: string; url: string; alt: string; width: number; height: number; mime: string };

export function versMediaChoisi(m: typeof media.$inferSelect): MediaChoisi {
  return { id: m.id, url: m.url, alt: m.alt, width: m.width, height: m.height, mime: m.mime };
}

// Échappe %, _ et \ pour une recherche littérale avec ILIKE.
export function motifRecherche(texte: string): string {
  return `%${texte.replace(/[\\%_]/g, "\\$&")}%`;
}
```

`src/db/requetes/admin/actualites.ts` :

```ts
import { and, desc, eq, ilike, type SQL } from "drizzle-orm";
import { actualites } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Source, Video } from "@/lib/content/types";
import type { Filtre } from "@/lib/admin/filtre";
import { type MediaChoisi, motifRecherche, PAR_PAGE, versMediaChoisi } from "./commun";

export type LigneActualiteAdmin = { id: string; titre: string; slug: string; date: string; statut: "brouillon" | "publie" };

export type ActualiteAdmin = {
  id: string;
  titre: string;
  slug: string;
  date: string;
  resume: string;
  corps: string;
  sources: Source[];
  videos: Video[];
  statut: "brouillon" | "publie";
  // Publiée au moins une fois : son lien a pu être partagé.
  dejaPubliee: boolean;
  // `maj_le` à la milliseconde, renvoyé par le formulaire pour détecter les modifications concurrentes.
  version: string;
  photos: MediaChoisi[];
};

export async function listerActualitesAdmin(db: Db, f: Filtre): Promise<{ lignes: LigneActualiteAdmin[]; total: number }> {
  const conditions: SQL[] = [];
  if (f.q) conditions.push(ilike(actualites.titre, motifRecherche(f.q)));
  if (f.statut) conditions.push(eq(actualites.statut, f.statut));
  const ou = conditions.length > 0 ? and(...conditions) : undefined;
  const [lignes, total] = await Promise.all([
    db
      .select({ id: actualites.id, titre: actualites.titre, slug: actualites.slug, date: actualites.date, statut: actualites.statut })
      .from(actualites)
      .where(ou)
      .orderBy(desc(actualites.date), desc(actualites.creeLe))
      .limit(PAR_PAGE)
      .offset((f.page - 1) * PAR_PAGE),
    db.$count(actualites, ou),
  ]);
  return { lignes, total };
}

export async function lireActualiteAdmin(db: Db, id: string): Promise<ActualiteAdmin | undefined> {
  const a = await db.query.actualites.findFirst({
    where: eq(actualites.id, id),
    with: { photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  if (!a) return undefined;
  return {
    id: a.id,
    titre: a.titre,
    slug: a.slug,
    date: a.date,
    resume: a.resume,
    corps: a.corps,
    sources: a.sources,
    videos: a.videos,
    statut: a.statut,
    dejaPubliee: a.publieLe !== null,
    version: a.majLe.toISOString(),
    photos: a.photos.map((p) => versMediaChoisi(p.media)),
  };
}
```

`src/db/requetes/admin/apercu.ts` :

```ts
import { eq } from "drizzle-orm";
import { actualites } from "@/db/schema";
import type { Db } from "@/db/types";

export type TypeApercu = "actualite";

// Le chemin vient de la base, jamais de la requête : pas de redirection ouverte.
export async function cheminApercu(db: Db, type: TypeApercu, id: string): Promise<string | null> {
  if (type === "actualite") {
    const a = await db.query.actualites.findFirst({ where: eq(actualites.id, id), columns: { slug: true } });
    return a ? `/actualites/${a.slug}` : null;
  }
  return null;
}
```

Dans `src/db/requetes/actualites.ts`, remplacer `trouverActualite` :

```ts
// `brouillons` n'est utilisé que pour l'aperçu, après contrôle de la session (src/lib/apercu.ts).
export async function trouverActualite(db: Db, slug: string, o: { brouillons?: boolean } = {}): Promise<Actualite | undefined> {
  const ligne = await db.query.actualites.findFirst({
    where: (a, { and, eq }) => (o.brouillons ? eq(a.slug, slug) : and(eq(a.slug, slug), eq(a.statut, "publie"))),
    with: { photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return ligne && versActualite(ligne);
}
```

Attention : `getActualite` (dans `src/lib/content/actualites.ts`) passe `trouverActualite` à `unstable_cache` avec un seul argument `slug` ; vérifier qu'il l'appelle bien sous la forme `(slug) => trouverActualite(db, slug)`, pour ne jamais mettre en cache une lecture de brouillon.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/admin/filtre.test.ts src/db/requetes`
Expected: PASS (y compris `requetes.test.ts`, inchangé).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/filtre.ts src/lib/admin/filtre.test.ts src/db/requetes
git commit -m "Lectures de l'admin pour les actualités, filtres de liste et lecture des brouillons pour l'aperçu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Server Actions des actualités

**Files:**
- Create: `src/lib/admin/actualites.ts`, `src/lib/admin/actualites.test.ts`

**Interfaces:**
- Consumes: `action()`, `erreursDe()`, `Resultat`, `schemaEnvoiActualite` (tâche 3), opérations (tâche 2), `CONFLIT`, `TAGS`.
- Produces (fichier `"use server"`) :
  - `type ResultatActualite = Resultat<{ version: string }>`
  - `creerActualite(etat: ResultatActualite | null, donnees: FormData): Promise<ResultatActualite>` : redirige vers `/admin/actualites/<id>?cree=1` en cas de succès
  - `enregistrerActualite(id: string, etat: ResultatActualite | null, donnees: FormData): Promise<ResultatActualite>`
  - `supprimerActualiteAction(id: string): Promise<Resultat>`

- [ ] **Step 1: Écrire les tests qui échouent**

`src/lib/admin/actualites.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccesRefuse } from "@/lib/roles";

const exigerRole = vi.hoisted(() => vi.fn());
const ops = vi.hoisted(() => ({ creerActualite: vi.fn(), modifierActualite: vi.fn(), supprimerActualite: vi.fn() }));
const cache = vi.hoisted(() => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/session", () => ({ exigerRole }));
vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/db/operations/actualites", () => ops);
vi.mock("next/cache", () => cache);
vi.mock("next/navigation", () => ({ redirect }));

import { creerActualite, enregistrerActualite, supprimerActualiteAction } from "./actualites";

const ID = "6f1c1d4e-8a1b-4c7e-9f00-0a1b2c3d4e5f";

function formulaire(champs: Record<string, string> = {}) {
  const f = new FormData();
  const valeurs = { titre: "Forum", slug: "forum", date: "2025-11-20", resume: "Résumé.", corps: "<p>Texte.</p>", ...champs };
  for (const [k, v] of Object.entries(valeurs)) f.set(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("autorisation", () => {
  it("refuse chaque action sans le rôle requis, sans toucher à la base", async () => {
    exigerRole.mockRejectedValue(new AccesRefuse());
    const refus = { ok: false, message: "Accès refusé." };
    expect(await creerActualite(null, formulaire())).toEqual(refus);
    expect(await enregistrerActualite(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z" }))).toEqual(refus);
    expect(await supprimerActualiteAction(ID)).toEqual(refus);
    expect(Object.values(ops).every((f) => f.mock.calls.length === 0)).toBe(true);
    expect(exigerRole).toHaveBeenCalledWith("editeur");
  });
});

describe("avec une session d'éditeur", () => {
  beforeEach(() => exigerRole.mockResolvedValue({ userId: "u1", role: "editeur" }));

  it("renvoie les erreurs de saisie sans écrire", async () => {
    const r = await creerActualite(null, formulaire({ titre: "" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.erreurs?.titre).toBeTruthy();
    expect(ops.creerActualite).not.toHaveBeenCalled();
  });

  it("crée, invalide le cache du site et redirige vers la fiche", async () => {
    ops.creerActualite.mockResolvedValue({ id: ID });
    await creerActualite(null, formulaire({ intention: "publier" }));
    expect(ops.creerActualite).toHaveBeenCalledWith({}, expect.objectContaining({ titre: "Forum", photos: [] }), "publier");
    expect(cache.revalidateTag).toHaveBeenCalledWith("actualites", { expire: 0 });
    expect(redirect).toHaveBeenCalledWith(`/admin/actualites/${ID}?cree=1`);
  });

  it("enregistre avec la version et renvoie la nouvelle", async () => {
    ops.modifierActualite.mockResolvedValue({ version: "2026-01-02T00:00:00.000Z" });
    const r = await enregistrerActualite(ID, null, formulaire({ version: "2026-01-01T00:00:00.000Z", intention: "depublier" }));
    expect(r).toEqual({ ok: true, message: "Actualité retirée du site.", donnees: { version: "2026-01-02T00:00:00.000Z" } });
    expect(ops.modifierActualite).toHaveBeenCalledWith({}, ID, expect.objectContaining({ slug: "forum" }), {
      version: "2026-01-01T00:00:00.000Z",
      intention: "depublier",
      modifierSlug: false,
    });
    expect(cache.revalidateTag).toHaveBeenCalledWith("actualites", { expire: 0 });
  });

  it("répond « introuvable » pour un identifiant invalide, sans requête", async () => {
    expect(await enregistrerActualite("x", null, formulaire())).toEqual({ ok: false, message: "Actualité introuvable." });
    expect(await supprimerActualiteAction("x")).toEqual({ ok: false, message: "Actualité introuvable." });
    expect(ops.modifierActualite).not.toHaveBeenCalled();
  });

  it("traite une version absente comme un conflit", async () => {
    const r = await enregistrerActualite(ID, null, formulaire());
    expect(r.ok).toBe(false);
    expect(ops.modifierActualite).not.toHaveBeenCalled();
  });

  it("supprime et invalide le cache", async () => {
    ops.supprimerActualite.mockResolvedValue(undefined);
    expect(await supprimerActualiteAction(ID)).toEqual({ ok: true, message: "Actualité supprimée." });
    expect(cache.revalidateTag).toHaveBeenCalledWith("actualites", { expire: 0 });
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/lib/admin/actualites.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/lib/admin/actualites.ts` :

```ts
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import * as operations from "@/db/operations/actualites";
import { CONFLIT, type Intention } from "@/db/operations/commun";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { schemaEnvoiActualite } from "@/lib/validation/actualites";

export type ResultatActualite = Resultat<{ version: string }>;

const INTROUVABLE = { ok: false, message: "Actualité introuvable." } as const;
const MESSAGES: Record<Intention, string> = {
  enregistrer: "Modifications enregistrées.",
  publier: "Actualité publiée.",
  depublier: "Actualité retirée du site.",
};

function invalider(id?: string) {
  revalidateTag(TAGS.actualites, { expire: 0 });
  revalidatePath("/admin/actualites");
  if (id) revalidatePath(`/admin/actualites/${id}`);
}

function lire(donnees: FormData) {
  return schemaEnvoiActualite.safeParse(Object.fromEntries(donnees));
}

export async function creerActualite(_etat: ResultatActualite | null, donnees: FormData): Promise<ResultatActualite> {
  const resultat = await action<{ id: string }>("editeur", async () => {
    const saisie = lire(donnees);
    if (!saisie.success) return erreursDe(saisie.error);
    const { intention, modifierSlug: _modifierSlug, version: _version, ...champs } = saisie.data;
    const { id } = await operations.creerActualite(db, champs, intention);
    invalider();
    return { ok: true, donnees: { id } };
  });
  // La redirection se fait hors de `action()` : elle lève une exception propre à Next.
  if (resultat.ok) redirect(`/admin/actualites/${resultat.donnees!.id}?cree=1`);
  return resultat;
}

export async function enregistrerActualite(
  id: string,
  _etat: ResultatActualite | null,
  donnees: FormData,
): Promise<ResultatActualite> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    const saisie = lire(donnees);
    if (!saisie.success) return erreursDe(saisie.error);
    const { intention, modifierSlug, version, ...champs } = saisie.data;
    if (!version) return { ok: false, message: CONFLIT };
    const r = await operations.modifierActualite(db, id, champs, { version, intention, modifierSlug });
    invalider(id);
    return { ok: true, message: MESSAGES[intention], donnees: { version: r.version } };
  });
}

export async function supprimerActualiteAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    if (!z.uuid().safeParse(id).success) return INTROUVABLE;
    await operations.supprimerActualite(db, id);
    invalider();
    return { ok: true, message: "Actualité supprimée." };
  });
}
```

Si ESLint refuse les variables `_modifierSlug` et `_version` inutilisées, les retirer avec une petite fonction `sansMeta()` plutôt que de désactiver la règle.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/lib/admin/actualites.test.ts && npx eslint src/lib/admin/actualites.ts`
Expected: PASS, aucune erreur ESLint.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/actualites.ts src/lib/admin/actualites.test.ts
git commit -m "Server Actions des actualités

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Socle des formulaires : soumission, listes éditables, slug

**Files:**
- Create: `src/lib/admin/liste.ts`, `src/lib/admin/liste.test.ts`
- Create: `src/components/admin/champs/use-formulaire.ts`
- Create: `src/components/admin/champs/liste-editable.tsx`
- Create: `src/components/admin/champs/champ-slug.tsx`

**Interfaces:**
- Consumes: `Resultat`, `slugifier` (tâche 1), `Bouton`, `Champ` (`src/components/admin/ui.tsx`).
- Produces:
  - `deplacer<T>(liste: T[], index: number, sens: -1 | 1): T[]` et `retirer<T>(liste: T[], index: number): T[]`
  - `useFormulaire<T>(actionServeur: (etat: Resultat<T> | null, d: FormData) => Promise<Resultat<T>>)` → `{ resultat: Resultat<T> | null; enCours: boolean; formulaire: RefObject<HTMLFormElement | null>; onSubmit: (e: FormEvent<HTMLFormElement>) => void }`
  - `<ListeEditable<T> libelle name valeurInitiale nouvelElement rendu libelleAjout erreurs? />` où `rendu: (element: T, modifier: (patch: Partial<T>) => void, index: number) => ReactNode`
  - `<ChampSlug titre valeurInitiale verrouille erreurs? />` : champ `slug` et case cachée `modifierSlug` ; suit `titre` tant qu'il n'a pas été modifié à la main

- [ ] **Step 1: Écrire le test des fonctions de liste**

`src/lib/admin/liste.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { deplacer, retirer } from "./liste";

describe("listes ordonnées", () => {
  it("monte et descend un élément", () => {
    expect(deplacer(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(deplacer(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });
  it("ne sort pas des bornes", () => {
    expect(deplacer(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(deplacer(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });
  it("retire sans modifier l'original", () => {
    const l = ["a", "b"];
    expect(retirer(l, 0)).toEqual(["b"]);
    expect(l).toEqual(["a", "b"]);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/admin/liste.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter**

`src/lib/admin/liste.ts` :

```ts
// Déplacement par les boutons ↑ / ↓ : utilisables au clavier et sur mobile, contrairement au glisser-déposer.
export function deplacer<T>(liste: T[], index: number, sens: -1 | 1): T[] {
  const cible = index + sens;
  if (cible < 0 || cible >= liste.length) return liste;
  const copie = [...liste];
  [copie[index], copie[cible]] = [copie[cible], copie[index]];
  return copie;
}

export function retirer<T>(liste: T[], index: number): T[] {
  return liste.filter((_, i) => i !== index);
}
```

`src/components/admin/champs/use-formulaire.ts` :

```ts
"use client";

import { type FormEvent, useActionState, useEffect, useRef, useTransition } from "react";
import type { Resultat } from "@/lib/admin/resultat";

function empreinte(formulaire: HTMLFormElement | null): string {
  if (!formulaire) return "";
  return [...new FormData(formulaire)].map(([cle, valeur]) => `${cle}=${String(valeur)}`).join("&");
}

// Soumission par onSubmit : avec `<form action>`, React vide les champs après chaque envoi,
// ce qui ferait perdre la saisie quand le serveur renvoie une erreur.
export function useFormulaire<T>(actionServeur: (etat: Resultat<T> | null, donnees: FormData) => Promise<Resultat<T>>) {
  const [resultat, envoyer, enCours] = useActionState(actionServeur, null);
  const [, demarrer] = useTransition();
  const formulaire = useRef<HTMLFormElement>(null);
  const reference = useRef<string | null>(null);

  // État de référence : à l'affichage, puis après chaque enregistrement réussi.
  useEffect(() => {
    if (reference.current === null || resultat?.ok) reference.current = empreinte(formulaire.current);
  }, [resultat]);

  useEffect(() => {
    function avertir(e: BeforeUnloadEvent) {
      if (reference.current !== null && empreinte(formulaire.current) !== reference.current) e.preventDefault();
    }
    window.addEventListener("beforeunload", avertir);
    return () => window.removeEventListener("beforeunload", avertir);
  }, []);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Le bouton cliqué porte l'intention (enregistrer, publier, dépublier).
    const donnees = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    demarrer(() => envoyer(donnees));
  }

  return { resultat, enCours, formulaire, onSubmit };
}
```

`src/components/admin/champs/liste-editable.tsx` :

```tsx
"use client";

import { type ReactNode, useId, useRef, useState } from "react";
import { deplacer, retirer } from "@/lib/admin/liste";
import { Bouton } from "../ui";

type Element<T> = { cle: number; valeur: T };

// Liste d'éléments saisis dans le formulaire, envoyée en JSON dans un champ caché.
export function ListeEditable<T>({
  libelle,
  name,
  valeurInitiale,
  nouvelElement,
  rendu,
  libelleAjout,
  erreurs,
}: {
  libelle: string;
  name: string;
  valeurInitiale: T[];
  nouvelElement: () => T;
  rendu: (element: T, modifier: (patch: Partial<T>) => void, index: number) => ReactNode;
  libelleAjout: string;
  erreurs?: string[];
}) {
  const id = useId();
  const compteur = useRef(valeurInitiale.length);
  const [elements, setElements] = useState<Element<T>[]>(() => valeurInitiale.map((valeur, cle) => ({ cle, valeur })));

  const modifier = (index: number) => (patch: Partial<T>) =>
    setElements((l) => l.map((e, i) => (i === index ? { ...e, valeur: { ...e.valeur, ...patch } } : e)));

  return (
    <fieldset aria-describedby={erreurs?.length ? `${id}-erreur` : undefined} className="border-[1.5px] border-encre p-4">
      <legend className="px-1 font-bold">{libelle}</legend>
      <input type="hidden" name={name} value={JSON.stringify(elements.map((e) => e.valeur))} />
      <ol className="space-y-4">
        {elements.map((e, i) => (
          <li key={e.cle} className="border-b border-encre/30 pb-4">
            {rendu(e.valeur, modifier(i), i)}
            <div className="mt-2 flex flex-wrap gap-2">
              <Bouton type="button" variante="secondaire" disabled={i === 0} onClick={() => setElements((l) => deplacer(l, i, -1))} aria-label={`Monter l'élément ${i + 1}`}>
                ↑
              </Bouton>
              <Bouton type="button" variante="secondaire" disabled={i === elements.length - 1} onClick={() => setElements((l) => deplacer(l, i, 1))} aria-label={`Descendre l'élément ${i + 1}`}>
                ↓
              </Bouton>
              <Bouton type="button" variante="danger" onClick={() => setElements((l) => retirer(l, i))} aria-label={`Retirer l'élément ${i + 1}`}>
                Retirer
              </Bouton>
            </div>
          </li>
        ))}
      </ol>
      <Bouton
        type="button"
        variante="secondaire"
        className="mt-4"
        onClick={() => setElements((l) => [...l, { cle: compteur.current++, valeur: nouvelElement() }])}
      >
        {libelleAjout}
      </Bouton>
      {erreurs && erreurs.length > 0 && (
        <p id={`${id}-erreur`} className="mt-2 border-l-4 border-rouge pl-2 text-sm font-bold">
          {erreurs.join(" ")}
        </p>
      )}
    </fieldset>
  );
}
```

Les champs rendus par `rendu` n'ont pas d'attribut `name` (seul le JSON caché est envoyé) ; leurs `id` doivent inclure l'index pour rester uniques.

`src/components/admin/champs/champ-slug.tsx` :

```tsx
"use client";

import { useState } from "react";
import { slugifier } from "@/lib/admin/slug";
import { Bouton, Champ } from "../ui";

// Lien de la page : suit le titre tant qu'on ne l'a pas modifié ; verrouillé une fois le contenu publié.
export function ChampSlug({
  titre,
  valeurInitiale,
  verrouille,
  erreurs,
}: {
  titre: string;
  valeurInitiale: string;
  verrouille: boolean;
  erreurs?: string[];
}) {
  const [saisie, setSaisie] = useState<string | null>(valeurInitiale || null);
  const [deverrouille, setDeverrouille] = useState(false);
  const valeur = saisie ?? slugifier(titre);
  const bloque = verrouille && !deverrouille;

  return (
    <div>
      <Champ
        label="Lien de la page"
        name="slug"
        value={valeur}
        readOnly={bloque}
        onChange={(e) => setSaisie(e.target.value)}
        aide={
          bloque
            ? "Ce contenu a déjà été publié : son lien a pu être partagé."
            : deverrouille
              ? "Attention : l'ancien lien ne fonctionnera plus."
              : "Lettres minuscules, chiffres et tirets. Proposé à partir du titre."
        }
        erreurs={erreurs}
        required
      />
      {deverrouille && <input type="hidden" name="modifierSlug" value="on" />}
      {bloque && (
        <Bouton type="button" variante="secondaire" className="mt-2" onClick={() => setDeverrouille(true)}>
          Modifier le lien
        </Bouton>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Lancer les tests et le lint**

Run: `npx vitest run src/lib/admin/liste.test.ts && npx eslint src/components/admin/champs src/lib/admin/liste.ts`
Expected: PASS, aucune erreur ESLint (notamment `react-hooks`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/liste.ts src/lib/admin/liste.test.ts src/components/admin/champs
git commit -m "Socle des formulaires : soumission sans perte de saisie, listes éditables, champ de lien

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Sélecteur de médias corrigé, `ChampMedia` et `GaleriePhotos`

**Files:**
- Modify: `src/components/admin/selecteur-media.tsx`
- Create: `src/components/admin/champs/champ-media.tsx`

**Interfaces:**
- Consumes: `MediaChoisi` (tâche 4), `deplacer`, `retirer` (tâche 6), `chercherMedias` (existant).
- Produces:
  - `SelecteurMedia` : nouvelles props `{ libelle: string; multiple?: boolean; valeur: MediaChoisi[]; onChange: (medias: MediaChoisi[]) => void }`. Le dialogue est rendu dans un portail vers `document.body`, et seule la réponse de la dernière recherche est prise en compte.
  - `<ChampMedia libelle name valeurInitiale: MediaChoisi | null erreurs? />` : champ caché `name` = id ou `""`
  - `<GaleriePhotos libelle name valeurInitiale: MediaChoisi[] erreurs? />` : champ caché `name` = JSON des ids dans l'ordre

`SelecteurMedia` n'est encore utilisé nulle part (vérifier avec `grep -rn SelecteurMedia src`), on peut donc changer son interface.

- [ ] **Step 1: Modifier `SelecteurMedia`**

Dans `src/components/admin/selecteur-media.tsx` :

1. Importer `createPortal` de `react-dom`, `useSyncExternalStore` de `react` et le type `MediaChoisi` de `@/db/requetes/admin/commun`.
2. Remplacer l'état `choix: string[]` par une liste d'ids plus un cache des médias connus :

```tsx
const connus = useRef(new Map<string, MediaChoisi>());
const [choix, setChoix] = useState<string[]>([]);
const derniere = useRef(0);
// Le portail n'existe que dans le navigateur.
const monte = useSyncExternalStore(() => () => {}, () => true, () => false);

const memoriser = (liste: MediaChoisi[]) => liste.forEach((m) => connus.current.set(m.id, m));

const charger = (texte: string) => {
  // Seule la réponse de la dernière recherche compte : une réponse lente ne doit pas écraser la suivante.
  const numero = ++derniere.current;
  demarrer(async () => {
    try {
      const r = await chercherMedias(texte);
      if (numero !== derniere.current) return;
      if (r.ok) {
        memoriser(r.donnees ?? []);
        setMedias(r.donnees ?? []);
        setEchec(null);
        setCharge(true);
      } else setEchec(r);
    } catch {
      if (numero === derniere.current) setEchec({ ok: false, message: "Impossible de charger les images. Réessayez." });
    }
  });
};

function ouvrir() {
  memoriser(valeur);
  setChoix(valeur.map((m) => m.id));
  charger(recherche);
  dialogue.current?.showModal();
}
```

3. `basculer(id)` est inchangé (il agit sur des ids). Dans `EnvoiImages onEnvoye`, vider la recherche pour que la nouvelle image soit chargée et connue :

```tsx
onEnvoye={(id) => {
  basculer(id);
  setRecherche("");
  charger("");
}}
```

4. Le bouton « Valider » renvoie des médias :

```tsx
onClick={() => {
  onChange(choix.map((id) => connus.current.get(id)).filter((m): m is MediaChoisi => m !== undefined));
  dialogue.current?.close();
}}
```

5. Envelopper le `<dialog>` dans `{monte && createPortal(<dialog …>…</dialog>, document.body)}`, en gardant le bouton d'ouverture à sa place. Commentaire : `// Hors du formulaire hôte : ses champs (recherche, envoi) ne sont ni soumis ni imbriqués.`
6. Le compteur du bouton d'ouverture devient `valeur.length`.

Le `ref` du dialogue fonctionne à travers le portail. Les événements React remontent l'arbre React, pas le DOM : le dialogue ne contient pas de `<form>`, et la touche Entrée de la recherche fait déjà `preventDefault()`.

- [ ] **Step 2: Créer `ChampMedia` et `GaleriePhotos`**

`src/components/admin/champs/champ-media.tsx` :

```tsx
"use client";

import Image from "next/image";
import { useId, useState } from "react";
import type { MediaChoisi } from "@/db/requetes/admin/commun";
import { deplacer, retirer } from "@/lib/admin/liste";
import { SelecteurMedia } from "../selecteur-media";
import { Bouton } from "../ui";

function Vignette({ media }: { media: MediaChoisi }) {
  return (
    <span className="flex aspect-square w-24 shrink-0 items-center justify-center border-[1.5px] border-encre bg-white p-1">
      <Image
        src={media.url}
        alt=""
        width={media.width}
        height={media.height}
        sizes="96px"
        unoptimized={media.mime === "image/svg+xml"}
        className="max-h-full w-auto object-contain"
      />
    </span>
  );
}

function Erreurs({ id, erreurs }: { id: string; erreurs?: string[] }) {
  if (!erreurs?.length) return null;
  return (
    <p id={id} className="mt-2 border-l-4 border-rouge pl-2 text-sm font-bold">
      {erreurs.join(" ")}
    </p>
  );
}

// Une seule image (affiche, portrait, logo).
export function ChampMedia({
  libelle,
  name,
  valeurInitiale,
  erreurs,
}: {
  libelle: string;
  name: string;
  valeurInitiale: MediaChoisi | null;
  erreurs?: string[];
}) {
  const id = useId();
  const [media, setMedia] = useState(valeurInitiale);
  return (
    <fieldset aria-describedby={erreurs?.length ? id : undefined} className="border-[1.5px] border-encre p-4">
      <legend className="px-1 font-bold">{libelle}</legend>
      <input type="hidden" name={name} value={media?.id ?? ""} />
      {media ? (
        <div className="flex flex-wrap items-center gap-4">
          <Vignette media={media} />
          <p className="min-w-0 flex-1">{media.alt}</p>
          <Bouton type="button" variante="danger" onClick={() => setMedia(null)}>
            Retirer
          </Bouton>
        </div>
      ) : (
        <p className="mb-3">Aucune image.</p>
      )}
      <div className="mt-3">
        <SelecteurMedia
          libelle={media ? "Changer d'image" : "Choisir une image"}
          valeur={media ? [media] : []}
          onChange={(l) => setMedia(l[0] ?? null)}
        />
      </div>
      <Erreurs id={id} erreurs={erreurs} />
    </fieldset>
  );
}

// Plusieurs images ordonnées ; la première sert de vignette dans les listes du site.
export function GaleriePhotos({
  libelle,
  name,
  valeurInitiale,
  erreurs,
}: {
  libelle: string;
  name: string;
  valeurInitiale: MediaChoisi[];
  erreurs?: string[];
}) {
  const id = useId();
  const [photos, setPhotos] = useState(valeurInitiale);
  return (
    <fieldset aria-describedby={erreurs?.length ? id : undefined} className="border-[1.5px] border-encre p-4">
      <legend className="px-1 font-bold">{libelle}</legend>
      <input type="hidden" name={name} value={JSON.stringify(photos.map((p) => p.id))} />
      {photos.length === 0 ? (
        <p className="mb-3">Aucune photo.</p>
      ) : (
        <ol className="mb-3 space-y-3">
          {photos.map((p, i) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3">
              <Vignette media={p} />
              <p className="min-w-0 flex-1">
                {i === 0 && <strong>Vignette · </strong>}
                {p.alt}
              </p>
              <div className="flex gap-2">
                <Bouton type="button" variante="secondaire" disabled={i === 0} onClick={() => setPhotos((l) => deplacer(l, i, -1))} aria-label={`Monter la photo ${i + 1}`}>
                  ↑
                </Bouton>
                <Bouton type="button" variante="secondaire" disabled={i === photos.length - 1} onClick={() => setPhotos((l) => deplacer(l, i, 1))} aria-label={`Descendre la photo ${i + 1}`}>
                  ↓
                </Bouton>
                <Bouton type="button" variante="danger" onClick={() => setPhotos((l) => retirer(l, i))} aria-label={`Retirer la photo ${i + 1}`}>
                  Retirer
                </Bouton>
              </div>
            </li>
          ))}
        </ol>
      )}
      <SelecteurMedia libelle="Choisir les photos" multiple valeur={photos} onChange={setPhotos} />
      <Erreurs id={id} erreurs={erreurs} />
    </fieldset>
  );
}
```

- [ ] **Step 3: Vérifier types et lint**

Run: `npx tsc --noEmit && npx eslint src/components/admin`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/selecteur-media.tsx src/components/admin/champs/champ-media.tsx
git commit -m "Sélecteur de médias hors du formulaire hôte, réponses de recherche dans l'ordre ; champs image et galerie

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Éditeur riche Tiptap et styles du texte long

**Files:**
- Modify: `package.json`, `package-lock.json` (dépendances)
- Create: `src/components/admin/champs/editeur-riche.tsx`
- Create: `src/components/admin/champs/zone-tiptap.tsx`
- Modify: `src/app/globals.css` (bloc `.texte-long`)

**Interfaces:**
- Produces: `<EditeurRiche libelle name valeurInitiale aide? erreurs? />`. Il envoie le HTML dans le champ caché `name`, et sa zone d'édition a le rôle `textbox` et le nom `libelle`.

- [ ] **Step 1: Installer Tiptap**

Run: `npm install @tiptap/react@3.31.4 @tiptap/pm@3.31.4 @tiptap/starter-kit@3.31.4`

Dans Tiptap 3, StarterKit inclut déjà l'extension Link (et Underline) : ne pas installer `@tiptap/extension-link`. Lire les options de `StarterKit.configure` et de `link` dans `node_modules/@tiptap/starter-kit/dist/index.d.ts` et `node_modules/@tiptap/extension-link/dist/index.d.ts` avant d'écrire le composant.

- [ ] **Step 2: Créer la zone Tiptap**

`src/components/admin/champs/zone-tiptap.tsx` :

```tsx
"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import { Bouton } from "../ui";

const PROTOCOLES = /^(https?:\/\/|mailto:)/i;

// Limité aux balises acceptées par nettoyerHtml (src/lib/html.ts) ; le serveur renettoie de toute façon.
const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: { openOnClick: false, autolink: true, defaultProtocol: "https", isAllowedUri: (url) => PROTOCOLES.test(url) },
  }),
];

const styleOutil =
  "min-h-11 min-w-11 border-[1.5px] border-encre px-2 font-bold aria-pressed:bg-brun aria-pressed:text-papier disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-moutarde";

export default function ZoneTiptap({
  valeurInitiale,
  onChange,
  idLibelle,
  idDescription,
  invalide,
}: {
  valeurInitiale: string;
  onChange: (html: string) => void;
  idLibelle: string;
  idDescription?: string;
  invalide: boolean;
}) {
  const [lien, setLien] = useState<string | null>(null);
  const [erreurLien, setErreurLien] = useState("");
  const editeur = useEditor({
    extensions,
    content: valeurInitiale,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": idLibelle,
        ...(idDescription ? { "aria-describedby": idDescription } : {}),
        ...(invalide ? { "aria-invalid": "true" } : {}),
        class: "texte-long min-h-64 bg-white px-4 py-3 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  const etat = useEditorState({
    editor: editeur,
    selector: ({ editor }) =>
      editor && {
        paragraphe: editor.isActive("paragraph"),
        h2: editor.isActive("heading", { level: 2 }),
        h3: editor.isActive("heading", { level: 3 }),
        gras: editor.isActive("bold"),
        italique: editor.isActive("italic"),
        puces: editor.isActive("bulletList"),
        numeros: editor.isActive("orderedList"),
        citation: editor.isActive("blockquote"),
        lien: editor.isActive("link"),
        annuler: editor.can().undo(),
        retablir: editor.can().redo(),
      },
  });

  if (!editeur || !etat) return <div className="min-h-64 bg-white" />;
  const chaine = () => editeur.chain().focus();

  const outils = [
    { libelle: "Paragraphe", actif: etat.paragraphe, faire: () => chaine().setParagraph().run() },
    { libelle: "Titre 2", actif: etat.h2, faire: () => chaine().toggleHeading({ level: 2 }).run() },
    { libelle: "Titre 3", actif: etat.h3, faire: () => chaine().toggleHeading({ level: 3 }).run() },
    { libelle: "Gras", actif: etat.gras, faire: () => chaine().toggleBold().run() },
    { libelle: "Italique", actif: etat.italique, faire: () => chaine().toggleItalic().run() },
    { libelle: "Liste à puces", actif: etat.puces, faire: () => chaine().toggleBulletList().run() },
    { libelle: "Liste numérotée", actif: etat.numeros, faire: () => chaine().toggleOrderedList().run() },
    { libelle: "Citation", actif: etat.citation, faire: () => chaine().toggleBlockquote().run() },
  ];

  function appliquerLien() {
    const adresse = (lien ?? "").trim();
    if (adresse === "") {
      chaine().extendMarkRange("link").unsetLink().run();
    } else if (!PROTOCOLES.test(adresse)) {
      setErreurLien("L'adresse doit commencer par https://, http:// ou mailto:.");
      return;
    } else if (editeur!.state.selection.empty && !etat!.lien) {
      // Sans texte sélectionné, l'adresse elle-même devient le texte du lien.
      chaine().insertContent({ type: "text", text: adresse, marks: [{ type: "link", attrs: { href: adresse } }] }).run();
    } else {
      chaine().extendMarkRange("link").setLink({ href: adresse }).run();
    }
    setLien(null);
    setErreurLien("");
  }

  return (
    <div className={`border-[1.5px] ${invalide ? "border-rouge" : "border-encre"}`}>
      <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap gap-1 border-b-[1.5px] border-encre bg-sable p-2">
        {outils.map((o) => (
          <button key={o.libelle} type="button" aria-pressed={o.actif} onClick={o.faire} className={styleOutil}>
            {o.libelle}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={etat.lien}
          aria-expanded={lien !== null}
          onClick={() => setLien(editeur.getAttributes("link").href ?? "")}
          className={styleOutil}
        >
          Lien
        </button>
        <button type="button" disabled={!etat.annuler} onClick={() => chaine().undo().run()} className={styleOutil}>
          Annuler
        </button>
        <button type="button" disabled={!etat.retablir} onClick={() => chaine().redo().run()} className={styleOutil}>
          Rétablir
        </button>
      </div>
      {lien !== null && (
        <div className="flex flex-wrap items-end gap-2 border-b-[1.5px] border-encre p-3">
          <label className="min-w-0 flex-1 font-bold">
            Adresse du lien
            <input
              type="url"
              value={lien}
              onChange={(e) => setLien(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  appliquerLien();
                }
              }}
              className="mt-1 block min-h-11 w-full border-[1.5px] border-encre bg-white px-3 font-normal"
              autoFocus
            />
          </label>
          <Bouton type="button" onClick={appliquerLien}>
            Appliquer
          </Bouton>
          <Bouton type="button" variante="secondaire" onClick={() => setLien(null)}>
            Fermer
          </Bouton>
          {erreurLien && (
            <p role="alert" className="w-full border-l-4 border-rouge pl-2 text-sm font-bold">
              {erreurLien}
            </p>
          )}
        </div>
      )}
      <EditorContent editor={editeur} />
    </div>
  );
}
```

Si la signature de `isAllowedUri` ou le nom d'une option diffère dans la version installée, suivre le `.d.ts` en gardant le même comportement. Tous les boutons sont `type="button"` pour ne jamais soumettre le formulaire.

- [ ] **Step 3: Créer le champ `EditeurRiche`**

`src/components/admin/champs/editeur-riche.tsx` :

```tsx
"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";

// Tiptap n'est chargé que dans l'admin, et seulement dans le navigateur.
const ZoneTiptap = dynamic(() => import("./zone-tiptap"), {
  ssr: false,
  loading: () => <div className="min-h-80 animate-pulse border-[1.5px] border-encre bg-white" aria-hidden />,
});

export function EditeurRiche({
  libelle,
  name,
  valeurInitiale,
  aide,
  erreurs,
}: {
  libelle: string;
  name: string;
  valeurInitiale: string;
  aide?: string;
  erreurs?: string[];
}) {
  const id = useId();
  const [html, setHtml] = useState(valeurInitiale);
  const description = [aide && `${id}-aide`, erreurs?.length && `${id}-erreur`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <p id={`${id}-libelle`} className="mb-1 font-bold">
        {libelle}
      </p>
      {/* Présent dès le premier rendu : le formulaire l'envoie même si l'éditeur n'a pas fini de charger. */}
      <input type="hidden" name={name} value={html} />
      <ZoneTiptap
        valeurInitiale={valeurInitiale}
        onChange={setHtml}
        idLibelle={`${id}-libelle`}
        idDescription={description}
        invalide={Boolean(erreurs?.length)}
      />
      {aide && (
        <p id={`${id}-aide`} className="mt-1 text-sm">
          {aide}
        </p>
      )}
      {erreurs && erreurs.length > 0 && (
        <p id={`${id}-erreur`} className="mt-1 border-l-4 border-rouge pl-2 text-sm font-bold">
          {erreurs.join(" ")}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Styler les éléments riches dans `.texte-long`**

Dans `src/app/globals.css`, après les règles `.texte-long p` existantes :

```css
.texte-long h2,
.texte-long h3 {
  font-family: var(--font-titre);
  line-height: 1.15;
  max-width: 40ch;
  margin-top: 1.6em;
}
.texte-long h2 {
  font-size: 1.75rem;
}
.texte-long h3 {
  font-size: 1.375rem;
}
.texte-long ul,
.texte-long ol {
  font-size: 1.125rem;
  line-height: 1.7;
  max-width: 68ch;
  margin-top: 1.1em;
  padding-left: 1.5em;
}
.texte-long ul {
  list-style: disc;
}
.texte-long ol {
  list-style: decimal;
}
.texte-long blockquote {
  max-width: 64ch;
  margin-top: 1.1em;
  border-left: 4px solid var(--color-moutarde);
  padding-left: 1em;
  font-style: italic;
}
.texte-long a {
  text-decoration: underline;
  text-underline-offset: 4px;
}
.texte-long > :first-child {
  margin-top: 0;
}
```

Les articles actuels n'ont que des `<p>` : leur rendu ne change pas.

- [ ] **Step 5: Vérifier types, lint et build**

Run: `npx tsc --noEmit && npx eslint src/components/admin/champs && npm run build`
Expected: aucune erreur ; le build réussit.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/admin/champs/editeur-riche.tsx src/components/admin/champs/zone-tiptap.tsx src/app/globals.css
git commit -m "Éditeur riche Tiptap limité aux balises autorisées ; styles des titres, listes et citations du texte long

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Aperçu par Draft Mode

**Files:**
- Create: `src/lib/apercu.ts`, `src/lib/apercu.test.ts`
- Create: `src/lib/admin/apercu-actions.ts`
- Create: `src/app/api/apercu/route.ts`
- Create: `src/components/bandeau-apercu.tsx`
- Modify: `src/components/coquille-site.tsx`
- Modify: `src/lib/content/actualites.ts`
- Modify: `src/app/(site)/actualites/[slug]/page.tsx`

**Interfaces:**
- Consumes: `lireSession()` (`src/lib/session.ts`), `cheminApercu()` (tâche 4), `trouverActualite(db, slug, { brouillons })` (tâche 4).
- Produces:
  - `apercuAutorise(): Promise<boolean>`
  - `quitterApercu(): Promise<void>` (Server Action)
  - `GET /api/apercu?type=actualite&id=<uuid>`
  - `getActualitePourPage(slug: string): Promise<Actualite | undefined>`

- [ ] **Step 1: Écrire le test de la garde**

`src/lib/apercu.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const draftMode = vi.hoisted(() => vi.fn());
const lireSession = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ draftMode }));
vi.mock("@/lib/session", () => ({ lireSession }));

import { apercuAutorise } from "./apercu";

beforeEach(() => vi.clearAllMocks());

describe("apercuAutorise", () => {
  it("refuse hors Draft Mode, sans lire la session (la page reste statique)", async () => {
    draftMode.mockResolvedValue({ isEnabled: false });
    expect(await apercuAutorise()).toBe(false);
    expect(lireSession).not.toHaveBeenCalled();
  });

  it("refuse un cookie d'aperçu sans session admin", async () => {
    draftMode.mockResolvedValue({ isEnabled: true });
    lireSession.mockResolvedValue(null);
    expect(await apercuAutorise()).toBe(false);
  });

  it("autorise le Draft Mode avec une session admin", async () => {
    draftMode.mockResolvedValue({ isEnabled: true });
    lireSession.mockResolvedValue({ userId: "u1", role: "editeur" });
    expect(await apercuAutorise()).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `npx vitest run src/lib/apercu.test.ts`
Expected: FAIL (module introuvable).

- [ ] **Step 3: Implémenter la garde, la route et l'action de sortie**

`src/lib/apercu.ts` :

```ts
import { draftMode } from "next/headers";
import { lireSession } from "@/lib/session";

// Un brouillon n'est servi qu'avec le cookie d'aperçu ET une session admin valide.
// La session n'est lue qu'en Draft Mode : ailleurs, les pages publiques restent statiques.
export async function apercuAutorise(): Promise<boolean> {
  if (!(await draftMode()).isEnabled) return false;
  return (await lireSession()) !== null;
}
```

`src/lib/admin/apercu-actions.ts` :

```ts
"use server";

import { draftMode } from "next/headers";

export async function quitterApercu(): Promise<void> {
  (await draftMode()).disable();
}
```

`src/app/api/apercu/route.ts` :

```ts
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
```

- [ ] **Step 4: Bandeau du site**

`src/components/bandeau-apercu.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { quitterApercu } from "@/lib/admin/apercu-actions";

// Barre fixe en bas d'écran : ne gêne ni l'en-tête du site ni ses animations.
export function BandeauApercu() {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[100] flex flex-wrap items-center justify-center gap-3 border-t-[1.5px] border-encre bg-moutarde px-4 py-3 text-encre">
      <p className="font-bold">Aperçu : ce contenu n&apos;est peut-être pas publié.</p>
      <button
        type="button"
        disabled={enCours}
        onClick={() =>
          demarrer(async () => {
            await quitterApercu();
            router.refresh();
          })
        }
        className="min-h-11 border-[1.5px] border-encre bg-papier px-4 font-bold focus-visible:outline-3 focus-visible:outline-brun"
      >
        Quitter l&apos;aperçu
      </button>
    </div>
  );
}
```

Dans `src/components/coquille-site.tsx`, importer `draftMode` de `next/headers` et `BandeauApercu`, lire `const apercu = (await draftMode()).isEnabled;` au début de `CoquilleSite`, et rendre `{apercu && <BandeauApercu />}` juste avant la fermeture de l'élément racine renvoyé (après le pied de page). `draftMode()` ne rend pas la page dynamique.

- [ ] **Step 5: Page publique d'une actualité**

Dans `src/lib/content/actualites.ts`, ajouter :

```ts
import { apercuAutorise } from "@/lib/apercu";
import type { Actualite } from "./types";

// En aperçu, lecture directe (brouillons compris) ; sinon, version en cache et publiée.
export async function getActualitePourPage(slug: string): Promise<Actualite | undefined> {
  if (await apercuAutorise()) return trouverActualite(db, slug, { brouillons: true });
  return getActualite(slug);
}
```

S'assurer que `getActualite` reste écrit `unstable_cache((slug: string) => trouverActualite(db, slug), …)`.

Dans `src/app/(site)/actualites/[slug]/page.tsx`, remplacer les deux appels `getActualite(slug)` (dans `generateMetadata` et dans `Article`) par `getActualitePourPage(slug)`, et mettre à jour l'import. `generateStaticParams` garde `getActualites()`.

- [ ] **Step 6: Vérifier**

Run: `npx vitest run src/lib/apercu.test.ts && npx tsc --noEmit && npm run build`
Expected: PASS. Dans la sortie du build, `/actualites/[slug]` reste prérendu (● SSG) : la garde ne lit pas la session hors Draft Mode.

- [ ] **Step 7: Commit**

```bash
git add src/lib/apercu.ts src/lib/apercu.test.ts src/lib/admin/apercu-actions.ts src/app/api/apercu src/components/bandeau-apercu.tsx src/components/coquille-site.tsx src/lib/content/actualites.ts "src/app/(site)/actualites/[slug]/page.tsx"
git commit -m "Aperçu des brouillons par Draft Mode, réservé aux sessions admin, avec bandeau de sortie

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Écrans des actualités dans l'admin

**Files:**
- Create: `src/components/admin/liste.tsx`
- Create: `src/components/admin/champs/barre-publication.tsx`
- Create: `src/app/admin/(espace)/actualites/page.tsx`
- Create: `src/app/admin/(espace)/actualites/nouveau/page.tsx`
- Create: `src/app/admin/(espace)/actualites/[id]/page.tsx`
- Create: `src/app/admin/(espace)/actualites/formulaire.tsx`
- Modify: `src/app/admin/(espace)/[rubrique]/page.tsx` (retirer `actualites`)

**Interfaces:**
- Consumes: tout ce qui précède : `listerActualitesAdmin`, `lireActualiteAdmin`, `ActualiteAdmin`, `lireFiltre`, `urlListe`, `Filtre`, `PAR_PAGE`, `creerActualite`, `enregistrerActualite`, `supprimerActualiteAction`, `ResultatActualite`, `useFormulaire`, `ListeEditable`, `ChampSlug`, `GaleriePhotos`, `EditeurRiche`, `BoutonConfirmation`, composants de `ui.tsx`.
- Produces:
  - `<FiltresListe base filtre avecStatut />`, `<Pagination base filtre total />`
  - `<BarrePublication statut: "brouillon" | "publie" | null enCours apercu?: string onSupprimer? libelleSupprimer? />`. `statut` vaut `null` à la création. Les boutons de soumission portent `name="intention"`.

- [ ] **Step 1: Composants de liste**

`src/components/admin/liste.tsx` :

```tsx
import Link from "next/link";
import { type Filtre, urlListe } from "@/lib/admin/filtre";
import { PAR_PAGE } from "@/db/requetes/admin/commun";
import { Bouton, Champ, Selection } from "./ui";

export function FiltresListe({ base, filtre, avecStatut = true }: { base: string; filtre: Filtre; avecStatut?: boolean }) {
  return (
    <form role="search" action={base} className="mb-6 flex flex-wrap items-end gap-3">
      <Champ label="Rechercher" name="q" type="search" defaultValue={filtre.q} className="w-full max-w-sm" />
      {avecStatut && (
        <Selection
          label="Statut"
          name="statut"
          defaultValue={filtre.statut ?? ""}
          options={[
            { valeur: "", libelle: "Tous" },
            { valeur: "publie", libelle: "Publiés" },
            { valeur: "brouillon", libelle: "Brouillons" },
          ]}
        />
      )}
      <Bouton type="submit" variante="secondaire">
        Filtrer
      </Bouton>
    </form>
  );
}

export function Pagination({ base, filtre, total }: { base: string; filtre: Filtre; total: number }) {
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  if (pages === 1) return null;
  const lien = "inline-flex min-h-11 items-center border-[1.5px] border-encre px-4 font-bold hover:bg-sable";
  return (
    <nav aria-label="Pagination" className="mt-6 flex flex-wrap items-center gap-3">
      {filtre.page > 1 && (
        <Link href={urlListe(base, filtre, filtre.page - 1)} className={lien}>
          ← Précédente
        </Link>
      )}
      <p>
        Page {filtre.page} sur {pages}
      </p>
      {filtre.page < pages && (
        <Link href={urlListe(base, filtre, filtre.page + 1)} className={lien}>
          Suivante →
        </Link>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Barre de publication**

`src/components/admin/champs/barre-publication.tsx` :

```tsx
"use client";

import { BoutonConfirmation } from "../confirmation";
import { Badge, Bouton } from "../ui";

// Statut et boutons d'un contenu ; chaque bouton de soumission porte son intention.
export function BarrePublication({
  statut,
  enCours,
  apercu,
  onSupprimer,
  libelleSupprimer = "Supprimer",
}: {
  statut: "brouillon" | "publie" | null;
  enCours: boolean;
  apercu?: string;
  onSupprimer?: () => void;
  libelleSupprimer?: string;
}) {
  const publie = statut === "publie";
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t-[1.5px] border-encre bg-papier px-4 py-3 sm:-mx-8 sm:px-8">
      {statut && <Badge ton={publie ? "vert" : "moutarde"}>{publie ? "Publié" : "Brouillon"}</Badge>}
      <Bouton type="submit" name="intention" value="enregistrer" variante={publie ? "principal" : "secondaire"} disabled={enCours}>
        {enCours ? "Enregistrement…" : publie ? "Enregistrer" : "Enregistrer le brouillon"}
      </Bouton>
      {publie ? (
        <Bouton type="submit" name="intention" value="depublier" variante="secondaire" disabled={enCours}>
          Dépublier
        </Bouton>
      ) : (
        <Bouton type="submit" name="intention" value="publier" disabled={enCours}>
          Publier
        </Bouton>
      )}
      {apercu && (
        <a
          href={apercu}
          target="_blank"
          rel="noopener"
          className="inline-flex min-h-11 items-center px-2 font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-moutarde"
        >
          Aperçu
        </a>
      )}
      {onSupprimer && (
        <div className="ml-auto">
          <BoutonConfirmation
            libelle={libelleSupprimer}
            question="Supprimer définitivement ce contenu ? Les images restent dans la médiathèque."
            confirmer="Supprimer"
            disabled={enCours}
            onConfirmer={onSupprimer}
          />
        </div>
      )}
    </div>
  );
}
```

Le lien d'aperçu reflète la dernière version **enregistrée** : le formulaire l'indique sous la barre (étape 3).

- [ ] **Step 3: Formulaire client**

`src/app/admin/(espace)/actualites/formulaire.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BarrePublication } from "@/components/admin/champs/barre-publication";
import { GaleriePhotos } from "@/components/admin/champs/champ-media";
import { ChampSlug } from "@/components/admin/champs/champ-slug";
import { EditeurRiche } from "@/components/admin/champs/editeur-riche";
import { ListeEditable } from "@/components/admin/champs/liste-editable";
import { useFormulaire } from "@/components/admin/champs/use-formulaire";
import { Alerte, Champ } from "@/components/admin/ui";
import type { ActualiteAdmin } from "@/db/requetes/admin/actualites";
import { creerActualite, enregistrerActualite, supprimerActualiteAction } from "@/lib/admin/actualites";
import type { Resultat } from "@/lib/admin/resultat";
import type { Source, Video } from "@/lib/content/types";

const aujourdhui = () => new Date().toISOString().slice(0, 10);

export function FormulaireActualite({ actualite, messageInitial }: { actualite?: ActualiteAdmin; messageInitial?: string }) {
  const router = useRouter();
  const { resultat, enCours, formulaire, onSubmit } = useFormulaire(
    actualite ? enregistrerActualite.bind(null, actualite.id) : creerActualite,
  );
  const [titre, setTitre] = useState(actualite?.titre ?? "");
  const [suppression, setSuppression] = useState<Resultat | null>(null);
  const [suppressionEnCours, demarrer] = useTransition();
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  const version = (resultat?.ok && resultat.donnees?.version) || actualite?.version;
  const message = resultat ?? suppression ?? (messageInitial ? { ok: true as const, message: messageInitial } : null);

  return (
    <form ref={formulaire} onSubmit={onSubmit} noValidate className="space-y-6">
      <Alerte resultat={message} />
      {version && <input type="hidden" name="version" value={version} />}
      <Champ label="Titre" name="titre" value={titre} onChange={(e) => setTitre(e.target.value)} erreurs={erreurs?.titre} required />
      <ChampSlug titre={titre} valeurInitiale={actualite?.slug ?? ""} verrouille={actualite?.dejaPubliee ?? false} erreurs={erreurs?.slug} />
      <Champ label="Date" name="date" type="date" defaultValue={actualite?.date ?? aujourdhui()} erreurs={erreurs?.date} required className="max-w-xs" />
      <div>
        <label htmlFor="champ-resume" className="block font-bold">
          Résumé
        </label>
        <textarea
          id="champ-resume"
          name="resume"
          rows={3}
          defaultValue={actualite?.resume}
          aria-invalid={erreurs?.resume ? true : undefined}
          aria-describedby="champ-resume-aide"
          className="mt-1 block w-full border-[1.5px] border-encre bg-white px-3 py-2 aria-invalid:border-rouge focus-visible:outline-3 focus-visible:outline-moutarde"
        />
        <p id="champ-resume-aide" className="mt-1 text-sm">
          Deux ou trois phrases, affichées dans les listes et en tête de l&apos;article.
        </p>
        {erreurs?.resume && <p className="mt-1 border-l-4 border-rouge pl-2 text-sm font-bold">{erreurs.resume.join(" ")}</p>}
      </div>
      <EditeurRiche libelle="Texte" name="corps" valeurInitiale={actualite?.corps ?? ""} erreurs={erreurs?.corps} />
      <GaleriePhotos libelle="Photos" name="photos" valeurInitiale={actualite?.photos ?? []} erreurs={erreurs?.photos} />
      <ListeEditable<Source>
        libelle="Sources"
        name="sources"
        valeurInitiale={actualite?.sources ?? []}
        nouvelElement={() => ({ label: "", url: "" })}
        libelleAjout="Ajouter une source"
        erreurs={erreurs?.sources}
        rendu={(s, modifier, i) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`source-${i}-label`} label="Nom de la source" name={`source-${i}-label`} form="" value={s.label} onChange={(e) => modifier({ label: e.target.value })} />
            <Champ id={`source-${i}-url`} label="Adresse" name={`source-${i}-url`} form="" type="url" value={s.url} onChange={(e) => modifier({ url: e.target.value })} />
          </div>
        )}
      />
      <ListeEditable<Video>
        libelle="Vidéos YouTube"
        name="videos"
        valeurInitiale={actualite?.videos ?? []}
        nouvelElement={() => ({ id: "", titre: "" })}
        libelleAjout="Ajouter une vidéo"
        erreurs={erreurs?.videos}
        rendu={(v, modifier, i) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={`video-${i}-id`} label="Adresse ou identifiant YouTube" name={`video-${i}-id`} form="" value={v.id} onChange={(e) => modifier({ id: e.target.value })} />
            <Champ id={`video-${i}-titre`} label="Titre de la vidéo" name={`video-${i}-titre`} form="" value={v.titre} onChange={(e) => modifier({ titre: e.target.value })} />
          </div>
        )}
      />
      {actualite && <p className="text-sm">L&apos;aperçu montre la dernière version enregistrée.</p>}
      <BarrePublication
        statut={actualite?.statut ?? null}
        enCours={enCours || suppressionEnCours}
        apercu={actualite ? `/api/apercu?type=actualite&id=${actualite.id}` : undefined}
        libelleSupprimer="Supprimer l'actualité"
        onSupprimer={
          actualite
            ? () =>
                demarrer(async () => {
                  const r = await supprimerActualiteAction(actualite.id);
                  if (r.ok) router.push("/admin/actualites");
                  else setSuppression(r);
                })
            : undefined
        }
      />
    </form>
  );
}
```

`form=""` détache les champs internes des listes du formulaire : seul le JSON caché est envoyé. `Champ` transmet les props restantes à `<input>`, `form` compris. Vérifier aussi que `Champ` accepte un `id` explicite, ce qui est le cas : `props.id ?? …`.

Le message de création (`?cree=1`) disparaît à la première action, car `resultat` prend alors le dessus. Le statut affiché provient des props, qui sont rafraîchies par `revalidatePath`.

- [ ] **Step 4: Pages**

`src/app/admin/(espace)/actualites/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { FiltresListe, Pagination } from "@/components/admin/liste";
import { Badge, EtatVide, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerActualitesAdmin } from "@/db/requetes/admin/actualites";
import { lireFiltre } from "@/lib/admin/filtre";
import { formatDate } from "@/components/ui";
import { exigerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Actualités" };

const BASE = "/admin/actualites";

export default async function Actualites({ searchParams }: PageProps<"/admin/actualites">) {
  await exigerSession();
  const filtre = lireFiltre(await searchParams);
  const { lignes, total } = await listerActualitesAdmin(db, filtre);

  return (
    <>
      <TitrePage
        action={
          <Link href={`${BASE}/nouveau`} className="inline-flex min-h-11 items-center bg-brun px-4 py-2 font-bold text-papier hover:bg-encre focus-visible:outline-3 focus-visible:outline-moutarde">
            Nouvelle actualité
          </Link>
        }
      >
        Actualités
      </TitrePage>
      <FiltresListe base={BASE} filtre={filtre} />
      {lignes.length === 0 ? (
        <EtatVide>{filtre.q || filtre.statut ? "Aucune actualité ne correspond." : "Aucune actualité pour le moment."}</EtatVide>
      ) : (
        <ul className="divide-y divide-encre/30 border-y-[1.5px] border-encre">
          {lignes.map((a) => (
            <li key={a.id}>
              <Link href={`${BASE}/${a.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 hover:bg-sable focus-visible:outline-3 focus-visible:outline-moutarde">
                <span className="min-w-0 flex-1 font-bold">{a.titre}</span>
                <span className="text-sm">{formatDate(a.date)}</span>
                <Badge ton={a.statut === "publie" ? "vert" : "moutarde"}>{a.statut === "publie" ? "Publié" : "Brouillon"}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Pagination base={BASE} filtre={filtre} total={total} />
    </>
  );
}
```

`formatDate(iso)` est la fonction de date du site public (`src/components/ui.tsx`, utilisée par `DateTexte`) ; elle n'a pas de dépendance client et s'importe depuis une page serveur de l'admin.

`src/app/admin/(espace)/actualites/nouveau/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { TitrePage } from "@/components/admin/ui";
import { exigerSession } from "@/lib/session";
import { FormulaireActualite } from "../formulaire";

export const metadata: Metadata = { title: "Nouvelle actualité" };

export default async function NouvelleActualite() {
  await exigerSession();
  return (
    <>
      <p className="mb-4">
        <Link href="/admin/actualites" className="underline underline-offset-4">
          ← Actualités
        </Link>
      </p>
      <TitrePage>Nouvelle actualité</TitrePage>
      <FormulaireActualite />
    </>
  );
}
```

`src/app/admin/(espace)/actualites/[id]/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireActualiteAdmin } from "@/db/requetes/admin/actualites";
import { exigerSession } from "@/lib/session";
import { FormulaireActualite } from "../formulaire";

export const metadata: Metadata = { title: "Modifier une actualité" };

export default async function ModifierActualite({ params, searchParams }: PageProps<"/admin/actualites/[id]">) {
  await exigerSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const actualite = await lireActualiteAdmin(db, id);
  if (!actualite) notFound();
  const { cree } = await searchParams;

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/actualites" className="underline underline-offset-4">
          ← Actualités
        </Link>
      </p>
      <TitrePage>{actualite.titre}</TitrePage>
      <FormulaireActualite actualite={actualite} messageInitial={cree ? "Actualité créée." : undefined} />
    </>
  );
}
```

Pas de `key` sur le formulaire : après un enregistrement, `revalidatePath` rafraîchit les props, mais le formulaire garde son état (message de succès, saisie) et suit la version renvoyée par l'action (`resultat.donnees.version`).

Dans `src/app/admin/(espace)/[rubrique]/page.tsx`, supprimer l'entrée `actualites` de `rubriques`.

- [ ] **Step 5: Vérification manuelle**

Run: `npx next dev -p 3100`, se connecter, puis :
1. `/admin/actualites` liste les 5 actualités du site, toutes publiées. La recherche « forum » en garde une.
2. « Nouvelle actualité » : le lien se remplit en tapant le titre. Envoyer sans résumé : l'erreur s'affiche sous « Résumé » et le titre reste saisi.
3. Remplir, mettre du gras, ajouter un lien et une photo, puis « Enregistrer le brouillon » : on arrive sur la fiche avec « Actualité créée. ».
4. « Aperçu » ouvre un onglet avec le bandeau. « Quitter l'aperçu » ramène à « Page introuvable ».
5. Supprimer le brouillon : retour à la liste.

Ne publier aucun contenu de test : la base est celle de la production.

- [ ] **Step 6: Lint, types, tests, build**

Run: `npx eslint . && npx tsc --noEmit && npm test && npm run build`
Expected: tout passe.

- [ ] **Step 7: Commit**

```bash
git add src/components/admin/liste.tsx src/components/admin/champs/barre-publication.tsx "src/app/admin/(espace)/actualites" "src/app/admin/(espace)/[rubrique]/page.tsx"
git commit -m "Écrans des actualités : liste filtrée et paginée, création, modification, publication, suppression

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Parcours de bout en bout des actualités

**Files:**
- Create: `e2e/actualites.spec.ts`
- Modify: `e2e/nettoyage.ts`, `e2e/preparation.ts`
- Modify: `e2e/admin.spec.ts` (exporter `seConnecterEtAttendre` si besoin, ou le déplacer dans `e2e/comptes.ts`)

**Interfaces:**
- Consumes: `COMPTES`, `motDePasseE2E` (`e2e/comptes.ts`) ; libellés de l'interface des tâches 6 à 10.

- [ ] **Step 1: Nettoyage des contenus de test**

Dans `e2e/nettoyage.ts` et au début de `preparation()` (après la garde `E2E_AUTORISE`), ajouter :

```ts
import { actualites } from "../src/db/schema";
// …
// Contenus créés par les tests : leur lien commence toujours par « e2e- ».
await db.delete(actualites).where(like(actualites.slug, "e2e-%"));
```

Déplacer `seConnecter` et `seConnecterEtAttendre` de `e2e/admin.spec.ts` vers `e2e/comptes.ts`, les exporter, puis les importer dans les deux fichiers de tests.

- [ ] **Step 2: Écrire le parcours**

`e2e/actualites.spec.ts` :

```ts
import { expect, test } from "@playwright/test";
import { COMPTES, seConnecterEtAttendre } from "./comptes";

const TITRE = "E2E Actualité de test";
const SLUG = "e2e-actualite-de-test";
// La base est partagée avec la production : on ne publie que sur une base dédiée.
const baseDediee = process.env.E2E_BASE_DEDIEE === "1";

test("un éditeur rédige, prévisualise puis supprime une actualité", async ({ page, context }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/actualites");
  await page.getByRole("link", { name: "Nouvelle actualité" }).click();

  await page.getByLabel("Titre").fill(TITRE);
  await expect(page.getByLabel("Lien de la page")).toHaveValue(SLUG);

  // Une erreur ne doit pas effacer la saisie.
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Corrigez les champs signalés." })).toBeVisible();
  await expect(page.getByLabel("Titre")).toHaveValue(TITRE);

  await page.getByLabel("Résumé").fill("Un résumé de test.");
  const texte = page.getByRole("textbox", { name: "Texte" });
  await texte.click();
  await page.keyboard.type("Un texte ");
  await page.getByRole("button", { name: "Gras" }).click();
  await page.keyboard.type("important");
  await page.getByRole("button", { name: "Gras" }).click();
  await page.keyboard.type(" avec un lien : ");
  await page.getByRole("button", { name: "Lien" }).click();
  await page.getByLabel("Adresse du lien").fill("https://ensmg.ucad.sn/");
  await page.getByRole("button", { name: "Appliquer" }).click();

  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/\/admin\/actualites\/[0-9a-f-]{36}\?cree=1$/);
  await expect(page.getByRole("status").filter({ hasText: "Actualité créée." })).toBeVisible();

  // Invisible sur le site public.
  const reponse = await page.request.get(`/actualites/${SLUG}`);
  expect(reponse.status()).toBe(404);

  // Visible en aperçu, avec la mise en forme.
  const [apercu] = await Promise.all([context.waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1, name: TITRE })).toBeVisible();
  await expect(apercu.locator(".texte-long strong", { hasText: "important" })).toBeVisible();
  await expect(apercu.locator('.texte-long a[href="https://ensmg.ucad.sn/"]')).toBeVisible();
  await apercu.getByRole("button", { name: "Quitter l'aperçu" }).click();
  await expect(apercu.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await apercu.close();

  if (baseDediee) {
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Actualité publiée." })).toBeVisible();
    await page.goto("/actualites");
    await expect(page.getByRole("link", { name: new RegExp(TITRE) })).toBeVisible();
    await page.goBack();
    await page.getByRole("button", { name: "Dépublier" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Actualité retirée du site." })).toBeVisible();
  }

  await page.getByRole("button", { name: "Supprimer l'actualité" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/actualites$/);
  await expect(page.getByText(TITRE)).toHaveCount(0);
});

test("un brouillon reste invisible avec un cookie d'aperçu mais sans session", async ({ page, browser }) => {
  await seConnecterEtAttendre(page, COMPTES.editeur.email);
  await page.goto("/admin/actualites/nouveau");
  await page.getByLabel("Titre").fill(`${TITRE} 2`);
  await page.getByLabel("Résumé").fill("Résumé.");
  await page.getByRole("textbox", { name: "Texte" }).click();
  await page.keyboard.type("Texte.");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page).toHaveURL(/cree=1$/);
  const [apercu] = await Promise.all([page.context().waitForEvent("page"), page.getByRole("link", { name: "Aperçu" }).click()]);
  await expect(apercu.getByRole("heading", { level: 1 })).toBeVisible();

  // On ne copie que le cookie de Draft Mode dans un navigateur sans session.
  const cookies = (await page.context().cookies()).filter((c) => c.name === "__prerender_bypass");
  expect(cookies).toHaveLength(1);
  const autre = await browser.newContext();
  await autre.addCookies(cookies);
  const visiteur = await autre.newPage();
  await visiteur.goto(`/actualites/${SLUG}-2`);
  await expect(visiteur.getByRole("heading", { name: "Page introuvable" })).toBeVisible();
  await autre.close();
});
```

Le second test laisse un brouillon `e2e-…`, supprimé par le nettoyage. Si la fonction de date du site (`DateTexte`) ou la carte d'actualité ne rend pas le titre comme nom de lien dans `/actualites`, ajuster le sélecteur de la branche `baseDediee` à partir du DOM réel.

- [ ] **Step 3: Lancer les tests e2e**

Run: `E2E_AUTORISE=1 npm run test:e2e`
Expected: tous les tests passent, anciens et nouveaux. Ensuite, `select count(*) from actualites where slug like 'e2e-%'` vaut 0 (vérifier avec un petit script `tsx` ou dans la console Neon).

- [ ] **Step 4: Commit**

```bash
git add e2e
git commit -m "E2E : rédaction, aperçu et suppression d'une actualité ; brouillon invisible sans session

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Vérification finale du lot

**Files:** aucun nouveau, sauf corrections.

- [ ] **Step 1: Suite complète**

Run: `npx eslint . && npx tsc --noEmit && npm test && npm run build && E2E_AUTORISE=1 npm run test:e2e`
Expected: tout passe. Noter le nombre de tests Vitest (87 avant ce lot).

- [ ] **Step 2: Non-régression du site public**

Avec `npx next dev -p 3100`, ouvrir `/`, `/actualites` et chaque `/actualites/<slug>` : même contenu qu'avant, pas de bandeau d'aperçu, pas d'erreur dans la console. Dans la sortie du build, `/actualites/[slug]` reste en SSG.

- [ ] **Step 3: Vérifier qu'il ne reste aucune donnée de test**

Aucune actualité `e2e-%` en base. Aucun compte `@ademig.test` en dehors d'un lancement e2e.

- [ ] **Step 4: Commit éventuel des corrections, puis rapport**

Faire le point avec l'utilisateur : ce qui est livré, les tests, et ce qui reste pour les lots 2 à 4. L'ouverture de la PR et la fusion se décident avec lui (skill finishing-a-development-branch).
