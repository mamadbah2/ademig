# Back office ADEMIG — Fondations : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** donner au site ADEMIG une base Postgres, une authentification à deux rôles, une coquille `/admin` avec gestion des comptes et médiathèque, et faire lire au site public tout son contenu depuis la base sans changement visible.

**Architecture :** back office intégré à l'application Next.js 16 existante. Drizzle décrit le schéma et produit les migrations ; les requêtes « pures » prennent la base en paramètre (`db: Db`) pour être testées sur PGlite ; de fines couches les branchent sur Neon (site public mis en cache avec `unstable_cache` + tags, Server Actions de l'admin protégées par `exigerRole`). Better Auth gère connexion, sessions et réinitialisation de mot de passe ; Vercel Blob reçoit les images directement depuis le navigateur.

**Tech Stack :** Next.js 16.3.5 (App Router, sans `cacheComponents`), React 19.2, TypeScript strict, Tailwind 4, Drizzle ORM 0.45 + drizzle-kit 0.31, Neon (`@neondatabase/serverless` 1.2, driver `neon-serverless`), Better Auth 1.7, Zod 4, sanitize-html 2.18, @vercel/blob 2.8, Resend 6, Vitest 5 + PGlite 0.5, Playwright 1.64, tsx 4, image-size 2.

**Spec :** `docs/superpowers/specs/2026-10-08-back-office-fondations-design.md` (à lire avant de commencer).

## Global Constraints

- Lire le guide Next 16 concerné dans `node_modules/next/dist/docs/` avant d'écrire du code Next (AGENTS.md). Le middleware s'appelle `proxy` (`src/proxy.ts`, fonction `proxy`).
- **Ne pas activer `cacheComponents`.** Cache du site public : `unstable_cache(fn, clé, { tags })` ; invalidation dans les actions : `revalidateTag(tag, { expire: 0 })` (la forme à un argument est dépréciée).
- Node ≥ 22.12 (machine : 24.15). Pas de `"type": "module"` dans `package.json` : les scripts `tsx` n'utilisent pas de `await` au niveau supérieur.
- Variables d'environnement locales dans `.env.local` (ignoré par Git). Les scripts les chargent avec `node --env-file-if-exists=.env.local --import tsx …` ; `drizzle.config.ts` avec `process.loadEnvFile`.
- Driver base : `drizzle-orm/neon-serverless` (transactions nécessaires). Tests : `drizzle-orm/pglite`. Type commun : `Db` de `src/db/types.ts`.
- Colonnes SQL en snake_case, propriétés TypeScript en camelCase, noms de tables et de colonnes **en français** sauf les 4 tables Better Auth (`user`, `session`, `account`, `verification`) qui gardent leurs noms.
- Rôles : exactement `"superadmin"` et `"editeur"`. Le super-admin a tous les droits de l'éditeur.
- Mot de passe : 12 caractères minimum. Lien d'invitation et de réinitialisation : valable 24 h. Session : 7 jours.
- Images : types `image/jpeg`, `image/png`, `image/webp`, `image/avif`, `image/svg+xml` ; 10 Mo maximum ; redimensionnement à 2000 px de côté maximum et conversion WebP qualité 0,82 (sauf SVG).
- HTML enregistré : nettoyé avec la liste blanche `p, h2, h3, strong, em, b, i, ul, ol, li, a, blockquote, br` ; liens `http`, `https`, `mailto` seulement, avec `rel="noopener"`.
- Textes visibles en français, dans le style du site (apostrophe droite `'`, écrite `&apos;` dans le texte JSX).
- Admin : pages en `noindex`, aucune animation GSAP/Lenis, couleurs et polices de `globals.css` (`encre`, `papier`, `brun`, `moutarde`, `sable`, `ocre`, `rouge`, `vert` ; `font-titre`, `font-sans`), utilisable dès 360 px.
- Commits fréquents, messages en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Email saisi avec majuscules ou espaces** (« Diao@Gmail.com ») à l'invitation puis à la connexion : le compte doit être trouvé. → Tests dans la Tâche 7 (`creerCompte` normalise), la Tâche 10 (`schemaInvitation`) et la Tâche 14 (connexion).
2. **Base vide ou sans ligne `reglages`** (build lancé avant le seed) : le site ne doit pas planter ; les réglages retombent sur les valeurs initiales. → Test dans la Tâche 4 (`lireReglages` sur base vide).
3. **Compte désactivé alors qu'il a une session ouverte** : il doit perdre l'accès immédiatement. → Test dans la Tâche 7 (sessions supprimées) et parcours Playwright dans la Tâche 14.
4. **Fichier refusé** (HEIC d'iPhone, PDF, image de 25 Mo) : message clair avant tout envoi. → Tests dans la Tâche 12 (`verifierFichier`) et la Tâche 14.
5. **Lien d'invitation expiré ou déjà utilisé** : la page de réinitialisation l'explique et propose d'en demander un nouveau. → Parcours Playwright dans la Tâche 14.

## Carte des fichiers

| Fichier | Rôle |
|---|---|
| `drizzle.config.ts` | Configuration drizzle-kit |
| `vitest.config.ts` | Tests unitaires et d'intégration |
| `playwright.config.ts`, `e2e/*` | Tests de bout en bout |
| `src/db/schema.ts` | Toutes les tables et relations |
| `src/db/types.ts` | Type `Db` commun Neon / PGlite |
| `src/db/index.ts` | Client Drizzle Neon (`db`) |
| `src/db/migrations/` | Migrations SQL générées |
| `src/db/donnees-initiales/*` | Contenu actuel du site (source du seed) |
| `src/db/seed.ts` | `seed(db)` idempotent |
| `src/db/requetes/*.ts` | Lectures pures (`db` en paramètre) → types du site |
| `src/db/operations/*.ts` | Écritures pures de l'admin (comptes, médias) |
| `src/test/db.ts` | Base PGlite migrée pour les tests |
| `src/lib/content/*.ts` | Fonctions `get*()` du site, mises en cache |
| `src/lib/content/tags.ts` | Noms des tags de cache |
| `src/lib/html.ts` | Échappement, conversion et nettoyage HTML |
| `src/lib/roles.ts` | Rôles et `aLeRole` |
| `src/lib/auth.ts`, `src/lib/auth-client.ts` | Better Auth serveur et client |
| `src/lib/session.ts` | `lireSession`, `exigerSession`, `exigerRole` |
| `src/lib/emails.ts` | Contenu et envoi des emails |
| `src/lib/admin/resultat.ts` | Type `Resultat` et enveloppe `action()` |
| `src/lib/admin/comptes.ts`, `src/lib/admin/media.ts` | Server Actions |
| `src/lib/admin/preparer-image.ts` | Préparation des images côté navigateur |
| `src/lib/validation/*.ts` | Schémas Zod |
| `src/proxy.ts` | Redirection des visiteurs sans session |
| `src/app/(site)/…` | Pages publiques (déplacées, URL inchangées) |
| `src/components/coquille-site.tsx` | En-tête, pied de page, animations du site |
| `src/app/admin/…` | Pages de l'admin |
| `src/components/admin/*` | Composants de l'admin |
| `scripts/seed.ts`, `scripts/creer-admin.ts` | Scripts en ligne de commande |

---

### Tâche 1 : outillage, schéma de la base et migration initiale

**Files :**
- Modify : `package.json` (dépendances, scripts), `src/lib/content/types.ts` (types nommés supplémentaires)
- Create : `drizzle.config.ts`, `vitest.config.ts`, `src/db/schema.ts`, `src/db/types.ts`, `src/db/index.ts`, `src/test/db.ts`, `src/db/schema.test.ts`, `src/db/migrations/*` (généré)

**Interfaces :**
- Consumes : rien.
- Produces :
  - `src/db/schema.ts` : tables `user`, `session`, `account`, `verification`, `media`, `actualites`, `actualitePhotos`, `evenements`, `evenementPhotos`, `membres`, `mandats`, `postesBureau`, `commissions`, `commissionMembres`, `partenaires`, `reglages` ; enums `statutPublication`, `categoriePartenaire` ; relations `*Relations`.
  - `src/db/types.ts` : `type Db = PgDatabase<PgQueryResultHKT, typeof schema>`.
  - `src/db/index.ts` : `export const db: Db`.
  - `src/test/db.ts` : `creerDbTest(): Promise<Db>` (PGlite neuve, migrations appliquées).
  - `src/lib/content/types.ts` : nouveaux types exportés `Source`, `Video`, `Realisation`, `Liens`, `Contact`, `Reseau`, `Reglages`.

- [ ] **Étape 1 : installer les dépendances**

```bash
npm install drizzle-orm@0.45.4 @neondatabase/serverless@1.2.0 better-auth@1.7.7 zod@4.6.5 sanitize-html@2.18.0 @vercel/blob@2.8.1 resend@6.32.1
npm install -D drizzle-kit@0.31.11 vitest@5.0.3 vite@8 @electric-sql/pglite@0.5.8 @types/sanitize-html tsx@4.23.15 image-size@2 @playwright/test@1.64.0
```

Ajouter dans `package.json`, section `scripts` (garder `dev`, `build`, `start`, `lint`) :

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:seed": "node --env-file-if-exists=.env.local --import tsx scripts/seed.ts",
"admin:creer": "node --env-file-if-exists=.env.local --import tsx scripts/creer-admin.ts",
"test": "vitest run",
"test:e2e": "playwright test"
```

- [ ] **Étape 2 : nommer les types imbriqués dans `src/lib/content/types.ts`**

Ajouter en tête du fichier, puis remplacer les types littéraux correspondants dans `Member`, `Actualite` et `Evenement` par ces noms (aucun changement de forme) :

```ts
export type Source = { label: string; url: string };
export type Video = { id: string; titre: string };
export type Realisation = { titre: string; annee?: string; description: string };
export type Liens = { linkedin?: string; email?: string; site?: string };

// Coordonnées de l'amicale, éditables dans l'admin (même forme que l'ancien `site.contact`).
export type Contact = {
  email: string;
  phone: string | null;
  press: { name: string; phone: string };
  address: { street: string; postalBox: string; city: string; country: string };
};
export type Reseau = { label: string; url: string };
export type Reglages = { contact: Contact; reseaux: Reseau[]; textes: Record<string, string> };
```

Dans `Member` : `realisations?: Realisation[];` et `liens?: Liens;`. Dans `Actualite` : `sources?: Source[];` et `videos?: Video[];`. Dans `Evenement` : `videos?: Video[];`.

Run : `npx tsc --noEmit` — Expected : aucune erreur.

- [ ] **Étape 3 : configurer Vitest et drizzle-kit**

`vitest.config.ts` :

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ["src/**/*.test.ts"],
    // Chaque test démarre un Postgres PGlite en mémoire : quelques secondes au plus.
    testTimeout: 30_000,
  },
});
```

`drizzle.config.ts` :

```ts
import { defineConfig } from "drizzle-kit";

// drizzle-kit ne lit que `.env` : on charge `.env.local` nous-mêmes s'il existe.
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

- [ ] **Étape 4 : écrire le test du schéma (il doit échouer)**

`src/db/schema.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { creerDbTest } from "@/test/db";
import { mandats, media, reglages, user } from "./schema";

describe("schéma de la base", () => {
  it("applique les migrations sur une base vide", async () => {
    const db = await creerDbTest();
    await db.insert(user).values({ id: "u1", name: "Awa", email: "awa@exemple.sn" });
    const [u] = await db.select().from(user);
    expect(u.role).toBe("editeur");
    expect(u.actif).toBe(true);
  });

  it("enregistre un média et refuse deux médias avec la même URL", async () => {
    const db = await creerDbTest();
    const valeurs = { url: "/hero/mine-strates.jpg", alt: "Une mine", width: 10, height: 10, mime: "image/jpeg" };
    await db.insert(media).values(valeurs);
    await expect(db.insert(media).values(valeurs)).rejects.toThrow();
  });

  it("n'autorise qu'un seul mandat actif", async () => {
    const db = await creerDbTest();
    await db.insert(mandats).values({ libelle: "Bureau 2024", dateElection: "2024-09-22", actif: true });
    await db.insert(mandats).values({ libelle: "Bureau 2021", dateElection: "2021-09-19", actif: false });
    await expect(
      db.insert(mandats).values({ libelle: "Bureau 2027", dateElection: "2027-09-20", actif: true }),
    ).rejects.toThrow();
  });

  it("donne des valeurs par défaut aux réglages", async () => {
    const db = await creerDbTest();
    await db.insert(reglages).values({
      contact: {
        email: "a@b.sn",
        phone: null,
        press: { name: "X", phone: "1" },
        address: { street: "s", postalBox: "b", city: "Dakar", country: "Sénégal" },
      },
    });
    const [r] = await db.select().from(reglages);
    expect(r.id).toBe(1);
    expect(r.reseaux).toEqual([]);
    expect(r.textes).toEqual({});
  });
});
```

Run : `npx vitest run src/db/schema.test.ts` — Expected : FAIL (`Cannot find module '@/test/db'` ou `./schema`).

- [ ] **Étape 5 : écrire le schéma**

`src/db/schema.ts` :

```ts
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
// Chemin relatif : drizzle-kit ne résout pas l'alias `@/`.
import type { Contact, Etape, Liens, Realisation, Reseau, Source, Video } from "../lib/content/types";

const horodatage = () => ({
  creeLe: timestamp("cree_le", { withTimezone: true }).defaultNow().notNull(),
  majLe: timestamp("maj_le", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* ---------- Better Auth (noms imposés par la bibliothèque) ---------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: text("role").default("editeur").notNull(),
  actif: boolean("actif").default(true).notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* ---------- Contenus ---------- */

export const statutPublication = pgEnum("statut_publication", ["brouillon", "publie"]);
export const categoriePartenaire = pgEnum("categorie_partenaire", ["Institution", "Entreprise", "Événement"]);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull().unique(),
  // Chemin dans Vercel Blob ; vide pour les fichiers servis depuis `/public`.
  pathname: text("pathname"),
  alt: text("alt").notNull(),
  credit: text("credit"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  mime: text("mime").notNull(),
  taille: integer("taille"),
  creePar: text("cree_par").references(() => user.id, { onDelete: "set null" }),
  ...horodatage(),
});

export const actualites = pgTable("actualites", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titre: text("titre").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  resume: text("resume").notNull(),
  corps: text("corps").notNull(),
  sources: jsonb("sources").$type<Source[]>().default([]).notNull(),
  videos: jsonb("videos").$type<Video[]>().default([]).notNull(),
  statut: statutPublication("statut").default("brouillon").notNull(),
  publieLe: timestamp("publie_le", { withTimezone: true }),
  ...horodatage(),
});

export const actualitePhotos = pgTable(
  "actualite_photos",
  {
    actualiteId: uuid("actualite_id")
      .notNull()
      .references(() => actualites.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    ordre: integer("ordre").notNull(),
  },
  (t) => [primaryKey({ columns: [t.actualiteId, t.mediaId] })],
);

export const evenements = pgTable("evenements", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titre: text("titre").notNull(),
  debut: timestamp("debut", { withTimezone: true }).notNull(),
  fin: timestamp("fin", { withTimezone: true }),
  lieuNom: text("lieu_nom").notNull(),
  lieuVille: text("lieu_ville").notNull(),
  theme: text("theme"),
  resume: text("resume").notNull(),
  corps: text("corps").notNull(),
  videos: jsonb("videos").$type<Video[]>().default([]).notNull(),
  afficheId: uuid("affiche_id").references(() => media.id, { onDelete: "set null" }),
  // Noms libres : certains partenaires d'un événement ne figurent pas dans la table `partenaires`.
  partenaires: text("partenaires").array().default(sql`'{}'::text[]`).notNull(),
  statut: statutPublication("statut").default("brouillon").notNull(),
  publieLe: timestamp("publie_le", { withTimezone: true }),
  ...horodatage(),
});

export const evenementPhotos = pgTable(
  "evenement_photos",
  {
    evenementId: uuid("evenement_id")
      .notNull()
      .references(() => evenements.id, { onDelete: "cascade" }),
    mediaId: uuid("media_id")
      .notNull()
      .references(() => media.id, { onDelete: "restrict" }),
    ordre: integer("ordre").notNull(),
  },
  (t) => [primaryKey({ columns: [t.evenementId, t.mediaId] })],
);

export const membres = pgTable("membres", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  nom: text("nom").notNull(),
  titre: text("titre").notNull(),
  specialite: text("specialite").notNull(),
  promotion: integer("promotion"),
  numero: integer("numero"),
  organisation: text("organisation"),
  ville: text("ville"),
  resume: text("resume").notNull(),
  bio: text("bio"),
  parcours: jsonb("parcours").$type<Etape[]>().default([]).notNull(),
  competences: text("competences").array().default(sql`'{}'::text[]`).notNull(),
  realisations: jsonb("realisations").$type<Realisation[]>().default([]).notNull(),
  liens: jsonb("liens").$type<Liens>(),
  photoId: uuid("photo_id").references(() => media.id, { onDelete: "set null" }),
  visible: boolean("visible").default(true).notNull(),
  ...horodatage(),
});

export const mandats = pgTable(
  "mandats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    libelle: text("libelle").notNull(),
    dateElection: date("date_election", { mode: "string" }).notNull(),
    actif: boolean("actif").default(false).notNull(),
    ...horodatage(),
  },
  // Un seul mandat actif à la fois.
  (t) => [uniqueIndex("mandats_un_seul_actif").on(t.actif).where(sql`${t.actif} = true`)],
);

export const postesBureau = pgTable(
  "postes_bureau",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mandatId: uuid("mandat_id")
      .notNull()
      .references(() => mandats.id, { onDelete: "cascade" }),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    fonction: text("fonction").notNull(),
    ordre: integer("ordre").notNull(),
    // Membre du bureau exécutif, affiché en tête de la page Bureau.
    executif: boolean("executif").default(false).notNull(),
  },
  (t) => [uniqueIndex("postes_bureau_mandat_membre").on(t.mandatId, t.membreId)],
);

export const commissions = pgTable("commissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  mandatId: uuid("mandat_id")
    .notNull()
    .references(() => mandats.id, { onDelete: "cascade" }),
  nom: text("nom").notNull(),
  mission: text("mission").notNull(),
  ordre: integer("ordre").notNull(),
  ...horodatage(),
});

export const commissionMembres = pgTable(
  "commission_membres",
  {
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    membreId: uuid("membre_id")
      .notNull()
      .references(() => membres.id, { onDelete: "cascade" }),
    ordre: integer("ordre").notNull(),
  },
  (t) => [primaryKey({ columns: [t.commissionId, t.membreId] })],
);

export const partenaires = pgTable("partenaires", {
  id: uuid("id").primaryKey().defaultRandom(),
  nom: text("nom").notNull().unique(),
  description: text("description").notNull(),
  categorie: categoriePartenaire("categorie").notNull(),
  url: text("url"),
  logoId: uuid("logo_id").references(() => media.id, { onDelete: "set null" }),
  ordre: integer("ordre").notNull(),
  visible: boolean("visible").default(true).notNull(),
  ...horodatage(),
});

// Une seule ligne (id = 1).
export const reglages = pgTable("reglages", {
  id: integer("id").primaryKey().default(1),
  contact: jsonb("contact").$type<Contact>().notNull(),
  reseaux: jsonb("reseaux").$type<Reseau[]>().default([]).notNull(),
  textes: jsonb("textes").$type<Record<string, string>>().default({}).notNull(),
  majLe: timestamp("maj_le", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

/* ---------- Relations (requêtes `db.query.*` avec `with`) ---------- */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const actualitesRelations = relations(actualites, ({ many }) => ({
  photos: many(actualitePhotos),
}));
export const actualitePhotosRelations = relations(actualitePhotos, ({ one }) => ({
  actualite: one(actualites, { fields: [actualitePhotos.actualiteId], references: [actualites.id] }),
  media: one(media, { fields: [actualitePhotos.mediaId], references: [media.id] }),
}));

export const evenementsRelations = relations(evenements, ({ one, many }) => ({
  photos: many(evenementPhotos),
  affiche: one(media, { fields: [evenements.afficheId], references: [media.id] }),
}));
export const evenementPhotosRelations = relations(evenementPhotos, ({ one }) => ({
  evenement: one(evenements, { fields: [evenementPhotos.evenementId], references: [evenements.id] }),
  media: one(media, { fields: [evenementPhotos.mediaId], references: [media.id] }),
}));

export const membresRelations = relations(membres, ({ one, many }) => ({
  photo: one(media, { fields: [membres.photoId], references: [media.id] }),
  postes: many(postesBureau),
}));

export const mandatsRelations = relations(mandats, ({ many }) => ({
  postes: many(postesBureau),
  commissions: many(commissions),
}));
export const postesBureauRelations = relations(postesBureau, ({ one }) => ({
  mandat: one(mandats, { fields: [postesBureau.mandatId], references: [mandats.id] }),
  membre: one(membres, { fields: [postesBureau.membreId], references: [membres.id] }),
}));
export const commissionsRelations = relations(commissions, ({ one, many }) => ({
  mandat: one(mandats, { fields: [commissions.mandatId], references: [mandats.id] }),
  membres: many(commissionMembres),
}));
export const commissionMembresRelations = relations(commissionMembres, ({ one }) => ({
  commission: one(commissions, { fields: [commissionMembres.commissionId], references: [commissions.id] }),
  membre: one(membres, { fields: [commissionMembres.membreId], references: [membres.id] }),
}));

export const partenairesRelations = relations(partenaires, ({ one }) => ({
  logo: one(media, { fields: [partenaires.logoId], references: [media.id] }),
}));
```

- [ ] **Étape 6 : type `Db`, client Neon et base de test**

`src/db/types.ts` :

```ts
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

// Accepte la base Neon de l'application comme la base PGlite des tests.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
```

`src/db/index.ts` :

```ts
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import type { Db } from "./types";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL est absente : lancez `vercel env pull .env.local`.");

// Driver WebSocket : contrairement à `neon-http`, il gère les transactions.
export const db: Db = drizzle({ connection: url, schema });
```

`src/test/db.ts` :

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "@/db/schema";
import type { Db } from "@/db/types";

// Postgres complet en mémoire, migré avec les vraies migrations du projet.
export async function creerDbTest(): Promise<Db> {
  const db = drizzle({ client: new PGlite(), schema });
  await migrate(db, { migrationsFolder: "src/db/migrations" });
  return db;
}
```

- [ ] **Étape 7 : générer la migration initiale**

Run : `npx drizzle-kit generate --name initial`
Expected : création de `src/db/migrations/0000_initial.sql` et de `src/db/migrations/meta/`. Ouvrir le SQL et vérifier la présence de `CREATE UNIQUE INDEX "mandats_un_seul_actif" … WHERE "mandats"."actif" = true`.

- [ ] **Étape 8 : lancer les tests**

Run : `npx vitest run src/db/schema.test.ts`
Expected : 4 tests PASS.

Run : `npx tsc --noEmit && npm run lint`
Expected : aucune erreur.

- [ ] **Étape 9 : commit**

```bash
git add package.json package-lock.json drizzle.config.ts vitest.config.ts src/db src/test src/lib/content/types.ts
git commit -m "Schéma de la base, migration initiale et tests PGlite

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 2 : données initiales, HTML et nouveaux types de contenu

Le contenu en dur quitte `src/lib/content/` pour `src/db/donnees-initiales/`, d'où le seed le lira. Le corps des actualités et des événements et la bio des membres deviennent du HTML. Les fonctions `get*()` gardent leur signature et convertissent à la volée, si bien que le site reste identique à l'écran.

**Files :**
- Create : `src/lib/html.ts`, `src/lib/html.test.ts`, `src/db/donnees-initiales/types.ts`, `src/db/donnees-initiales/reglages.ts`
- Move (`git mv`) : `src/lib/content/{photos,actualites,evenements,membres,organisation}.ts` → `src/db/donnees-initiales/`
- Create (nouvelles versions) : `src/lib/content/{actualites,evenements,membres,organisation}.ts`
- Modify : `src/lib/content/types.ts`, `src/lib/site.ts`, `src/app/actualites/[slug]/page.tsx`, `src/app/evenements/[slug]/page.tsx`, `src/app/membres/[slug]/page.tsx`

**Interfaces :**
- Consumes : types de la Tâche 1.
- Produces :
  - `src/lib/html.ts` : `echapperHtml(texte: string): string`, `paragraphesEnHtml(paragraphes: string[]): string`, `nettoyerHtml(html: string): string`.
  - `src/db/donnees-initiales/types.ts` : `ActualiteInitiale`, `EvenementInitial`, `MembreInitial`.
  - `src/db/donnees-initiales/*.ts` : `photos`, `actualites: ActualiteInitiale[]`, `evenements: EvenementInitial[]`, `membres: MembreInitial[]`, `ordreBureau: string[]`, `commissions`, `partenaires: Partenaire[]`, `reglagesInitiaux: Reglages`.
  - Types modifiés : `Actualite.corps: string`, `Evenement.corps: string`, `Member.bio?: string` (HTML nettoyé).

- [ ] **Étape 1 : écrire les tests HTML (ils doivent échouer)**

`src/lib/html.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { echapperHtml, nettoyerHtml, paragraphesEnHtml } from "./html";

describe("echapperHtml", () => {
  it("échappe les caractères spéciaux sans toucher aux guillemets français", () => {
    expect(echapperHtml(`Mines & pétrole <b> "x" « y » l'amicale`)).toBe(
      "Mines &amp; pétrole &lt;b&gt; &quot;x&quot; « y » l'amicale",
    );
  });
});

describe("paragraphesEnHtml", () => {
  it("entoure chaque paragraphe d'un <p>", () => {
    expect(paragraphesEnHtml(["Un", "Deux & trois"])).toBe("<p>Un</p><p>Deux &amp; trois</p>");
  });

  it("renvoie une chaîne vide pour une liste vide", () => {
    expect(paragraphesEnHtml([])).toBe("");
  });
});

describe("nettoyerHtml", () => {
  it("garde la mise en forme autorisée", () => {
    const html = "<h2>Titre</h2><p><strong>Gras</strong> et <em>italique</em></p><ul><li>Un</li></ul><blockquote>Citation</blockquote>";
    expect(nettoyerHtml(html)).toBe(html);
  });

  it("supprime les scripts, les styles et les gestionnaires d'événements", () => {
    expect(nettoyerHtml(`<p onclick="vol()" style="color:red">Texte</p><script>alert(1)</script>`)).toBe("<p>Texte</p>");
  });

  it("retire les balises non autorisées mais garde leur texte", () => {
    expect(nettoyerHtml("<h1>Grand titre</h1><div>Bloc</div>")).toBe("Grand titreBloc");
  });

  it("n'accepte que les liens http, https et mailto, avec rel=noopener", () => {
    expect(nettoyerHtml(`<a href="https://ensmg.ucad.sn/">ENSMG</a>`)).toBe(
      `<a href="https://ensmg.ucad.sn/" rel="noopener">ENSMG</a>`,
    );
    expect(nettoyerHtml(`<a href="mailto:contact@ademig.sn">Écrire</a>`)).toBe(
      `<a href="mailto:contact@ademig.sn" rel="noopener">Écrire</a>`,
    );
    expect(nettoyerHtml(`<a href="javascript:vol()">Piège</a>`)).toBe(`<a rel="noopener">Piège</a>`);
  });

  it("laisse intact le HTML produit par paragraphesEnHtml", () => {
    const html = paragraphesEnHtml(["« Je commencerai par adresser mes remerciements » & merci."]);
    expect(nettoyerHtml(html)).toBe(html);
  });
});
```

Run : `npx vitest run src/lib/html.test.ts` — Expected : FAIL (`Cannot find module './html'`).

- [ ] **Étape 2 : implémenter `src/lib/html.ts`**

```ts
import sanitizeHtml from "sanitize-html";

export function echapperHtml(texte: string): string {
  return texte.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Convertit l'ancien format (un paragraphe par entrée) en HTML.
export function paragraphesEnHtml(paragraphes: string[]): string {
  return paragraphes.map((p) => `<p>${echapperHtml(p)}</p>`).join("");
}

// Tout HTML enregistré passe par ici : seule la mise en forme éditoriale survit.
export function nettoyerHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "h2", "h3", "strong", "em", "b", "i", "ul", "ol", "li", "a", "blockquote", "br"],
    allowedAttributes: { a: ["href", "title", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener" } }),
    },
  });
}
```

Run : `npx vitest run src/lib/html.test.ts` — Expected : PASS. Si le test « garde la mise en forme autorisée » échoue à cause d'un encodage d'entités par sanitize-html (par exemple `«` encodé), ajouter l'option `parser: { decodeEntities: false }` n'est **pas** la bonne correction : corriger plutôt l'attente du test pour refléter la sortie stable de sanitize-html, et vérifier que `paragraphesEnHtml` puis `nettoyerHtml` donne bien le même texte affiché.

- [ ] **Étape 3 : déplacer les données**

```bash
mkdir -p src/db/donnees-initiales
git mv src/lib/content/photos.ts src/db/donnees-initiales/photos.ts
git mv src/lib/content/actualites.ts src/db/donnees-initiales/actualites.ts
git mv src/lib/content/evenements.ts src/db/donnees-initiales/evenements.ts
git mv src/lib/content/membres.ts src/db/donnees-initiales/membres.ts
git mv src/lib/content/organisation.ts src/db/donnees-initiales/organisation.ts
```

`src/db/donnees-initiales/types.ts` :

```ts
import type { Actualite, Evenement, Member } from "@/lib/content/types";

// Format historique des contenus écrits en dur : un paragraphe par entrée.
export type ActualiteInitiale = Omit<Actualite, "corps"> & { corps: string[] };
export type EvenementInitial = Omit<Evenement, "corps"> & { corps: string[] };
export type MembreInitial = Omit<Member, "bio"> & { bio?: string[] };
```

Dans chaque fichier déplacé :
- `photos.ts` : remplacer `import type { Photo } from "./types";` par `import type { Photo } from "@/lib/content/types";`.
- `actualites.ts` : `import type { ActualiteInitiale } from "./types";`, `const actualites: Actualite[] = [` devient `export const actualites: ActualiteInitiale[] = [`, et supprimer `getActualites` et `getActualite` en bas du fichier.
- `evenements.ts` : même chose avec `EvenementInitial` (`export const evenements: EvenementInitial[]`), supprimer `getEvenements` et `getEvenement`.
- `membres.ts` : même chose avec `MembreInitial` (`export const membres: MembreInitial[]`), supprimer `getMembres` et `getMembre`.
- `organisation.ts` : `import type { Commission, Partenaire } from "@/lib/content/types";`.

`src/db/donnees-initiales/reglages.ts` (valeurs reprises telles quelles de `src/lib/site.ts`) :

```ts
import type { Reglages } from "@/lib/content/types";

export const reglagesInitiaux: Reglages = {
  contact: {
    // À CONFIRMER : adresse email et téléphone officiels de l'ADEMIG.
    email: "contact@ademig.sn",
    phone: null,
    press: { name: "Birama Ndoye", phone: "+221 77 552 52 25" },
    address: {
      street: "ENSMG, Bâtiment BRGM, Route de l'Université",
      postalBox: "BP 5396 Dakar-Fann",
      city: "Dakar",
      country: "Sénégal",
    },
  },
  // Comptes officiels, relevés sur la chaîne YouTube de l'amicale.
  reseaux: [
    { label: "YouTube", url: "https://www.youtube.com/@ADEMIG-SN" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/ademig-sn-14041b343/" },
    { label: "Facebook", url: "https://www.facebook.com/share/1AhAE1eCAQ/" },
  ],
  textes: {},
};
```

Dans `src/lib/site.ts`, remplacer les blocs `contact: { … }` et `social: [ … ]` par des références (le reste du fichier ne change pas) :

```ts
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
// …
  contact: reglagesInitiaux.contact,
  social: reglagesInitiaux.reseaux,
```

et retirer `as const` à la fin de l'objet `site` s'il provoque une erreur de type (`site.contact.phone` reste `string | null`).

- [ ] **Étape 4 : passer les types au HTML**

Dans `src/lib/content/types.ts` :

```ts
// dans Member
  // Biographie en HTML nettoyé.
  bio?: string;
// dans Actualite
  corps: string; // HTML nettoyé
// dans Evenement
  corps: string; // HTML nettoyé
```

- [ ] **Étape 5 : nouvelles fonctions `get*()` (conversion à la volée)**

`src/lib/content/actualites.ts` :

```ts
import { actualites } from "@/db/donnees-initiales/actualites";
import type { ActualiteInitiale } from "@/db/donnees-initiales/types";
import { paragraphesEnHtml } from "@/lib/html";
import type { Actualite } from "./types";

const versActualite = (a: ActualiteInitiale): Actualite => ({ ...a, corps: paragraphesEnHtml(a.corps) });

export async function getActualites() {
  return actualites.map(versActualite).sort((a, b) => b.date.localeCompare(a.date));
}

export async function getActualite(slug: string) {
  const a = actualites.find((x) => x.slug === slug);
  return a && versActualite(a);
}
```

`src/lib/content/evenements.ts` :

```ts
import { evenements } from "@/db/donnees-initiales/evenements";
import type { EvenementInitial } from "@/db/donnees-initiales/types";
import { paragraphesEnHtml } from "@/lib/html";
import type { Evenement } from "./types";

const versEvenement = (e: EvenementInitial): Evenement => ({ ...e, corps: paragraphesEnHtml(e.corps) });

export async function getEvenements() {
  return evenements.map(versEvenement).sort((a, b) => b.debut.localeCompare(a.debut));
}

export async function getEvenement(slug: string) {
  const e = evenements.find((x) => x.slug === slug);
  return e && versEvenement(e);
}
```

`src/lib/content/membres.ts` :

```ts
import { membres } from "@/db/donnees-initiales/membres";
import type { MembreInitial } from "@/db/donnees-initiales/types";
import { paragraphesEnHtml } from "@/lib/html";
import type { Member } from "./types";

const versMembre = (m: MembreInitial): Member => ({ ...m, bio: m.bio && paragraphesEnHtml(m.bio) });

export async function getMembres() {
  return membres.map(versMembre);
}

export async function getMembre(slug: string) {
  const m = membres.find((x) => x.slug === slug);
  return m && versMembre(m);
}
```

`src/lib/content/organisation.ts` (temporaire, remplacé à la Tâche 6) :

```ts
export { commissions, ordreBureau, partenaires } from "@/db/donnees-initiales/organisation";
```

- [ ] **Étape 6 : afficher le HTML dans les pages**

`src/app/actualites/[slug]/page.tsx`, remplacer :

```tsx
        <div className="texte-long mt-8">
          {a.corps.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
```

par :

```tsx
        {/* HTML nettoyé à l'enregistrement (voir src/lib/html.ts). */}
        <div className="texte-long mt-8" dangerouslySetInnerHTML={{ __html: a.corps }} />
```

`src/app/evenements/[slug]/page.tsx`, remplacer :

```tsx
        <div className="texte-long">
          <p>{e.resume}</p>
          {e.corps.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
```

par :

```tsx
        <div className="texte-long">
          <p>{e.resume}</p>
          {/* HTML nettoyé à l'enregistrement (voir src/lib/html.ts). */}
          <div dangerouslySetInnerHTML={{ __html: e.corps }} />
        </div>
```

Vérifier dans `globals.css` que les règles `.texte-long p` s'appliquent encore aux `<p>` imbriqués dans ce `<div>` (sélecteur descendant). Si la règle utilise `.texte-long > p`, la remplacer par `.texte-long p`.

`src/app/membres/[slug]/page.tsx`, remplacer :

```tsx
          <div className="texte-long">
            {(m.bio ?? [m.resume]).map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
```

par :

```tsx
          {m.bio ? (
            // HTML nettoyé à l'enregistrement (voir src/lib/html.ts).
            <div className="texte-long" dangerouslySetInnerHTML={{ __html: m.bio }} />
          ) : (
            <div className="texte-long">
              <p>{m.resume}</p>
            </div>
          )}
```

- [ ] **Étape 7 : vérifier**

Run : `npx tsc --noEmit && npm run lint && npm test` — Expected : aucune erreur, tous les tests PASS.

Run : `npm run build` — Expected : build réussi, mêmes routes qu'avant.

Run : `npm run dev`, ouvrir `/actualites/journee-nationale-contenu-local-2026`, `/evenements/journee-nationale-contenu-local-2026`, `/membres/ibrahima-diao` et `/membres/zackaria-diaw`. Expected : textes, paragraphes et mise en page identiques à ceux d'avant la tâche (faire une capture de ces quatre pages avant l'étape 3 pour comparer).

- [ ] **Étape 8 : commit**

```bash
git add -A src/lib src/db/donnees-initiales src/app
git commit -m "Contenus initiaux déplacés, corps et bios en HTML nettoyé

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 3 : seed du contenu initial

`seed(db)` importe le contenu de `src/db/donnees-initiales/` **sans jamais écraser** une ligne existante : relancé après des modifications faites dans l'admin, il ne touche à rien de ce qui existe déjà.

**Files :**
- Modify : `src/db/types.ts` (type `Tx`)
- Create : `src/db/seed.ts`, `src/db/seed.test.ts`, `scripts/seed.ts`

**Interfaces :**
- Consumes : schéma et `Db` (Tâche 1) ; données initiales et `paragraphesEnHtml` (Tâche 2).
- Produces :
  - `src/db/types.ts` : `type Tx` (transaction Drizzle).
  - `src/db/seed.ts` : `seed(db: Db): Promise<void>` ; `imagesInitiales(): ImageInitiale[]` avec `type ImageInitiale = { src: string; alt: string; width?: number; height?: number; credit?: string }`.
  - Commande `npm run db:seed`.

- [ ] **Étape 1 : ajouter le type `Tx`**

À la fin de `src/db/types.ts` :

```ts
// Transaction ouverte par `db.transaction(async (tx) => …)`.
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
```

- [ ] **Étape 2 : écrire les tests du seed (ils doivent échouer)**

`src/db/seed.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { creerDbTest } from "@/test/db";
import { actualites as actualitesInitiales } from "./donnees-initiales/actualites";
import { evenements as evenementsInitiaux } from "./donnees-initiales/evenements";
import { membres as membresInitiaux } from "./donnees-initiales/membres";
import { commissions as commissionsInitiales, ordreBureau, partenaires as partenairesInitiaux } from "./donnees-initiales/organisation";
import * as t from "./schema";
import { imagesInitiales, seed } from "./seed";
import type { Db } from "./types";

async function compter(db: Db) {
  return {
    media: await db.$count(t.media),
    actualites: await db.$count(t.actualites),
    actualitePhotos: await db.$count(t.actualitePhotos),
    evenements: await db.$count(t.evenements),
    evenementPhotos: await db.$count(t.evenementPhotos),
    membres: await db.$count(t.membres),
    mandats: await db.$count(t.mandats),
    postes: await db.$count(t.postesBureau),
    commissions: await db.$count(t.commissions),
    commissionMembres: await db.$count(t.commissionMembres),
    partenaires: await db.$count(t.partenaires),
    reglages: await db.$count(t.reglages),
  };
}

describe("seed", () => {
  it("importe tout le contenu initial", async () => {
    const db = await creerDbTest();
    await seed(db);
    expect(await compter(db)).toEqual({
      media: imagesInitiales().length,
      actualites: actualitesInitiales.length,
      actualitePhotos: actualitesInitiales.reduce((n, a) => n + (a.photos?.length ?? 0), 0),
      evenements: evenementsInitiaux.length,
      evenementPhotos: evenementsInitiaux.reduce((n, e) => n + (e.photos?.length ?? 0), 0),
      membres: membresInitiaux.length,
      mandats: 1,
      postes: membresInitiaux.filter((m) => m.fonction).length,
      commissions: commissionsInitiales.length,
      commissionMembres: commissionsInitiales.reduce((n, c) => n + c.membres.length, 0),
      partenaires: partenairesInitiaux.length,
      reglages: 1,
    });
  });

  it("recense chaque image une seule fois, avec ses dimensions", () => {
    const images = imagesInitiales();
    expect(new Set(images.map((i) => i.src)).size).toBe(images.length);
    expect(images.find((i) => i.src === "/membres/ibrahima-diao.jpg")?.alt).toBe("Portrait de Dr Ibrahima Diao");
  });

  it("publie les contenus et convertit le corps en HTML", async () => {
    const db = await creerDbTest();
    await seed(db);
    const a = await db.query.actualites.findFirst({ where: eq(t.actualites.slug, actualitesInitiales[0].slug) });
    expect(a?.statut).toBe("publie");
    expect(a?.corps.startsWith("<p>")).toBe(true);
  });

  it("crée le bureau 2024 actif et marque le bureau exécutif", async () => {
    const db = await creerDbTest();
    await seed(db);
    const mandat = await db.query.mandats.findFirst({ with: { postes: { with: { membre: true } } } });
    expect(mandat?.libelle).toBe("Bureau 2024");
    expect(mandat?.actif).toBe(true);
    const executif = mandat!.postes.filter((p) => p.executif).sort((a, b) => a.ordre - b.ordre);
    expect(executif.map((p) => p.membre.slug)).toEqual(ordreBureau);
  });

  it("est idempotent", async () => {
    const db = await creerDbTest();
    await seed(db);
    const avant = await compter(db);
    await seed(db);
    expect(await compter(db)).toEqual(avant);
  });

  it("n'écrase pas une modification faite dans l'admin", async () => {
    const db = await creerDbTest();
    await seed(db);
    const slug = actualitesInitiales[0].slug;
    await db.update(t.actualites).set({ titre: "Titre corrigé" }).where(eq(t.actualites.slug, slug));
    await db.update(t.media).set({ alt: "Texte corrigé" }).where(eq(t.media.url, "/membres/ibrahima-diao.jpg"));
    await seed(db);
    expect((await db.query.actualites.findFirst({ where: eq(t.actualites.slug, slug) }))?.titre).toBe("Titre corrigé");
    expect((await db.query.media.findFirst({ where: eq(t.media.url, "/membres/ibrahima-diao.jpg") }))?.alt).toBe("Texte corrigé");
  });
});
```

Run : `npx vitest run src/db/seed.test.ts` — Expected : FAIL (`Cannot find module './seed'`).

- [ ] **Étape 3 : implémenter `src/db/seed.ts`**

```ts
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { imageSize } from "image-size";
import { paragraphesEnHtml } from "@/lib/html";
import { actualites as actualitesInitiales } from "./donnees-initiales/actualites";
import { evenements as evenementsInitiaux } from "./donnees-initiales/evenements";
import { membres as membresInitiaux } from "./donnees-initiales/membres";
import {
  commissions as commissionsInitiales,
  ordreBureau,
  partenaires as partenairesInitiaux,
} from "./donnees-initiales/organisation";
import { reglagesInitiaux } from "./donnees-initiales/reglages";
import * as t from "./schema";
import type { Db, Tx } from "./types";

export type ImageInitiale = { src: string; alt: string; width?: number; height?: number; credit?: string };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
};

// Toutes les images référencées par le contenu actuel, chacune une seule fois.
export function imagesInitiales(): ImageInitiale[] {
  const images = new Map<string, ImageInitiale>();
  const ajouter = (image: ImageInitiale) => {
    if (!images.has(image.src)) images.set(image.src, image);
  };
  for (const a of actualitesInitiales) a.photos?.forEach(ajouter);
  for (const e of evenementsInitiaux) {
    e.photos?.forEach(ajouter);
    if (e.affiche) ajouter(e.affiche);
  }
  for (const m of membresInitiaux) if (m.photo) ajouter({ src: m.photo, alt: `Portrait de ${m.nom}` });
  for (const p of partenairesInitiaux) {
    if (p.logo) ajouter({ src: p.logo.src, alt: `Logo de ${p.nom}`, width: p.logo.width, height: p.logo.height });
  }
  return [...images.values()];
}

function lireFichierPublic(src: string) {
  const fichier = path.join(process.cwd(), "public", src);
  const dimensions = imageSize(readFileSync(fichier));
  return {
    taille: statSync(fichier).size,
    width: dimensions.width,
    height: dimensions.height,
    mime: MIME[path.extname(src).toLowerCase()] ?? "application/octet-stream",
  };
}

async function seedMedias(tx: Tx) {
  const ids = new Map<string, string>();
  for (const image of imagesInitiales()) {
    const existant = await tx.query.media.findFirst({ where: eq(t.media.url, image.src), columns: { id: true } });
    if (existant) {
      ids.set(image.src, existant.id);
      continue;
    }
    const fichier = lireFichierPublic(image.src);
    const [ligne] = await tx
      .insert(t.media)
      .values({
        url: image.src,
        alt: image.alt,
        credit: image.credit ?? null,
        // Les dimensions déclarées dans le contenu sont celles qu'affiche le site.
        width: image.width ?? fichier.width,
        height: image.height ?? fichier.height,
        mime: fichier.mime,
        taille: fichier.taille,
      })
      .returning({ id: t.media.id });
    ids.set(image.src, ligne.id);
  }
  return (src: string) => {
    const id = ids.get(src);
    if (!id) throw new Error(`Image absente du seed : ${src}`);
    return id;
  };
}

type IdMedia = Awaited<ReturnType<typeof seedMedias>>;

async function seedActualites(tx: Tx, idMedia: IdMedia) {
  for (const a of actualitesInitiales) {
    const existe = await tx.query.actualites.findFirst({ where: eq(t.actualites.slug, a.slug), columns: { id: true } });
    if (existe) continue;
    const [ligne] = await tx
      .insert(t.actualites)
      .values({
        slug: a.slug,
        titre: a.titre,
        date: a.date,
        resume: a.resume,
        corps: paragraphesEnHtml(a.corps),
        sources: a.sources ?? [],
        videos: a.videos ?? [],
        statut: "publie",
        publieLe: new Date(`${a.date}T00:00:00Z`),
      })
      .returning({ id: t.actualites.id });
    for (const [ordre, photo] of (a.photos ?? []).entries()) {
      await tx.insert(t.actualitePhotos).values({ actualiteId: ligne.id, mediaId: idMedia(photo.src), ordre });
    }
  }
}

async function seedEvenements(tx: Tx, idMedia: IdMedia) {
  for (const e of evenementsInitiaux) {
    const existe = await tx.query.evenements.findFirst({ where: eq(t.evenements.slug, e.slug), columns: { id: true } });
    if (existe) continue;
    const [ligne] = await tx
      .insert(t.evenements)
      .values({
        slug: e.slug,
        titre: e.titre,
        debut: new Date(e.debut),
        fin: e.fin ? new Date(e.fin) : null,
        lieuNom: e.lieu.nom,
        lieuVille: e.lieu.ville,
        theme: e.theme ?? null,
        resume: e.resume,
        corps: paragraphesEnHtml(e.corps),
        videos: e.videos ?? [],
        afficheId: e.affiche ? idMedia(e.affiche.src) : null,
        partenaires: e.partenaires ?? [],
        statut: "publie",
        publieLe: new Date(e.debut),
      })
      .returning({ id: t.evenements.id });
    for (const [ordre, photo] of (e.photos ?? []).entries()) {
      await tx.insert(t.evenementPhotos).values({ evenementId: ligne.id, mediaId: idMedia(photo.src), ordre });
    }
  }
}

async function seedMembres(tx: Tx, idMedia: IdMedia) {
  for (const m of membresInitiaux) {
    const existe = await tx.query.membres.findFirst({ where: eq(t.membres.slug, m.slug), columns: { id: true } });
    if (existe) continue;
    await tx.insert(t.membres).values({
      slug: m.slug,
      nom: m.nom,
      titre: m.titre,
      specialite: m.specialite,
      promotion: m.promotion ?? null,
      numero: m.numero ?? null,
      organisation: m.organisation ?? null,
      ville: m.ville ?? null,
      resume: m.resume,
      bio: m.bio ? paragraphesEnHtml(m.bio) : null,
      parcours: m.parcours,
      competences: m.competences,
      realisations: m.realisations ?? [],
      liens: m.liens ?? null,
      photoId: m.photo ? idMedia(m.photo) : null,
    });
  }
}

// Le bureau n'est importé que si aucun mandat n'existe encore.
async function seedBureau(tx: Tx) {
  if (await tx.query.mandats.findFirst({ columns: { id: true } })) return;
  const [mandat] = await tx
    .insert(t.mandats)
    .values({ libelle: "Bureau 2024", dateElection: "2024-09-22", actif: true })
    .returning({ id: t.mandats.id });
  const lignes = await tx.select({ id: t.membres.id, slug: t.membres.slug }).from(t.membres);
  const idMembre = new Map(lignes.map((l) => [l.slug, l.id]));

  for (const [ordre, m] of membresInitiaux.filter((x) => x.fonction).entries()) {
    await tx.insert(t.postesBureau).values({
      mandatId: mandat.id,
      membreId: idMembre.get(m.slug)!,
      fonction: m.fonction!,
      ordre,
      executif: ordreBureau.includes(m.slug),
    });
  }
  for (const [ordre, c] of commissionsInitiales.entries()) {
    const [commission] = await tx
      .insert(t.commissions)
      .values({ mandatId: mandat.id, nom: c.nom, mission: c.mission, ordre })
      .returning({ id: t.commissions.id });
    for (const [rang, slug] of c.membres.entries()) {
      await tx.insert(t.commissionMembres).values({ commissionId: commission.id, membreId: idMembre.get(slug)!, ordre: rang });
    }
  }
}

async function seedPartenaires(tx: Tx, idMedia: IdMedia) {
  for (const [ordre, p] of partenairesInitiaux.entries()) {
    const existe = await tx.query.partenaires.findFirst({ where: eq(t.partenaires.nom, p.nom), columns: { id: true } });
    if (existe) continue;
    await tx.insert(t.partenaires).values({
      nom: p.nom,
      description: p.description,
      categorie: p.categorie,
      url: p.url ?? null,
      logoId: p.logo ? idMedia(p.logo.src) : null,
      ordre,
    });
  }
}

export async function seed(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    const idMedia = await seedMedias(tx);
    await seedActualites(tx, idMedia);
    await seedEvenements(tx, idMedia);
    await seedMembres(tx, idMedia);
    await seedBureau(tx);
    await seedPartenaires(tx, idMedia);
    await tx.insert(t.reglages).values({ id: 1, ...reglagesInitiaux }).onConflictDoNothing();
  });
}
```

Si `imageSize` n'est pas l'export nommé de `image-size@2`, lire `node_modules/image-size/dist/index.d.ts` et utiliser l'export qui prend un `Uint8Array`.

- [ ] **Étape 4 : lancer les tests**

Run : `npx vitest run src/db/seed.test.ts` — Expected : 6 tests PASS.

- [ ] **Étape 5 : script en ligne de commande**

`scripts/seed.ts` :

```ts
import { db } from "@/db";
import { seed } from "@/db/seed";

seed(db)
  .then(() => {
    console.log("Seed terminé : le contenu initial est en base.");
    process.exit(0);
  })
  .catch((erreur) => {
    console.error(erreur);
    process.exit(1);
  });
```

Run : `npx tsc --noEmit && npm run lint` — Expected : aucune erreur. (Le script sera exécuté pour de vrai à la Tâche 5.)

- [ ] **Étape 6 : commit**

```bash
git add src/db scripts
git commit -m "Seed idempotent du contenu initial

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 4 : requêtes de lecture du site public

Fonctions pures qui lisent la base et renvoient exactement les types du site (`Actualite`, `Evenement`, `Member`, `Partenaire`, `Reglages`). Seuls les contenus `publie` et les membres et partenaires `visible` sortent.

**Files :**
- Create : `src/db/requetes/commun.ts`, `src/db/requetes/actualites.ts`, `src/db/requetes/evenements.ts`, `src/db/requetes/membres.ts`, `src/db/requetes/organisation.ts`, `src/db/requetes/reglages.ts`, `src/db/requetes/requetes.test.ts`

**Interfaces :**
- Consumes : `Db`, schéma (Tâche 1), `seed` (Tâche 3), données initiales (Tâche 2).
- Produces :
  - `listerActualites(db: Db): Promise<Actualite[]>` (date décroissante) ; `trouverActualite(db: Db, slug: string): Promise<Actualite | undefined>`.
  - `listerEvenements(db: Db): Promise<Evenement[]>` (début décroissant, dates en ISO `toISOString()`) ; `trouverEvenement(db: Db, slug: string): Promise<Evenement | undefined>`.
  - `listerMembres(db: Db): Promise<Member[]>` (ordre des postes du mandat actif, puis nom) ; `trouverMembre(db: Db, slug: string): Promise<Member | undefined>`.
  - `type Bureau = { executif: Member[]; commissions: (Commission & { membres: Member[] })[] }` ; `lireBureau(db: Db): Promise<Bureau>`.
  - `listerPartenaires(db: Db): Promise<Partenaire[]>` (par `ordre`).
  - `lireReglages(db: Db): Promise<Reglages>` (valeurs initiales si la ligne manque).

- [ ] **Étape 1 : écrire les tests (ils doivent échouer)**

`src/db/requetes/requetes.test.ts` :

```ts
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { actualites as actualitesInitiales } from "@/db/donnees-initiales/actualites";
import { evenements as evenementsInitiaux } from "@/db/donnees-initiales/evenements";
import { membres as membresInitiaux } from "@/db/donnees-initiales/membres";
import { commissions as commissionsInitiales, ordreBureau, partenaires as partenairesInitiaux } from "@/db/donnees-initiales/organisation";
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import * as t from "@/db/schema";
import { seed } from "@/db/seed";
import type { Db } from "@/db/types";
import { paragraphesEnHtml } from "@/lib/html";
import { creerDbTest } from "@/test/db";
import { listerActualites, trouverActualite } from "./actualites";
import { listerEvenements, trouverEvenement } from "./evenements";
import { listerMembres, trouverMembre } from "./membres";
import { lireBureau, listerPartenaires } from "./organisation";
import { lireReglages } from "./reglages";

const iso = (date: string) => new Date(date).toISOString();

describe("requêtes du site public après le seed", () => {
  let db: Db;
  beforeAll(async () => {
    db = await creerDbTest();
    await seed(db);
  });

  it("rend les actualités à l'identique, de la plus récente à la plus ancienne", async () => {
    const attendu = actualitesInitiales
      .map((a) => ({ ...a, corps: paragraphesEnHtml(a.corps) }))
      .sort((a, b) => b.date.localeCompare(a.date));
    expect(await listerActualites(db)).toEqual(attendu);
    expect(await trouverActualite(db, attendu[0].slug)).toEqual(attendu[0]);
    expect(await trouverActualite(db, "inexistante")).toBeUndefined();
  });

  it("rend les événements à l'identique, dates normalisées en ISO", async () => {
    const attendu = evenementsInitiaux
      .map((e) => ({ ...e, corps: paragraphesEnHtml(e.corps), debut: iso(e.debut), fin: e.fin && iso(e.fin) }))
      .sort((a, b) => b.debut.localeCompare(a.debut));
    expect(await listerEvenements(db)).toEqual(attendu);
    expect(await trouverEvenement(db, attendu[0].slug)).toEqual(attendu[0]);
  });

  it("rend les membres à l'identique, dans l'ordre protocolaire", async () => {
    const attendu = membresInitiaux.map((m) => ({ ...m, bio: m.bio && paragraphesEnHtml(m.bio) }));
    expect(await listerMembres(db)).toEqual(attendu);
    expect(await trouverMembre(db, "ibrahima-diao")).toEqual(attendu[0]);
  });

  it("compose le bureau exécutif et les commissions du mandat actif", async () => {
    const bureau = await lireBureau(db);
    expect(bureau.executif.map((m) => m.slug)).toEqual(ordreBureau);
    expect(bureau.commissions.map((c) => ({ nom: c.nom, mission: c.mission, membres: c.membres.map((m) => m.slug) }))).toEqual(
      commissionsInitiales,
    );
  });

  it("rend les partenaires à l'identique", async () => {
    expect(await listerPartenaires(db)).toEqual(partenairesInitiaux);
  });

  it("rend les réglages initiaux", async () => {
    expect(await lireReglages(db)).toEqual(reglagesInitiaux);
  });
});

describe("filtres de publication", () => {
  it("cache les brouillons", async () => {
    const db = await creerDbTest();
    await seed(db);
    const slug = actualitesInitiales[0].slug;
    await db.update(t.actualites).set({ statut: "brouillon" }).where(eq(t.actualites.slug, slug));
    expect((await listerActualites(db)).map((a) => a.slug)).not.toContain(slug);
    expect(await trouverActualite(db, slug)).toBeUndefined();
  });

  it("cache les membres et partenaires non visibles", async () => {
    const db = await creerDbTest();
    await seed(db);
    await db.update(t.membres).set({ visible: false }).where(eq(t.membres.slug, "oumar-niang"));
    await db.update(t.partenaires).set({ visible: false }).where(eq(t.partenaires.nom, "MODEC"));
    expect((await listerMembres(db)).map((m) => m.slug)).not.toContain("oumar-niang");
    expect(await trouverMembre(db, "oumar-niang")).toBeUndefined();
    expect((await lireBureau(db)).commissions.flatMap((c) => c.membres.map((m) => m.slug))).not.toContain("oumar-niang");
    expect((await listerPartenaires(db)).map((p) => p.nom)).not.toContain("MODEC");
  });
});

describe("base vide", () => {
  it("retombe sur les réglages initiaux et des listes vides", async () => {
    const db = await creerDbTest();
    expect(await lireReglages(db)).toEqual(reglagesInitiaux);
    expect(await listerActualites(db)).toEqual([]);
    expect(await lireBureau(db)).toEqual({ executif: [], commissions: [] });
  });
});
```

Run : `npx vitest run src/db/requetes` — Expected : FAIL (modules introuvables).

- [ ] **Étape 2 : utilitaires communs**

`src/db/requetes/commun.ts` :

```ts
import type { Photo } from "@/lib/content/types";
import type { media } from "@/db/schema";

type LigneMedia = typeof media.$inferSelect;

export function versPhoto(m: LigneMedia): Photo {
  return { src: m.url, alt: m.alt, width: m.width, height: m.height, credit: m.credit ?? undefined };
}

// Les types du site utilisent des champs facultatifs plutôt que des listes vides.
export function siNonVide<T>(liste: T[]): T[] | undefined {
  return liste.length > 0 ? liste : undefined;
}
```

- [ ] **Étape 3 : actualités**

`src/db/requetes/actualites.ts` :

```ts
import type { actualitePhotos, actualites, media } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Actualite } from "@/lib/content/types";
import { siNonVide, versPhoto } from "./commun";

type Ligne = typeof actualites.$inferSelect & {
  photos: (typeof actualitePhotos.$inferSelect & { media: typeof media.$inferSelect })[];
};

function versActualite(r: Ligne): Actualite {
  return {
    slug: r.slug,
    titre: r.titre,
    date: r.date,
    resume: r.resume,
    corps: r.corps,
    sources: siNonVide(r.sources),
    videos: siNonVide(r.videos),
    photos: siNonVide(r.photos.map((p) => versPhoto(p.media))),
  };
}

export async function listerActualites(db: Db): Promise<Actualite[]> {
  const lignes = await db.query.actualites.findMany({
    where: (a, { eq }) => eq(a.statut, "publie"),
    orderBy: (a, { desc }) => [desc(a.date)],
    with: { photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return lignes.map(versActualite);
}

export async function trouverActualite(db: Db, slug: string): Promise<Actualite | undefined> {
  const ligne = await db.query.actualites.findFirst({
    where: (a, { and, eq }) => and(eq(a.slug, slug), eq(a.statut, "publie")),
    with: { photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return ligne && versActualite(ligne);
}
```

- [ ] **Étape 4 : événements**

`src/db/requetes/evenements.ts` :

```ts
import type { evenementPhotos, evenements, media } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Evenement } from "@/lib/content/types";
import { siNonVide, versPhoto } from "./commun";

type LigneMedia = typeof media.$inferSelect;
type Ligne = typeof evenements.$inferSelect & {
  affiche: LigneMedia | null;
  photos: (typeof evenementPhotos.$inferSelect & { media: LigneMedia })[];
};

function versEvenement(r: Ligne): Evenement {
  return {
    slug: r.slug,
    titre: r.titre,
    debut: r.debut.toISOString(),
    fin: r.fin?.toISOString(),
    lieu: { nom: r.lieuNom, ville: r.lieuVille },
    theme: r.theme ?? undefined,
    resume: r.resume,
    corps: r.corps,
    partenaires: siNonVide(r.partenaires),
    videos: siNonVide(r.videos),
    affiche: r.affiche
      ? { src: r.affiche.url, alt: r.affiche.alt, width: r.affiche.width, height: r.affiche.height }
      : undefined,
    photos: siNonVide(r.photos.map((p) => versPhoto(p.media))),
  };
}

export async function listerEvenements(db: Db): Promise<Evenement[]> {
  const lignes = await db.query.evenements.findMany({
    where: (e, { eq }) => eq(e.statut, "publie"),
    orderBy: (e, { desc }) => [desc(e.debut)],
    with: { affiche: true, photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return lignes.map(versEvenement);
}

export async function trouverEvenement(db: Db, slug: string): Promise<Evenement | undefined> {
  const ligne = await db.query.evenements.findFirst({
    where: (e, { and, eq }) => and(eq(e.slug, slug), eq(e.statut, "publie")),
    with: { affiche: true, photos: { with: { media: true }, orderBy: (p, { asc }) => [asc(p.ordre)] } },
  });
  return ligne && versEvenement(ligne);
}
```

- [ ] **Étape 5 : membres**

`src/db/requetes/membres.ts` :

```ts
import { eq } from "drizzle-orm";
import { mandats, type media, type membres, postesBureau } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Member } from "@/lib/content/types";
import { siNonVide } from "./commun";

type Ligne = typeof membres.$inferSelect & { photo: typeof media.$inferSelect | null };

function versMembre(r: Ligne, fonction: string | undefined): Member {
  return {
    slug: r.slug,
    nom: r.nom,
    fonction,
    titre: r.titre,
    organisation: r.organisation ?? undefined,
    specialite: r.specialite,
    promotion: r.promotion ?? undefined,
    numero: r.numero ?? undefined,
    ville: r.ville ?? undefined,
    photo: r.photo?.url,
    resume: r.resume,
    bio: r.bio ?? undefined,
    parcours: r.parcours,
    competences: r.competences,
    realisations: siNonVide(r.realisations),
    liens: r.liens ?? undefined,
  };
}

async function postesDuMandatActif(db: Db) {
  const postes = await db
    .select({ membreId: postesBureau.membreId, fonction: postesBureau.fonction, ordre: postesBureau.ordre })
    .from(postesBureau)
    .innerJoin(mandats, eq(mandats.id, postesBureau.mandatId))
    .where(eq(mandats.actif, true));
  return new Map(postes.map((p) => [p.membreId, p]));
}

// Membres visibles avec leur identifiant, dans l'ordre des postes puis par nom.
export async function membresVisibles(db: Db): Promise<{ id: string; membre: Member }[]> {
  const postes = await postesDuMandatActif(db);
  const lignes = await db.query.membres.findMany({ where: (m, { eq }) => eq(m.visible, true), with: { photo: true } });
  const rang = (id: string) => postes.get(id)?.ordre ?? Number.MAX_SAFE_INTEGER;
  return lignes
    .sort((a, b) => rang(a.id) - rang(b.id) || a.nom.localeCompare(b.nom, "fr"))
    .map((r) => ({ id: r.id, membre: versMembre(r, postes.get(r.id)?.fonction) }));
}

export async function listerMembres(db: Db): Promise<Member[]> {
  return (await membresVisibles(db)).map((m) => m.membre);
}

export async function trouverMembre(db: Db, slug: string): Promise<Member | undefined> {
  return (await listerMembres(db)).find((m) => m.slug === slug);
}
```

- [ ] **Étape 6 : bureau et partenaires**

`src/db/requetes/organisation.ts` :

```ts
import type { Db } from "@/db/types";
import type { Commission, Member, Partenaire } from "@/lib/content/types";
import { membresVisibles } from "./membres";

export type Bureau = { executif: Member[]; commissions: (Commission & { membres: Member[] })[] };

export async function lireBureau(db: Db): Promise<Bureau> {
  const mandat = await db.query.mandats.findFirst({
    where: (m, { eq }) => eq(m.actif, true),
    with: {
      postes: { orderBy: (p, { asc }) => [asc(p.ordre)] },
      commissions: {
        orderBy: (c, { asc }) => [asc(c.ordre)],
        with: { membres: { orderBy: (cm, { asc }) => [asc(cm.ordre)] } },
      },
    },
  });
  if (!mandat) return { executif: [], commissions: [] };

  const parId = new Map((await membresVisibles(db)).map(({ id, membre }) => [id, membre]));
  const trouver = (ids: string[]) => ids.map((id) => parId.get(id)).filter((m): m is Member => !!m);

  return {
    executif: trouver(mandat.postes.filter((p) => p.executif).map((p) => p.membreId)),
    commissions: mandat.commissions.map((c) => ({
      nom: c.nom,
      mission: c.mission,
      membres: trouver(c.membres.map((m) => m.membreId)),
    })),
  };
}

export async function listerPartenaires(db: Db): Promise<Partenaire[]> {
  const lignes = await db.query.partenaires.findMany({
    where: (p, { eq }) => eq(p.visible, true),
    orderBy: (p, { asc }) => [asc(p.ordre)],
    with: { logo: true },
  });
  return lignes.map((p) => ({
    nom: p.nom,
    description: p.description,
    categorie: p.categorie,
    url: p.url ?? undefined,
    logo: p.logo ? { src: p.logo.url, width: p.logo.width, height: p.logo.height } : undefined,
  }));
}
```

`src/db/requetes/reglages.ts` :

```ts
import { reglagesInitiaux } from "@/db/donnees-initiales/reglages";
import type { Db } from "@/db/types";
import type { Reglages } from "@/lib/content/types";

// Sans ligne en base (seed pas encore lancé), le site garde ses coordonnées d'origine.
export async function lireReglages(db: Db): Promise<Reglages> {
  const ligne = await db.query.reglages.findFirst();
  if (!ligne) return reglagesInitiaux;
  return { contact: ligne.contact, reseaux: ligne.reseaux, textes: ligne.textes };
}
```

- [ ] **Étape 7 : lancer les tests**

Run : `npx vitest run src/db/requetes` — Expected : 9 tests PASS. Si une comparaison `toEqual` échoue sur un champ facultatif (`undefined` d'un côté, valeur vide de l'autre), corriger la conversion dans la requête, **pas** l'attente du test : le site doit recevoir exactement les mêmes objets qu'avant.

Run : `npm test && npx tsc --noEmit && npm run lint` — Expected : tout passe.

- [ ] **Étape 8 : commit**

```bash
git add src/db/requetes
git commit -m "Requêtes de lecture du site public, testées contre le contenu initial

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 5 : provisionner Neon, Blob et Resend, puis remplir la base de développement

Tâche d'infrastructure : elle demande le compte Vercel de l'utilisateur. **Demander à l'utilisateur** de lancer les commandes interactives (`vercel login`, `vercel link`, ajouts d'intégrations) avec le préfixe `!` s'il le faut, et confirmer chaque création de ressource avant de la faire. Avant de choisir une intégration, charger la compétence `vercel:marketplace` et suivre sa procédure (`discover` puis installation).

**Files :**
- Create : `.env.example`
- Modify : `.gitignore` (autoriser `.env.example`)

**Interfaces :**
- Consumes : migrations (Tâche 1), `npm run db:seed` (Tâche 3).
- Produces : `.env.local` (non commité) contenant `DATABASE_URL` (branche Neon `dev`), `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:3000` ; base `dev` migrée et remplie.

- [ ] **Étape 1 : lier le projet Vercel**

Run : `vercel whoami` — si non connecté, demander à l'utilisateur `! vercel login`.
Run : `vercel link` (choisir ou créer le projet `ademig`).

- [ ] **Étape 2 : base Neon via la Marketplace**

Suivre la compétence `vercel:marketplace` pour installer Neon sur le projet (commande de type `vercel integration add neon`). Vérifier ensuite : `vercel env ls` affiche `DATABASE_URL` pour Production, Preview et Development.

Dans la console Neon (lien fourni par l'intégration), créer une branche nommée `dev` à partir de `main` et copier son URL de connexion **poolée**.

- [ ] **Étape 3 : stockage Blob et Resend**

- Blob : créer un store public `ademig-medias` relié au projet (onglet Storage du tableau de bord Vercel, ou `vercel blob store add ademig-medias` si la version de la CLI le propose). Vérifier que `BLOB_READ_WRITE_TOKEN` apparaît dans `vercel env ls`.
- Resend : installer l'intégration Resend via la Marketplace (même procédure). Vérifier `RESEND_API_KEY`. Sans domaine vérifié, Resend n'envoie qu'à l'adresse du titulaire du compte : suffisant pour les tests ; l'expéditeur définitif (`EMAIL_EXPEDITEUR`) sera réglé avec le domaine.

- [ ] **Étape 4 : secret Better Auth**

```bash
openssl rand -base64 32   # copier la valeur
vercel env add BETTER_AUTH_SECRET production
vercel env add BETTER_AUTH_SECRET preview
vercel env add BETTER_AUTH_SECRET development
```

- [ ] **Étape 5 : fichier `.env.local`**

```bash
vercel env pull .env.local
```

Puis éditer `.env.local` : remplacer la valeur de `DATABASE_URL` par l'URL de la branche Neon `dev`, et ajouter :

```
BETTER_AUTH_URL=http://localhost:3000
```

Créer `.env.example` (sans aucune valeur secrète) :

```
# Base Neon (branche dev en local)
DATABASE_URL=
# Better Auth
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
# Vercel Blob (médiathèque)
BLOB_READ_WRITE_TOKEN=
# Resend (emails d'invitation et de réinitialisation)
RESEND_API_KEY=
# Facultatif : expéditeur des emails, une fois le domaine vérifié dans Resend
EMAIL_EXPEDITEUR=
```

Ajouter à la fin de `.gitignore` :

```
!.env.example
```

- [ ] **Étape 6 : migrer et remplir la base `dev`**

Run : `npm run db:migrate` — Expected : migration `0000_initial` appliquée, sans erreur.
Run : `npm run db:seed` — Expected : `Seed terminé : le contenu initial est en base.`
Run : `npm run db:seed` une seconde fois — Expected : même message, aucune erreur (idempotence).

Contrôle rapide : `npx drizzle-kit studio`, ouvrir les tables `actualites` (5 lignes), `membres` (11), `media`, `reglages` (1). Fermer le studio.

- [ ] **Étape 7 : commit**

```bash
git add .env.example .gitignore
git commit -m "Variables d'environnement documentées

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 6 : brancher le site public sur la base

**Files :**
- Create : `src/lib/content/tags.ts`, `src/lib/content/reglages.ts`, `src/components/coquille-site.tsx`, `src/app/(site)/layout.tsx`
- Move (`git mv`) : `src/app/{page.tsx,amicale,bureau,contact,evenements,membres,partenaires,actualites}` → `src/app/(site)/`
- Modify : `src/lib/content/{actualites,evenements,membres,organisation}.ts`, `src/lib/site.ts`, `src/app/layout.tsx`, `src/app/not-found.tsx`, `src/app/robots.ts`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/app/(site)/contact/page.tsx`, `src/app/(site)/bureau/page.tsx`, `src/app/(site)/partenaires/page.tsx`, `src/app/(site)/page.tsx`, `src/app/(site)/evenements/page.tsx`

**Interfaces :**
- Consumes : requêtes de la Tâche 4, `db` (Tâche 1), base remplie (Tâche 5).
- Produces :
  - `src/lib/content/tags.ts` : `TAGS` (`actualites`, `evenements`, `membres`, `bureau`, `partenaires`, `reglages`, `media`) et `type Tag`.
  - Fonctions mises en cache : `getActualites()`, `getActualite(slug)`, `getEvenements()`, `getEvenement(slug)`, `getMembres()`, `getMembre(slug)`, `getBureau(): Promise<Bureau>`, `getPartenaires(): Promise<Partenaire[]>`, `getReglages(): Promise<Reglages>`.
  - `CoquilleSite({ children })` : composant serveur qui pose l'en-tête, le pied de page, le JSON-LD et les animations.
  - `site` ne contient plus `contact` ni `social`.

- [ ] **Étape 1 : tags de cache**

`src/lib/content/tags.ts` :

```ts
// Tags de cache du site public, invalidés par les actions de l'admin.
export const TAGS = {
  actualites: "actualites",
  evenements: "evenements",
  membres: "membres",
  bureau: "bureau",
  partenaires: "partenaires",
  reglages: "reglages",
  media: "media",
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];
```

- [ ] **Étape 2 : fonctions `get*()` lues en base et mises en cache**

Lire d'abord `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/unstable_cache.md`.

`src/lib/content/actualites.ts` :

```ts
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerActualites, trouverActualite } from "@/db/requetes/actualites";
import { TAGS } from "./tags";

// Les photos viennent de la médiathèque : un texte alternatif modifié doit se voir ici.
const options = { tags: [TAGS.actualites, TAGS.media] };

export const getActualites = unstable_cache(() => listerActualites(db), ["actualites"], options);
export const getActualite = unstable_cache((slug: string) => trouverActualite(db, slug), ["actualite"], options);
```

`src/lib/content/evenements.ts` :

```ts
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerEvenements, trouverEvenement } from "@/db/requetes/evenements";
import { TAGS } from "./tags";

const options = { tags: [TAGS.evenements, TAGS.media] };

export const getEvenements = unstable_cache(() => listerEvenements(db), ["evenements"], options);
export const getEvenement = unstable_cache((slug: string) => trouverEvenement(db, slug), ["evenement"], options);
```

`src/lib/content/membres.ts` :

```ts
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { listerMembres, trouverMembre } from "@/db/requetes/membres";
import { TAGS } from "./tags";

// La fonction d'un membre dépend du bureau en place.
const options = { tags: [TAGS.membres, TAGS.bureau, TAGS.media] };

export const getMembres = unstable_cache(() => listerMembres(db), ["membres"], options);
export const getMembre = unstable_cache((slug: string) => trouverMembre(db, slug), ["membre"], options);
```

`src/lib/content/organisation.ts` (remplace la réexportation temporaire) :

```ts
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { lireBureau, listerPartenaires } from "@/db/requetes/organisation";
import { TAGS } from "./tags";

export type { Bureau } from "@/db/requetes/organisation";

export const getBureau = unstable_cache(() => lireBureau(db), ["bureau"], {
  tags: [TAGS.bureau, TAGS.membres, TAGS.media],
});
export const getPartenaires = unstable_cache(() => listerPartenaires(db), ["partenaires"], {
  tags: [TAGS.partenaires, TAGS.media],
});
```

`src/lib/content/reglages.ts` :

```ts
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { lireReglages } from "@/db/requetes/reglages";
import { TAGS } from "./tags";

export const getReglages = unstable_cache(() => lireReglages(db), ["reglages"], { tags: [TAGS.reglages] });
```

Dans `src/lib/site.ts`, supprimer les lignes `contact: …`, `social: …` et l'import de `reglagesInitiaux`.

Run : `npx tsc --noEmit` — Expected : erreurs uniquement dans les fichiers qui lisent encore `site.contact`, `site.social`, `partenaires`, `commissions` ou `ordreBureau` ; ce sont les étapes suivantes.

- [ ] **Étape 3 : déplacer les pages publiques dans le groupe `(site)`**

Lire `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`.

```bash
mkdir -p "src/app/(site)"
for d in page.tsx amicale bureau contact evenements membres partenaires actualites; do git mv "src/app/$d" "src/app/(site)/$d"; done
```

Restent à la racine de `src/app` : `layout.tsx`, `not-found.tsx`, `globals.css`, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, `icon.png`, `apple-icon.png`.

- [ ] **Étape 4 : coquille du site**

`src/components/coquille-site.tsx` (reprend le contenu de `<body>` de l'actuel `layout.tsx`, avec le JSON-LD calculé depuis les réglages) :

```tsx
import type { ReactNode } from "react";
import { Animations } from "@/components/animations";
import { Chargement } from "@/components/chargement";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { JsonLd } from "@/components/ui";
import { getReglages } from "@/lib/content/reglages";
import { absoluteUrl, site } from "@/lib/site";

// Posé avant le contenu : masque les cadres que GSAP fera entrer, sans flash de contenu.
// Si les scripts ne démarrent pas, tout redevient visible au bout de dix secondes.
const amorceAnimations = `(function(){var d=document.documentElement;if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;d.classList.add("anim");setTimeout(function(){if(!("animPret" in d.dataset))d.classList.remove("anim")},10000)})()`;

// En-tête, pied de page, données structurées et animations du site public.
export async function CoquilleSite({ children }: { children: ReactNode }) {
  const { contact, reseaux } = await getReglages();
  const organisation = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organisation"),
    name: site.fullName,
    alternateName: site.name,
    url: site.url,
    slogan: site.motto,
    email: contact.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: contact.address.street,
      postOfficeBoxNumber: contact.address.postalBox,
      addressLocality: contact.address.city,
      addressCountry: "SN",
    },
    parentOrganization: {
      "@type": "CollegeOrUniversity",
      name: "École nationale supérieure des mines et de la géologie (ENSMG)",
      url: "https://ensmg.ucad.sn/",
    },
    sameAs: reseaux.map((r) => r.url),
  };

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: amorceAnimations }} />
      <noscript>
        <style>{`[data-cadre]{opacity:1!important}#chargement{display:none}`}</style>
      </noscript>
      <Chargement />
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-brun focus:px-4 focus:py-2 focus:text-papier"
      >
        Aller au contenu
      </a>
      <JsonLd data={organisation} />
      <SiteHeader email={contact.email} />
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <Animations />
    </>
  );
}
```

Comparer ligne à ligne l'objet `organisation` avec celui de `src/app/layout.tsx` avant de le supprimer : toute propriété présente dans l'ancien fichier et absente ici doit être reprise.

`src/app/(site)/layout.tsx` :

```tsx
import type { ReactNode } from "react";
import { CoquilleSite } from "@/components/coquille-site";

export default function LayoutSite({ children }: { children: ReactNode }) {
  return <CoquilleSite>{children}</CoquilleSite>;
}
```

`src/app/layout.tsx` : garder les imports de polices, `metadata`, `viewport` et `globals.css` ; supprimer `organisation`, `amorceAnimations` et les imports devenus inutiles ; le composant devient :

```tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${lilita.variable} ${lato.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
```

`src/app/not-found.tsx` : envelopper le JSX renvoyé dans `<CoquilleSite>…</CoquilleSite>` (import depuis `@/components/coquille-site`) et rendre le composant `async` si nécessaire, pour garder l'en-tête et le pied de page sur les pages introuvables.

- [ ] **Étape 5 : en-tête, pied de page et page Contact**

`src/components/site-header.tsx` : la signature devient `export function SiteHeader({ email }: { email: string })` et les deux occurrences de `site.contact.email` deviennent `email`.

`src/components/site-footer.tsx` :

```tsx
import { getReglages } from "@/lib/content/reglages";
// …
export async function SiteFooter() {
  const { contact, reseaux } = await getReglages();
  const { address, email } = contact;
```

et `site.social.map(` devient `reseaux.map(`. Retirer `site` de l'import s'il n'est plus utilisé.

`src/app/(site)/contact/page.tsx` :

```tsx
import { getReglages } from "@/lib/content/reglages";
// …
export default async function Contact() {
  const { contact, reseaux } = await getReglages();
  const { address, email, phone, press } = contact;
```

et `site.social.map(` devient `reseaux.map(`.

- [ ] **Étape 6 : bureau et partenaires depuis la base**

`src/app/(site)/bureau/page.tsx` : remplacer les imports `getMembres` et `commissions, ordreBureau` par `import { getBureau } from "@/lib/content/organisation";`, et le corps du composant par :

```tsx
export default async function Bureau() {
  const { executif, commissions } = await getBureau();

  return (
    <>
      <PageHeader
        title="Bureau et commissions"
        intro="Élu le 22 septembre 2024 pour redynamiser l'amicale"
        illustration="helmet"
      />

      <Cadre aria-labelledby="bureau-executif">
        <SectionTitle id="bureau-executif">Bureau exécutif</SectionTitle>
        <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {executif.map((m, i) => (
            <FicheBureau key={m.slug} membre={m} priority={i === 0} />
          ))}
        </ul>
      </Cadre>

      {commissions.map((c, i) => (
        <Cadre key={c.nom} aria-label={`Commission ${c.nom}`}>
          <div className="flex items-center gap-5">
            <IconeCarre icone={iconesCommissions[i % 4]} ton={ordreTons[i % 3]} taille="sm" />
            <SectionTitle>Commission {c.nom.toLowerCase()}</SectionTitle>
          </div>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed">{c.mission}</p>
          <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {c.membres.map((m) => (
              <FicheBureau key={m.slug} membre={m} />
            ))}
          </ul>
        </Cadre>
      ))}
    </>
  );
}
```

`src/app/(site)/partenaires/page.tsx` : remplacer `import { partenaires } from "@/lib/content/organisation";` par `import { getPartenaires } from "@/lib/content/organisation";`, puis :

```tsx
export default async function Partenaires() {
  const partenaires = await getPartenaires();
```

`src/app/(site)/page.tsx` : même remplacement d'import, puis au début du composant (déjà `async`) ajouter `getPartenaires()` au chargement des données existant, par exemple :

```tsx
const partenaires = await getPartenaires();
```

placé à côté des appels `getActualites()`, `getEvenements()`, `getMembres()` (les regrouper dans le `Promise.all` s'il y en a un).

- [ ] **Étape 7 : fraîcheur de la page Événements et robots**

`src/app/(site)/evenements/page.tsx` : la séparation « À venir / Passés » dépend de l'heure. Ajouter sous les imports :

```ts
// Recalculée chaque heure pour qu'un événement passé change de section.
export const revalidate = 3600;
```

`src/app/robots.ts` :

```ts
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
```

- [ ] **Étape 8 : vérifier**

Run : `npx tsc --noEmit && npm run lint && npm test` — Expected : aucune erreur.

Run : `npm run build` — Expected : build réussi ; les pages publiques restent statiques (○ ou ●) dans le résumé de build ; aucune route `/admin` encore.

Run : `npm run dev` puis parcourir `/`, `/amicale`, `/bureau`, `/membres`, `/membres/ibrahima-diao`, `/actualites`, `/actualites/journee-nationale-contenu-local-2026`, `/evenements`, `/evenements/journee-nationale-contenu-local-2026`, `/partenaires`, `/contact` et une URL inexistante (`/nimporte`). Expected : contenu, ordre du bureau, logos des partenaires, coordonnées du pied de page et animations identiques à la Tâche 2 ; la page 404 garde l'en-tête et le pied de page.

- [ ] **Étape 9 : commit**

```bash
git add -A src
git commit -m "Site public lu depuis la base, pages publiques regroupées dans (site)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 7 : rôles et comptes en base

Règles des comptes, testables sans Better Auth : création (avec ou sans mot de passe), changement de rôle, activation, protection du dernier super-admin, suppression des sessions d'un compte désactivé. Plus le script du premier super-admin.

**Files :**
- Create : `src/lib/roles.ts`, `src/lib/roles.test.ts`, `src/db/operations/erreurs.ts`, `src/db/operations/comptes.ts`, `src/db/operations/comptes.test.ts`, `scripts/creer-admin.ts`

**Interfaces :**
- Consumes : schéma, `Db`, `creerDbTest` (Tâche 1).
- Produces :
  - `src/lib/roles.ts` : `ROLES = ["superadmin", "editeur"] as const`, `type Role`, `LIBELLES_ROLES: Record<Role, string>`, `aLeRole(role: Role, requis: Role): boolean`, `class AccesRefuse extends Error`.
  - `src/db/operations/erreurs.ts` : `class ErreurMetier extends Error { champ?: string }`.
  - `src/db/operations/comptes.ts` : `type Compte = { id: string; nom: string; email: string; role: Role; actif: boolean; aMotDePasse: boolean; creeLe: Date }`, `normaliserEmail(email)`, `listerComptes(db)`, `trouverCompte(db, id)`, `creerCompte(db, { nom, email, role }): Promise<{ id: string }>`, `creerCompteAvecMotDePasse(db, { nom, email, role, motDePasse }): Promise<{ id: string }>`, `changerRole(db, { acteurId, cibleId, role })`, `changerActivation(db, { acteurId, cibleId, actif })`.
  - Commande `npm run admin:creer -- --email … --nom "…"`.

- [ ] **Étape 1 : tests des rôles (ils doivent échouer)**

`src/lib/roles.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { aLeRole } from "./roles";

describe("aLeRole", () => {
  it("donne au super-admin tous les droits", () => {
    expect(aLeRole("superadmin", "superadmin")).toBe(true);
    expect(aLeRole("superadmin", "editeur")).toBe(true);
  });

  it("limite l'éditeur à son rôle", () => {
    expect(aLeRole("editeur", "editeur")).toBe(true);
    expect(aLeRole("editeur", "superadmin")).toBe(false);
  });
});
```

Run : `npx vitest run src/lib/roles.test.ts` — Expected : FAIL (module introuvable).

- [ ] **Étape 2 : implémenter `src/lib/roles.ts` et `src/db/operations/erreurs.ts`**

```ts
export const ROLES = ["superadmin", "editeur"] as const;
export type Role = (typeof ROLES)[number];

export const LIBELLES_ROLES: Record<Role, string> = {
  superadmin: "Super-admin",
  editeur: "Éditeur",
};

// Le super-admin a tous les droits de l'éditeur.
export function aLeRole(role: Role, requis: Role): boolean {
  return role === "superadmin" || role === requis;
}

export class AccesRefuse extends Error {
  constructor() {
    super("Accès refusé.");
    this.name = "AccesRefuse";
  }
}
```

`src/db/operations/erreurs.ts` :

```ts
// Refus attendu (règle métier), affiché tel quel à l'utilisateur.
export class ErreurMetier extends Error {
  constructor(
    message: string,
    readonly champ?: string,
  ) {
    super(message);
    this.name = "ErreurMetier";
  }
}
```

Run : `npx vitest run src/lib/roles.test.ts` — Expected : PASS.

- [ ] **Étape 3 : vérifier l'API de hachage de Better Auth**

Run : `grep -rn "hashPassword\|verifyPassword" node_modules/better-auth/dist/crypto/index.d.mts node_modules/@better-auth/utils/dist/password*.d.*`
Expected : `hashPassword(password: string): Promise<string>` et `verifyPassword({ hash, password }): Promise<boolean>` exportés par `better-auth/crypto`. Si les noms ou signatures diffèrent, adapter le code et les tests ci-dessous en conséquence (c'est le hachage par défaut de Better Auth, le même que celui de la connexion).

- [ ] **Étape 4 : tests des comptes (ils doivent échouer)**

`src/db/operations/comptes.test.ts` :

```ts
import { verifyPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { account, session, user } from "@/db/schema";
import { creerDbTest } from "@/test/db";
import {
  changerActivation,
  changerRole,
  creerCompte,
  creerCompteAvecMotDePasse,
  listerComptes,
} from "./comptes";
import { ErreurMetier } from "./erreurs";

const awa = { nom: "Awa Ndiaye", email: "awa@exemple.sn", role: "superadmin" as const };
const moussa = { nom: "Moussa Fall", email: "moussa@exemple.sn", role: "editeur" as const };

describe("création de compte", () => {
  it("normalise l'email et ne crée pas de mot de passe", async () => {
    const db = await creerDbTest();
    await creerCompte(db, { ...moussa, email: "  Moussa@Exemple.SN " });
    const [compte] = await listerComptes(db);
    expect(compte).toMatchObject({ nom: "Moussa Fall", email: "moussa@exemple.sn", role: "editeur", actif: true, aMotDePasse: false });
  });

  it("refuse un email déjà utilisé, quelle que soit la casse", async () => {
    const db = await creerDbTest();
    await creerCompte(db, moussa);
    const erreur = await creerCompte(db, { ...moussa, email: "MOUSSA@exemple.sn" }).catch((e) => e);
    expect(erreur).toBeInstanceOf(ErreurMetier);
    expect(erreur.champ).toBe("email");
  });

  it("enregistre un mot de passe vérifiable par Better Auth", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompteAvecMotDePasse(db, { ...awa, motDePasse: "un-mot-de-passe-solide" });
    const credential = await db.query.account.findFirst({ where: eq(account.userId, id) });
    expect(credential).toMatchObject({ providerId: "credential", accountId: id });
    expect(await verifyPassword({ hash: credential!.password!, password: "un-mot-de-passe-solide" })).toBe(true);
    expect((await listerComptes(db))[0].aMotDePasse).toBe(true);
  });
});

describe("changement de rôle", () => {
  it("refuse de modifier son propre rôle", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, awa);
    await expect(changerRole(db, { acteurId: id, cibleId: id, role: "editeur" })).rejects.toThrow(
      "Vous ne pouvez pas modifier votre propre rôle.",
    );
  });

  it("garde au moins un super-admin actif", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, awa);
    await expect(changerRole(db, { acteurId: "systeme", cibleId: id, role: "editeur" })).rejects.toThrow(
      "Il doit rester au moins un super-admin actif.",
    );
  });

  it("change le rôle quand un autre super-admin reste", async () => {
    const db = await creerDbTest();
    const a = await creerCompte(db, awa);
    const m = await creerCompte(db, { ...moussa, role: "superadmin" });
    await changerRole(db, { acteurId: a.id, cibleId: m.id, role: "editeur" });
    expect((await db.query.user.findFirst({ where: eq(user.id, m.id) }))?.role).toBe("editeur");
  });
});

describe("activation", () => {
  it("refuse de se désactiver soi-même", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, awa);
    await expect(changerActivation(db, { acteurId: id, cibleId: id, actif: false })).rejects.toThrow(
      "Vous ne pouvez pas désactiver votre propre compte.",
    );
  });

  it("désactive un compte et ferme ses sessions ouvertes", async () => {
    const db = await creerDbTest();
    const a = await creerCompte(db, awa);
    const m = await creerCompte(db, moussa);
    await db.insert(session).values({
      id: "s1",
      token: "jeton",
      userId: m.id,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    await changerActivation(db, { acteurId: a.id, cibleId: m.id, actif: false });
    expect((await db.query.user.findFirst({ where: eq(user.id, m.id) }))?.actif).toBe(false);
    expect(await db.$count(session, eq(session.userId, m.id))).toBe(0);
  });

  it("garde au moins un super-admin actif", async () => {
    const db = await creerDbTest();
    const { id } = await creerCompte(db, awa);
    await expect(changerActivation(db, { acteurId: "systeme", cibleId: id, actif: false })).rejects.toThrow(
      "Il doit rester au moins un super-admin actif.",
    );
  });

  it("réactive un compte", async () => {
    const db = await creerDbTest();
    const a = await creerCompte(db, awa);
    const m = await creerCompte(db, moussa);
    await changerActivation(db, { acteurId: a.id, cibleId: m.id, actif: false });
    await changerActivation(db, { acteurId: a.id, cibleId: m.id, actif: true });
    expect((await db.query.user.findFirst({ where: eq(user.id, m.id) }))?.actif).toBe(true);
  });
});
```

Run : `npx vitest run src/db/operations/comptes.test.ts` — Expected : FAIL (module introuvable).

- [ ] **Étape 5 : implémenter `src/db/operations/comptes.ts`**

```ts
import { hashPassword } from "better-auth/crypto";
import { and, count, eq, ne } from "drizzle-orm";
import { account, session, user } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Role } from "@/lib/roles";
import { ErreurMetier } from "./erreurs";

export type Compte = {
  id: string;
  nom: string;
  email: string;
  role: Role;
  actif: boolean;
  // Faux tant que l'invité n'a pas défini son mot de passe.
  aMotDePasse: boolean;
  creeLe: Date;
};

export const normaliserEmail = (email: string) => email.trim().toLowerCase();

export async function listerComptes(db: Db): Promise<Compte[]> {
  const lignes = await db.query.user.findMany({
    with: { accounts: { columns: { providerId: true } } },
    orderBy: (u, { asc }) => [asc(u.name)],
  });
  return lignes.map((u) => ({
    id: u.id,
    nom: u.name,
    email: u.email,
    role: u.role as Role,
    actif: u.actif,
    aMotDePasse: u.accounts.some((a) => a.providerId === "credential"),
    creeLe: u.createdAt,
  }));
}

export async function trouverCompte(db: Db, id: string): Promise<Compte | undefined> {
  return (await listerComptes(db)).find((c) => c.id === id);
}

export async function creerCompte(db: Db, donnees: { nom: string; email: string; role: Role }): Promise<{ id: string }> {
  const email = normaliserEmail(donnees.email);
  const existant = await db.query.user.findFirst({ where: eq(user.email, email), columns: { id: true } });
  if (existant) throw new ErreurMetier("Un compte existe déjà avec cette adresse email.", "email");
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name: donnees.nom.trim(), email, role: donnees.role, emailVerified: true });
  return { id };
}

// Pour le premier super-admin et les tests de bout en bout.
export async function creerCompteAvecMotDePasse(
  db: Db,
  donnees: { nom: string; email: string; role: Role; motDePasse: string },
): Promise<{ id: string }> {
  const { id } = await creerCompte(db, donnees);
  // Même forme que Better Auth : accountId = id de l'utilisateur, fournisseur « credential ».
  await db.insert(account).values({
    id: crypto.randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(donnees.motDePasse),
  });
  return { id };
}

async function lireUtilisateur(db: Db, id: string) {
  const u = await db.query.user.findFirst({ where: eq(user.id, id) });
  if (!u) throw new ErreurMetier("Compte introuvable.");
  return u;
}

async function verifierQuIlResteUnSuperadmin(db: Db, cible: { id: string; role: string; actif: boolean }) {
  if (cible.role !== "superadmin" || !cible.actif) return;
  const [{ n }] = await db
    .select({ n: count() })
    .from(user)
    .where(and(eq(user.role, "superadmin"), eq(user.actif, true), ne(user.id, cible.id)));
  if (n === 0) throw new ErreurMetier("Il doit rester au moins un super-admin actif.");
}

export async function changerRole(db: Db, p: { acteurId: string; cibleId: string; role: Role }) {
  const cible = await lireUtilisateur(db, p.cibleId);
  if (cible.role === p.role) return;
  if (p.acteurId === p.cibleId) throw new ErreurMetier("Vous ne pouvez pas modifier votre propre rôle.");
  if (p.role !== "superadmin") await verifierQuIlResteUnSuperadmin(db, cible);
  await db.update(user).set({ role: p.role }).where(eq(user.id, p.cibleId));
}

export async function changerActivation(db: Db, p: { acteurId: string; cibleId: string; actif: boolean }) {
  const cible = await lireUtilisateur(db, p.cibleId);
  if (cible.actif === p.actif) return;
  if (p.acteurId === p.cibleId) throw new ErreurMetier("Vous ne pouvez pas désactiver votre propre compte.");
  if (!p.actif) await verifierQuIlResteUnSuperadmin(db, cible);
  await db.update(user).set({ actif: p.actif }).where(eq(user.id, p.cibleId));
  // Un compte désactivé perd l'accès tout de suite, pas à l'expiration de sa session.
  if (!p.actif) await db.delete(session).where(eq(session.userId, p.cibleId));
}
```

Run : `npx vitest run src/db/operations/comptes.test.ts` — Expected : 10 tests PASS.

- [ ] **Étape 6 : script du premier super-admin**

`scripts/creer-admin.ts` :

```ts
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { db } from "@/db";
import { creerCompteAvecMotDePasse } from "@/db/operations/comptes";
import { ErreurMetier } from "@/db/operations/erreurs";

// Usage : npm run admin:creer -- --email awa@exemple.sn --nom "Awa Ndiaye"
const { values } = parseArgs({ options: { email: { type: "string" }, nom: { type: "string" } } });

if (!values.email || !values.nom) {
  console.error('Usage : npm run admin:creer -- --email adresse@exemple.sn --nom "Prénom Nom"');
  process.exit(1);
}

const motDePasse = randomBytes(12).toString("base64url");

creerCompteAvecMotDePasse(db, { email: values.email, nom: values.nom, role: "superadmin", motDePasse })
  .then(() => {
    console.log(`Super-admin créé : ${values.email!.trim().toLowerCase()}`);
    console.log(`Mot de passe temporaire : ${motDePasse}`);
    console.log("Connectez-vous sur /admin/connexion puis changez-le dans « Mon compte ».");
    process.exit(0);
  })
  .catch((erreur) => {
    console.error(erreur instanceof ErreurMetier ? erreur.message : erreur);
    process.exit(1);
  });
```

Run : `npx tsc --noEmit && npm run lint && npm test` — Expected : tout passe.

- [ ] **Étape 7 : commit**

```bash
git add src/lib/roles.ts src/lib/roles.test.ts src/db/operations scripts/creer-admin.ts
git commit -m "Rôles, règles des comptes et script du premier super-admin

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 8 : Better Auth, emails et session

**Files :**
- Create : `src/lib/emails.ts`, `src/lib/emails.test.ts`, `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`, `src/lib/admin/resultat.ts`, `src/lib/admin/resultat.test.ts`, `src/lib/admin/action.ts`, `src/lib/admin/messages.ts`, `src/lib/admin/messages.test.ts`, `src/app/api/auth/[...all]/route.ts`

**Interfaces :**
- Consumes : schéma, `db` (Tâche 1) ; `Role`, `aLeRole`, `AccesRefuse` (Tâche 7) ; `ErreurMetier` (Tâche 7) ; `echapperHtml` (Tâche 2).
- Produces :
  - `src/lib/emails.ts` : `contenuEmailMotDePasse({ nom, url, invitation }): { sujet: string; html: string }`, `envoyerEmailMotDePasse({ email, nom, url, invitation }): Promise<void>`.
  - `src/lib/auth.ts` : `auth` (instance Better Auth). `src/lib/auth-client.ts` : `authClient`.
  - `src/lib/session.ts` : `type SessionAdmin = { userId: string; nom: string; email: string; role: Role }`, `lireSession(): Promise<SessionAdmin | null>`, `exigerSession(): Promise<SessionAdmin>` (redirige vers `/admin/connexion`), `exigerRole(role: Role): Promise<SessionAdmin>` (lève `AccesRefuse`).
  - `src/lib/admin/resultat.ts` : `type Resultat<T = void>`, `erreursDe(erreur: z.ZodError): Resultat<never>`, `resultatDErreur(erreur: unknown): Resultat<never> | null`.
  - `src/lib/admin/action.ts` : `action<T>(role: Role, fn: (session: SessionAdmin) => Promise<Resultat<T>>): Promise<Resultat<T>>`.
  - `src/lib/admin/messages.ts` : `messageConnexion(status: number): string`, `messageChangementMotDePasse(code: string | undefined): string`.

- [ ] **Étape 1 : tests des emails, résultats et messages (ils doivent échouer)**

`src/lib/emails.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { contenuEmailMotDePasse } from "./emails";

const url = "https://www.ademig.sn/api/auth/reset-password/abc?callbackURL=%2Fadmin%2Freinitialiser";

describe("contenuEmailMotDePasse", () => {
  it("rédige l'invitation", () => {
    const { sujet, html } = contenuEmailMotDePasse({ nom: "Awa", url, invitation: true });
    expect(sujet).toBe("Votre accès à l'administration du site ADEMIG");
    expect(html).toContain("Définir mon mot de passe");
    expect(html).toContain(url.replace(/&/g, "&amp;"));
    expect(html).toContain("24 heures");
  });

  it("rédige la réinitialisation", () => {
    const { sujet, html } = contenuEmailMotDePasse({ nom: "Awa", url, invitation: false });
    expect(sujet).toBe("Réinitialisation de votre mot de passe ADEMIG");
    expect(html).toContain("Choisir un nouveau mot de passe");
  });

  it("échappe le nom du destinataire", () => {
    const { html } = contenuEmailMotDePasse({ nom: "<b>Awa</b>", url, invitation: true });
    expect(html).toContain("&lt;b&gt;Awa&lt;/b&gt;");
    expect(html).not.toContain("<b>Awa</b>");
  });
});
```

`src/lib/admin/resultat.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ErreurMetier } from "@/db/operations/erreurs";
import { AccesRefuse } from "@/lib/roles";
import { erreursDe, resultatDErreur } from "./resultat";

describe("erreursDe", () => {
  it("rattache les erreurs Zod aux champs", () => {
    const r = z.object({ nom: z.string().min(2, "Indiquez le nom.") }).safeParse({ nom: "" });
    expect(r.success).toBe(false);
    expect(erreursDe(r.error!)).toEqual({
      ok: false,
      message: "Corrigez les champs signalés.",
      erreurs: { nom: ["Indiquez le nom."] },
    });
  });
});

describe("resultatDErreur", () => {
  it("traduit un accès refusé", () => {
    expect(resultatDErreur(new AccesRefuse())).toEqual({ ok: false, message: "Accès refusé." });
  });

  it("traduit une erreur métier, avec son champ", () => {
    expect(resultatDErreur(new ErreurMetier("Email déjà utilisé.", "email"))).toEqual({
      ok: false,
      message: "Email déjà utilisé.",
      erreurs: { email: ["Email déjà utilisé."] },
    });
  });

  it("laisse passer les autres erreurs", () => {
    expect(resultatDErreur(new Error("panne"))).toBeNull();
  });
});
```

`src/lib/admin/messages.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { messageChangementMotDePasse, messageConnexion } from "./messages";

describe("messageConnexion", () => {
  it("explique un compte désactivé", () => {
    expect(messageConnexion(403)).toBe("Ce compte est désactivé. Contactez un super-admin.");
  });
  it("explique la limite de tentatives", () => {
    expect(messageConnexion(429)).toBe("Trop de tentatives. Patientez une minute puis réessayez.");
  });
  it("reste vague sur les identifiants", () => {
    expect(messageConnexion(401)).toBe("Email ou mot de passe incorrect.");
  });
});

describe("messageChangementMotDePasse", () => {
  it("signale un mot de passe actuel incorrect", () => {
    expect(messageChangementMotDePasse("INVALID_PASSWORD")).toBe("Le mot de passe actuel est incorrect.");
  });
  it("signale un mot de passe trop court", () => {
    expect(messageChangementMotDePasse("PASSWORD_TOO_SHORT")).toBe("Le nouveau mot de passe doit faire au moins 12 caractères.");
  });
  it("a un message par défaut", () => {
    expect(messageChangementMotDePasse(undefined)).toBe("Le mot de passe n'a pas pu être changé. Réessayez.");
  });
});
```

Run : `npx vitest run src/lib/emails.test.ts src/lib/admin` — Expected : FAIL (modules introuvables).

- [ ] **Étape 2 : implémenter les emails**

`src/lib/emails.ts` :

```ts
import { Resend } from "resend";
import { echapperHtml } from "@/lib/html";

type EmailMotDePasse = { nom: string; url: string; invitation: boolean };

export function contenuEmailMotDePasse({ nom, url, invitation }: EmailMotDePasse) {
  const sujet = invitation
    ? "Votre accès à l'administration du site ADEMIG"
    : "Réinitialisation de votre mot de passe ADEMIG";
  const intro = invitation
    ? "Un compte vient d'être créé pour vous sur l'espace d'administration du site de l'ADEMIG."
    : "Vous avez demandé à changer le mot de passe de votre compte d'administration du site de l'ADEMIG.";
  const bouton = invitation ? "Définir mon mot de passe" : "Choisir un nouveau mot de passe";
  const lien = echapperHtml(url);
  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f3f0e7;color:#333233;font-family:Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:bold;margin:0 0 24px">ADEMIG</p>
<p>Bonjour ${echapperHtml(nom)},</p>
<p>${intro}</p>
<p style="margin:28px 0"><a href="${lien}" style="background:#5d4433;color:#f3f0e7;padding:12px 20px;text-decoration:none;font-weight:bold">${bouton}</a></p>
<p>Ce lien est valable 24 heures et ne sert qu'une fois. Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${lien}</p>
<p style="font-size:13px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
</div></body></html>`;
  return { sujet, html };
}

export async function envoyerEmailMotDePasse(p: EmailMotDePasse & { email: string }) {
  const { sujet, html } = contenuEmailMotDePasse(p);
  const cle = process.env.RESEND_API_KEY;
  if (!cle) {
    // Développement sans Resend : le lien s'affiche dans le terminal.
    console.info(`[email non envoyé : RESEND_API_KEY absente] ${p.email} → ${p.url}`);
    return;
  }
  // Créé à la demande : le constructeur lève une erreur sans clé.
  const resend = new Resend(cle);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_EXPEDITEUR || "ADEMIG <onboarding@resend.dev>",
    to: p.email,
    subject: sujet,
    html,
  });
  if (error) throw new Error(`Envoi de l'email impossible : ${error.message}`);
}
```

- [ ] **Étape 3 : implémenter résultats et messages**

`src/lib/admin/resultat.ts` :

```ts
import { z } from "zod";
import { ErreurMetier } from "@/db/operations/erreurs";
import { AccesRefuse } from "@/lib/roles";

// Réponse de toute Server Action de l'admin, lue par `useActionState`.
export type Resultat<T = void> =
  | { ok: true; message?: string; donnees?: T }
  | { ok: false; message?: string; erreurs?: Record<string, string[] | undefined> };

export function erreursDe(erreur: z.ZodError): Resultat<never> {
  return {
    ok: false,
    message: "Corrigez les champs signalés.",
    erreurs: z.flattenError(erreur).fieldErrors as Record<string, string[] | undefined>,
  };
}

// Erreurs attendues → message pour l'utilisateur ; les autres remontent (null).
export function resultatDErreur(erreur: unknown): Resultat<never> | null {
  if (erreur instanceof AccesRefuse) return { ok: false, message: erreur.message };
  if (erreur instanceof ErreurMetier) {
    return {
      ok: false,
      message: erreur.message,
      ...(erreur.champ ? { erreurs: { [erreur.champ]: [erreur.message] } } : {}),
    };
  }
  return null;
}
```

`src/lib/admin/messages.ts` :

```ts
export function messageConnexion(status: number): string {
  if (status === 403) return "Ce compte est désactivé. Contactez un super-admin.";
  if (status === 429) return "Trop de tentatives. Patientez une minute puis réessayez.";
  return "Email ou mot de passe incorrect.";
}

export function messageChangementMotDePasse(code: string | undefined): string {
  if (code === "INVALID_PASSWORD") return "Le mot de passe actuel est incorrect.";
  if (code === "PASSWORD_TOO_SHORT") return "Le nouveau mot de passe doit faire au moins 12 caractères.";
  return "Le mot de passe n'a pas pu être changé. Réessayez.";
}
```

Run : `npx vitest run src/lib/emails.test.ts src/lib/admin` — Expected : PASS.

- [ ] **Étape 4 : configurer Better Auth**

Lire `node_modules/next/dist/docs/01-app/02-guides/authentication.md` (sections sur la session et la vérification dans les Server Actions).

`src/lib/auth.ts` :

```ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { envoyerEmailMotDePasse } from "@/lib/emails";

const https = (hote?: string) => (hote ? `https://${hote}` : undefined);

// Adresse publique du site : variable explicite, sinon celle fournie par Vercel.
function urlDuSite() {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_ENV === "production") return https(process.env.VERCEL_PROJECT_PRODUCTION_URL)!;
  return https(process.env.VERCEL_URL) ?? "http://localhost:3000";
}

export const auth = betterAuth({
  baseURL: urlDuSite(),
  trustedOrigins: [https(process.env.VERCEL_URL), https(process.env.VERCEL_BRANCH_URL)].filter(
    (o): o is string => !!o,
  ),
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Pas d'inscription publique : les comptes sont créés par un super-admin.
    disableSignUp: true,
    minPasswordLength: 12,
    // Le même lien sert à l'invitation et à la réinitialisation.
    resetPasswordTokenExpiresIn: 60 * 60 * 24,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      const credential = await db.query.account.findFirst({
        where: and(eq(schema.account.userId, user.id), eq(schema.account.providerId, "credential")),
        columns: { id: true },
      });
      await envoyerEmailMotDePasse({ email: user.email, nom: user.name, url, invitation: !credential });
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "editeur", input: false },
      actif: { type: "boolean", required: true, defaultValue: true, input: false },
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7 },
  databaseHooks: {
    session: {
      create: {
        // Bloque la connexion d'un compte désactivé (les sessions existantes sont supprimées à la désactivation).
        before: async (session) => {
          const u = await db.query.user.findFirst({
            where: eq(schema.user.id, session.userId),
            columns: { actif: true },
          });
          if (!u?.actif) throw new APIError("FORBIDDEN", { message: "Ce compte est désactivé." });
        },
      },
    },
  },
  // nextCookies doit rester le dernier plugin.
  plugins: [nextCookies()],
});
```

`src/lib/auth-client.ts` :

```ts
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

export const authClient = createAuthClient({ plugins: [inferAdditionalFields<typeof auth>()] });
```

`src/app/api/auth/[...all]/route.ts` :

```ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

- [ ] **Étape 5 : session et enveloppe des actions**

`src/lib/session.ts` :

```ts
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { AccesRefuse, aLeRole, type Role } from "@/lib/roles";

export type SessionAdmin = { userId: string; nom: string; email: string; role: Role };

// Une seule lecture par requête, même si plusieurs composants la demandent.
export const lireSession = cache(async (): Promise<SessionAdmin | null> => {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s || !s.user.actif) return null;
  return { userId: s.user.id, nom: s.user.name, email: s.user.email, role: s.user.role as Role };
});

export async function exigerSession(): Promise<SessionAdmin> {
  const s = await lireSession();
  if (!s) redirect("/admin/connexion");
  return s;
}

export async function exigerRole(role: Role): Promise<SessionAdmin> {
  const s = await exigerSession();
  if (!aLeRole(s.role, role)) throw new AccesRefuse();
  return s;
}
```

`src/lib/admin/action.ts` :

```ts
import type { Role } from "@/lib/roles";
import { exigerRole, type SessionAdmin } from "@/lib/session";
import { type Resultat, resultatDErreur } from "./resultat";

// Toute Server Action de l'admin passe par ici : contrôle du rôle, puis erreurs attendues traduites.
export async function action<T = void>(
  role: Role,
  fn: (session: SessionAdmin) => Promise<Resultat<T>>,
): Promise<Resultat<T>> {
  try {
    return await fn(await exigerRole(role));
  } catch (erreur) {
    const resultat = resultatDErreur(erreur);
    if (resultat) return resultat;
    // Les redirections de Next (sans session) et les vraies pannes remontent.
    throw erreur;
  }
}
```

- [ ] **Étape 6 : vérifier la connexion de bout en bout avec curl**

Run : `npx tsc --noEmit && npm run lint && npm test` — Expected : tout passe.

Run : `npm run admin:creer -- --email essai-admin@ademig.test --nom "Essai Admin"` — Expected : le mot de passe temporaire s'affiche ; le noter.

Lancer `npm run dev` dans un autre terminal (ou en arrière-plan), puis :

```bash
curl -s -i -X POST http://localhost:3000/api/auth/sign-in/email \
  -H "content-type: application/json" -H "origin: http://localhost:3000" \
  -d '{"email":"essai-admin@ademig.test","password":"<mot de passe temporaire>"}' | head -20
```

Expected : `HTTP/1.1 200`, un en-tête `set-cookie: better-auth.session_token=…`, et un corps JSON contenant `"role":"superadmin"`.

Même commande avec un mauvais mot de passe — Expected : `401`.

Désactiver le compte directement en base (`npx drizzle-kit studio`, colonne `actif` à `false`) puis rejouer la bonne commande — Expected : `403` et le message `Ce compte est désactivé.`. Ensuite supprimer ce compte d'essai dans le studio (table `user`, la suppression en cascade retire `account` et `session`).

- [ ] **Étape 7 : commit**

```bash
git add src/lib src/app/api/auth
git commit -m "Authentification Better Auth, emails et contrôle des sessions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 9 : proxy, coquille de l'admin et pages de connexion

**Files :**
- Create : `src/lib/admin/routes.ts`, `src/lib/admin/routes.test.ts`, `src/proxy.ts`, `src/components/admin/ui.tsx`, `src/components/admin/confirmation.tsx`, `src/components/admin/coquille.tsx`, `src/app/admin/layout.tsx`, `src/app/admin/(auth)/layout.tsx`, `src/app/admin/(auth)/connexion/page.tsx`, `src/app/admin/(auth)/connexion/formulaire.tsx`, `src/app/admin/(auth)/mot-de-passe-oublie/page.tsx`, `src/app/admin/(auth)/mot-de-passe-oublie/formulaire.tsx`, `src/app/admin/(auth)/reinitialiser/page.tsx`, `src/app/admin/(auth)/reinitialiser/formulaire.tsx`, `src/app/admin/(espace)/layout.tsx`, `src/app/admin/(espace)/page.tsx`, `src/app/admin/(espace)/[rubrique]/page.tsx`, `src/app/admin/(espace)/error.tsx`

**Interfaces :**
- Consumes : `authClient`, `lireSession`, `exigerSession` (Tâche 8) ; `messageConnexion` (Tâche 8) ; `Role`, `aLeRole`, `LIBELLES_ROLES` (Tâche 7) ; `Resultat` (Tâche 8) ; `Logo` (`src/components/logo.tsx`).
- Produces :
  - `src/lib/admin/routes.ts` : `estRouteAdminPublique(chemin: string): boolean`.
  - `src/components/admin/ui.tsx` : `Bouton`, `Champ`, `Selection`, `Alerte`, `Badge`, `TitrePage`, `EtatVide`, `AccesRefusePage`.
  - `src/components/admin/confirmation.tsx` : `BoutonConfirmation`.
  - `src/components/admin/coquille.tsx` : `CoquilleAdmin({ nom, role, children })`.
  - Routes : `/admin/connexion`, `/admin/mot-de-passe-oublie`, `/admin/reinitialiser`, `/admin`, `/admin/{actualites,evenements,membres,bureau,partenaires,reglages}`.

- [ ] **Étape 1 : test des routes publiques (il doit échouer)**

`src/lib/admin/routes.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { estRouteAdminPublique } from "./routes";

describe("estRouteAdminPublique", () => {
  it("laisse passer les pages de connexion", () => {
    expect(estRouteAdminPublique("/admin/connexion")).toBe(true);
    expect(estRouteAdminPublique("/admin/mot-de-passe-oublie")).toBe(true);
    expect(estRouteAdminPublique("/admin/reinitialiser")).toBe(true);
  });

  it("protège tout le reste de l'admin", () => {
    expect(estRouteAdminPublique("/admin")).toBe(false);
    expect(estRouteAdminPublique("/admin/comptes")).toBe(false);
    expect(estRouteAdminPublique("/admin/connexion-piege")).toBe(false);
  });
});
```

Run : `npx vitest run src/lib/admin/routes.test.ts` — Expected : FAIL.

- [ ] **Étape 2 : routes publiques et proxy**

Lire `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`.

`src/lib/admin/routes.ts` :

```ts
const ROUTES_PUBLIQUES = ["/admin/connexion", "/admin/mot-de-passe-oublie", "/admin/reinitialiser"];

export function estRouteAdminPublique(chemin: string): boolean {
  return ROUTES_PUBLIQUES.some((r) => chemin === r || chemin.startsWith(`${r}/`));
}
```

`src/proxy.ts` :

```ts
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";
import { estRouteAdminPublique } from "@/lib/admin/routes";

// Simple commodité : renvoie vers la connexion sans cookie de session.
// La vraie vérification se fait dans chaque page et chaque Server Action.
export function proxy(request: NextRequest) {
  if (estRouteAdminPublique(request.nextUrl.pathname)) return NextResponse.next();
  if (!getSessionCookie(request)) return NextResponse.redirect(new URL("/admin/connexion", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
```

Run : `npx vitest run src/lib/admin/routes.test.ts` — Expected : PASS.

- [ ] **Étape 3 : composants de base de l'admin**

`src/components/admin/ui.tsx` :

```tsx
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { Resultat } from "@/lib/admin/resultat";

const focus = "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-moutarde";

const variantes = {
  principal: "bg-brun text-papier hover:bg-encre",
  secondaire: "border-[1.5px] border-encre bg-papier hover:bg-sable",
  danger: "border-[1.5px] border-rouge bg-papier text-encre hover:bg-rouge hover:text-papier",
};

export function Bouton({
  variante = "principal",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: keyof typeof variantes }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${focus} ${variantes[variante]} ${className}`}
    />
  );
}

function MessagesChamp({ id, aide, erreurs }: { id: string; aide?: string; erreurs?: string[] }) {
  return (
    <>
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
    </>
  );
}

function decritPar(id: string, aide?: string, erreurs?: string[]) {
  const ids = [aide && `${id}-aide`, erreurs?.length && `${id}-erreur`].filter(Boolean);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

const styleSaisie = `mt-1 block min-h-11 w-full border-[1.5px] border-encre bg-white px-3 py-2 aria-invalid:border-rouge ${focus}`;

export function Champ({
  label,
  name,
  aide,
  erreurs,
  className = "",
  ...props
}: ComponentProps<"input"> & { label: string; name: string; aide?: string; erreurs?: string[] }) {
  const id = props.id ?? `champ-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <input
        {...props}
        id={id}
        name={name}
        aria-invalid={erreurs && erreurs.length > 0 ? true : undefined}
        aria-describedby={decritPar(id, aide, erreurs)}
        className={styleSaisie}
      />
      <MessagesChamp id={id} aide={aide} erreurs={erreurs} />
    </div>
  );
}

export function Selection({
  label,
  name,
  options,
  aide,
  erreurs,
  className = "",
  ...props
}: ComponentProps<"select"> & {
  label: string;
  name: string;
  options: { valeur: string; libelle: string }[];
  aide?: string;
  erreurs?: string[];
}) {
  const id = props.id ?? `champ-${name}`;
  return (
    <div className={className}>
      <label htmlFor={id} className="block font-bold">
        {label}
      </label>
      <select
        {...props}
        id={id}
        name={name}
        aria-invalid={erreurs && erreurs.length > 0 ? true : undefined}
        aria-describedby={decritPar(id, aide, erreurs)}
        className={styleSaisie}
      >
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.libelle}
          </option>
        ))}
      </select>
      <MessagesChamp id={id} aide={aide} erreurs={erreurs} />
    </div>
  );
}

// Message de retour d'une action ; annoncé aux lecteurs d'écran.
export function Alerte({ resultat }: { resultat: Pick<Resultat, "ok" | "message"> | null }) {
  if (!resultat?.message) return null;
  return (
    <p
      role={resultat.ok ? "status" : "alert"}
      className={`border-l-4 px-4 py-3 font-bold ${resultat.ok ? "border-vert bg-vert/15" : "border-rouge bg-rouge/10"}`}
    >
      {resultat.message}
    </p>
  );
}

const tonsBadge = { vert: "bg-vert/25", rouge: "bg-rouge/20", moutarde: "bg-moutarde/40", neutre: "bg-sable" };

export function Badge({ ton = "neutre", children }: { ton?: keyof typeof tonsBadge; children: ReactNode }) {
  return <span className={`inline-block px-2 py-0.5 text-sm font-bold ${tonsBadge[ton]}`}>{children}</span>;
}

export function TitrePage({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h1 className="font-titre text-3xl sm:text-4xl">{children}</h1>
      {action}
    </div>
  );
}

export function EtatVide({ children }: { children: ReactNode }) {
  return <p className="border-[1.5px] border-dashed border-encre px-6 py-10 text-center text-lg">{children}</p>;
}

export function AccesRefusePage() {
  return (
    <>
      <TitrePage>Accès refusé</TitrePage>
      <p className="max-w-xl text-lg">
        Cette rubrique est réservée aux super-admins.{" "}
        <Link href="/admin" className="font-bold underline underline-offset-4">
          Revenir au tableau de bord
        </Link>
      </p>
    </>
  );
}
```

`src/components/admin/confirmation.tsx` :

```tsx
"use client";

import { useRef } from "react";
import { Bouton } from "./ui";

// Bouton qui demande confirmation dans une boîte de dialogue native avant d'agir.
export function BoutonConfirmation({
  libelle,
  question,
  confirmer,
  onConfirmer,
  disabled,
  variante = "danger",
}: {
  libelle: string;
  question: string;
  confirmer: string;
  onConfirmer: () => void;
  disabled?: boolean;
  variante?: "danger" | "principal";
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  return (
    <>
      <Bouton type="button" variante={variante} disabled={disabled} onClick={() => dialogue.current?.showModal()}>
        {libelle}
      </Bouton>
      <dialog
        ref={dialogue}
        aria-label={libelle}
        className="m-auto w-[min(26rem,calc(100%-2rem))] border-[1.5px] border-encre bg-papier p-6 text-encre backdrop:bg-encre/50"
      >
        <p className="font-bold">{question}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Bouton type="button" variante="secondaire" onClick={() => dialogue.current?.close()}>
            Annuler
          </Bouton>
          <Bouton
            type="button"
            variante={variante}
            onClick={() => {
              dialogue.current?.close();
              onConfirmer();
            }}
          >
            {confirmer}
          </Bouton>
        </div>
      </dialog>
    </>
  );
}
```

- [ ] **Étape 4 : layouts de l'admin**

`src/app/admin/layout.tsx` :

```tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: { default: "Administration", template: "%s · Administration ADEMIG" },
  robots: { index: false, follow: false },
};

export default function LayoutAdmin({ children }: { children: ReactNode }) {
  return <div className="flex-1 bg-papier text-encre">{children}</div>;
}
```

`src/app/admin/(auth)/layout.tsx` :

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function LayoutConnexion({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mx-auto block w-40" aria-label="Retour au site de l'ADEMIG">
        <Logo priority className="h-auto w-full" />
      </Link>
      <div className="mt-6 border-[1.5px] border-encre bg-white/60 p-6 sm:p-8">{children}</div>
    </main>
  );
}
```

`src/components/admin/coquille.tsx` :

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { LIBELLES_ROLES, type Role } from "@/lib/roles";

const liens: { href: string; libelle: string; superadmin?: boolean }[] = [
  { href: "/admin", libelle: "Tableau de bord" },
  { href: "/admin/actualites", libelle: "Actualités" },
  { href: "/admin/evenements", libelle: "Événements" },
  { href: "/admin/membres", libelle: "Membres" },
  { href: "/admin/bureau", libelle: "Bureau" },
  { href: "/admin/partenaires", libelle: "Partenaires" },
  { href: "/admin/medias", libelle: "Médiathèque" },
  { href: "/admin/reglages", libelle: "Réglages" },
  { href: "/admin/comptes", libelle: "Comptes", superadmin: true },
];

const lienStyle = "block min-h-11 px-3 py-2.5 font-bold focus-visible:outline-3 focus-visible:outline-moutarde";

export function CoquilleAdmin({ nom, role, children }: { nom: string; role: Role; children: ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);

  async function deconnecter() {
    await authClient.signOut();
    router.push("/admin/connexion");
    router.refresh();
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <header className="flex items-center justify-between border-b-[1.5px] border-encre px-4 py-3 lg:hidden">
        <Link href="/admin" className="font-titre text-xl">
          ADEMIG · Admin
        </Link>
        <button
          type="button"
          aria-expanded={ouvert}
          aria-controls="menu-admin"
          onClick={() => setOuvert(!ouvert)}
          className="min-h-11 border-[1.5px] border-encre px-4 font-bold"
        >
          {ouvert ? "Fermer" : "Menu"}
        </button>
      </header>

      <nav
        id="menu-admin"
        aria-label="Administration"
        className={`${ouvert ? "block" : "hidden"} border-b-[1.5px] border-encre bg-sable lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto lg:border-r-[1.5px] lg:border-b-0`}
      >
        <div className="hidden px-6 pt-8 lg:block">
          <Link href="/admin" className="font-titre text-3xl">
            ADEMIG
          </Link>
          <p className="text-sm">Administration</p>
        </div>
        <ul className="px-3 py-4">
          {liens
            .filter((l) => !l.superadmin || role === "superadmin")
            .map((l) => {
              const actif = l.href === "/admin" ? chemin === "/admin" : chemin.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={actif ? "page" : undefined}
                    onClick={() => setOuvert(false)}
                    className={`${lienStyle} ${actif ? "bg-brun text-papier" : "hover:bg-papier"}`}
                  >
                    {l.libelle}
                  </Link>
                </li>
              );
            })}
        </ul>
        <div className="border-t-[1.5px] border-encre px-3 py-4">
          <p className="px-3 text-sm">
            {nom} · {LIBELLES_ROLES[role]}
          </p>
          <ul className="mt-2">
            <li>
              <Link href="/admin/mon-compte" onClick={() => setOuvert(false)} className={`${lienStyle} hover:bg-papier`}>
                Mon compte
              </Link>
            </li>
            <li>
              <a href="/" target="_blank" rel="noopener" className={`${lienStyle} hover:bg-papier`}>
                Voir le site
              </a>
            </li>
            <li>
              <button type="button" onClick={deconnecter} className={`${lienStyle} w-full text-left hover:bg-papier`}>
                Se déconnecter
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <main id="contenu-admin" className="min-w-0 px-4 py-6 sm:px-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
```

`src/app/admin/(espace)/layout.tsx` :

```tsx
import type { ReactNode } from "react";
import { CoquilleAdmin } from "@/components/admin/coquille";
import { exigerSession } from "@/lib/session";

export default async function LayoutEspace({ children }: { children: ReactNode }) {
  const session = await exigerSession();
  return (
    <CoquilleAdmin nom={session.nom} role={session.role}>
      {children}
    </CoquilleAdmin>
  );
}
```

`src/app/admin/(espace)/error.tsx` :

```tsx
"use client";

import { Bouton, TitrePage } from "@/components/admin/ui";

export default function ErreurAdmin({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <>
      <TitrePage>Une erreur est survenue</TitrePage>
      <p className="max-w-xl text-lg">
        L&apos;opération n&apos;a pas pu aboutir. Réessayez dans un instant ; si le problème continue, transmettez ce
        code à l&apos;équipe technique : <code>{error.digest ?? "inconnu"}</code>.
      </p>
      <Bouton type="button" className="mt-6" onClick={() => retry()}>
        Réessayer
      </Bouton>
    </>
  );
}
```

- [ ] **Étape 5 : tableau de bord et rubriques à venir**

`src/app/admin/(espace)/page.tsx` :

```tsx
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
```

`src/app/admin/(espace)/[rubrique]/page.tsx` :

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EtatVide, TitrePage } from "@/components/admin/ui";
import { exigerSession } from "@/lib/session";

const rubriques: Record<string, string> = {
  actualites: "Actualités",
  evenements: "Événements",
  membres: "Membres",
  bureau: "Bureau et commissions",
  partenaires: "Partenaires",
  reglages: "Réglages",
};

export async function generateMetadata({ params }: PageProps<"/admin/[rubrique]">): Promise<Metadata> {
  const { rubrique } = await params;
  return { title: rubriques[rubrique] ?? "Introuvable" };
}

export default async function Rubrique({ params }: PageProps<"/admin/[rubrique]">) {
  await exigerSession();
  const { rubrique } = await params;
  const titre = rubriques[rubrique];
  if (!titre) notFound();
  return (
    <>
      <TitrePage>{titre}</TitrePage>
      <EtatVide>Bientôt disponible : cette rubrique arrive avec la prochaine étape du back office.</EtatVide>
    </>
  );
}
```

- [ ] **Étape 6 : page de connexion**

`src/app/admin/(auth)/connexion/page.tsx` :

```tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { lireSession } from "@/lib/session";
import { FormulaireConnexion } from "./formulaire";

export const metadata: Metadata = { title: "Connexion" };

export default async function Connexion() {
  if (await lireSession()) redirect("/admin");
  return (
    <>
      <h1 className="font-titre text-3xl">Connexion</h1>
      <p className="mt-2">Espace réservé au bureau de l&apos;amicale.</p>
      <FormulaireConnexion />
    </>
  );
}
```

`src/app/admin/(auth)/connexion/formulaire.tsx` :

```tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { messageConnexion } from "@/lib/admin/messages";
import { authClient } from "@/lib/auth-client";

export function FormulaireConnexion() {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const donnees = new FormData(evenement.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(donnees.get("email")).trim().toLowerCase(),
      password: String(donnees.get("password")),
    });
    if (error) {
      setErreur(messageConnexion(error.status));
      setEnvoi(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-5">
      <Alerte resultat={erreur ? { ok: false, message: erreur } : null} />
      <Champ label="Email" name="email" type="email" autoComplete="email" required />
      <Champ label="Mot de passe" name="password" type="password" autoComplete="current-password" required />
      <Bouton type="submit" disabled={envoi} className="w-full">
        {envoi ? "Connexion…" : "Se connecter"}
      </Bouton>
      <p className="text-center">
        <Link href="/admin/mot-de-passe-oublie" className="underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Étape 7 : mot de passe oublié**

`src/app/admin/(auth)/mot-de-passe-oublie/page.tsx` :

```tsx
import type { Metadata } from "next";
import { FormulaireMotDePasseOublie } from "./formulaire";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOublie() {
  return (
    <>
      <h1 className="font-titre text-3xl">Mot de passe oublié</h1>
      <p className="mt-2">Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
      <FormulaireMotDePasseOublie />
    </>
  );
}
```

`src/app/admin/(auth)/mot-de-passe-oublie/formulaire.tsx` :

```tsx
"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { messageConnexion } from "@/lib/admin/messages";
import { authClient } from "@/lib/auth-client";

export function FormulaireMotDePasseOublie() {
  const [resultat, setResultat] = useState<{ ok: boolean; message: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setEnvoi(true);
    const email = String(new FormData(evenement.currentTarget).get("email")).trim().toLowerCase();
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/admin/reinitialiser" });
    setEnvoi(false);
    // Même réponse que le compte existe ou non : on ne révèle pas les adresses enregistrées.
    setResultat(
      error?.status === 429
        ? { ok: false, message: messageConnexion(429) }
        : {
            ok: true,
            message: "Si un compte correspond à cette adresse, un email vient de partir. Le lien est valable 24 heures.",
          },
    );
  }

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-5">
      <Alerte resultat={resultat} />
      <Champ label="Email" name="email" type="email" autoComplete="email" required />
      <Bouton type="submit" disabled={envoi} className="w-full">
        {envoi ? "Envoi…" : "Recevoir le lien"}
      </Bouton>
      <p className="text-center">
        <Link href="/admin/connexion" className="underline underline-offset-4">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
```

- [ ] **Étape 8 : réinitialisation (et premier mot de passe des invités)**

Better Auth redirige le lien de l'email vers `/admin/reinitialiser?token=…`, ou `?error=INVALID_TOKEN` si le lien est expiré ou déjà utilisé.

`src/app/admin/(auth)/reinitialiser/page.tsx` :

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { FormulaireReinitialisation } from "./formulaire";

export const metadata: Metadata = { title: "Choisir un mot de passe" };

export default async function Reinitialiser({ searchParams }: PageProps<"/admin/reinitialiser">) {
  const { token, error } = await searchParams;
  const jeton = typeof token === "string" ? token : null;
  return (
    <>
      <h1 className="font-titre text-3xl">Choisir un mot de passe</h1>
      {jeton && !error ? (
        <FormulaireReinitialisation token={jeton} />
      ) : (
        <LienInvalide />
      )}
    </>
  );
}

function LienInvalide() {
  return (
    <div className="mt-4 space-y-4">
      <p>Ce lien n&apos;est plus valable : il a expiré (24 heures) ou a déjà servi.</p>
      <p>
        <Link href="/admin/mot-de-passe-oublie" className="font-bold underline underline-offset-4">
          Demander un nouveau lien
        </Link>
      </p>
    </div>
  );
}
```

`src/app/admin/(auth)/reinitialiser/formulaire.tsx` :

```tsx
"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { authClient } from "@/lib/auth-client";

export function FormulaireReinitialisation({ token }: { token: string }) {
  const [erreurs, setErreurs] = useState<{ motDePasse?: string[]; confirmation?: string[] }>({});
  const [etat, setEtat] = useState<"saisie" | "envoi" | "fait" | "invalide">("saisie");

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const donnees = new FormData(evenement.currentTarget);
    const motDePasse = String(donnees.get("motDePasse"));
    const confirmation = String(donnees.get("confirmation"));
    if (motDePasse.length < 12) return setErreurs({ motDePasse: ["12 caractères minimum."] });
    if (motDePasse !== confirmation) return setErreurs({ confirmation: ["Les deux mots de passe diffèrent."] });
    setErreurs({});
    setEtat("envoi");
    const { error } = await authClient.resetPassword({ newPassword: motDePasse, token });
    setEtat(error ? "invalide" : "fait");
  }

  if (etat === "fait") {
    return (
      <div className="mt-4 space-y-4">
        <Alerte resultat={{ ok: true, message: "Mot de passe enregistré." }} />
        <Link href="/admin/connexion" className="font-bold underline underline-offset-4">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} className="mt-6 space-y-5">
      {etat === "invalide" && (
        <Alerte
          resultat={{ ok: false, message: "Ce lien n'est plus valable : il a expiré (24 heures) ou a déjà servi." }}
        />
      )}
      <Champ
        label="Nouveau mot de passe"
        name="motDePasse"
        type="password"
        autoComplete="new-password"
        aide="12 caractères minimum. Une phrase de plusieurs mots est facile à retenir."
        erreurs={erreurs.motDePasse}
        required
      />
      <Champ
        label="Confirmer le mot de passe"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        erreurs={erreurs.confirmation}
        required
      />
      <Bouton type="submit" disabled={etat === "envoi"} className="w-full">
        {etat === "envoi" ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
      {etat === "invalide" && (
        <p className="text-center">
          <Link href="/admin/mot-de-passe-oublie" className="font-bold underline underline-offset-4">
            Demander un nouveau lien
          </Link>
        </p>
      )}
    </form>
  );
}
```

- [ ] **Étape 9 : vérifier**

Run : `npx tsc --noEmit && npm run lint && npm test && npm run build` — Expected : tout passe ; le build liste les routes `/admin/…` comme dynamiques (ƒ).

Vérification manuelle avec `npm run dev` et un compte créé par `npm run admin:creer` :
1. `/admin` sans être connecté → redirection vers `/admin/connexion`.
2. Mauvais mot de passe → « Email ou mot de passe incorrect. ».
3. Bon mot de passe → tableau de bord « Bonjour … » ; le menu contient « Comptes ».
4. `/admin/actualites` → « Bientôt disponible ». `/admin/nimporte` → page 404.
5. À 360 px de large (outils de développement) : bouton « Menu » visible, menu en tiroir, aucun défilement horizontal.
6. « Mot de passe oublié » → message neutre ; sans `RESEND_API_KEY`, le lien apparaît dans le terminal de `npm run dev` ; avec la clé, l'email arrive (seulement à l'adresse du titulaire du compte Resend tant que le domaine n'est pas vérifié). Suivre le lien → formulaire → « Mot de passe enregistré. » → se connecter avec le nouveau mot de passe.
7. Rouvrir le même lien → « Ce lien n'est plus valable ».
8. « Se déconnecter » → retour à la connexion ; `/admin` redirige de nouveau.

- [ ] **Étape 10 : commit**

```bash
git add src/proxy.ts src/lib/admin src/components/admin src/app/admin
git commit -m "Coquille de l'admin, connexion et réinitialisation du mot de passe

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 10 : gestion des comptes (super-admin)

**Files :**
- Create : `src/lib/validation/comptes.ts`, `src/lib/validation/comptes.test.ts`, `src/lib/admin/comptes.ts`, `src/app/admin/(espace)/comptes/page.tsx`, `src/app/admin/(espace)/comptes/formulaire-invitation.tsx`, `src/app/admin/(espace)/comptes/ligne-compte.tsx`

**Interfaces :**
- Consumes : `listerComptes`, `trouverCompte`, `creerCompte`, `changerRole`, `changerActivation`, `Compte` (Tâche 7) ; `action`, `erreursDe`, `Resultat` (Tâche 8) ; `auth` (Tâche 8) ; composants admin (Tâche 9).
- Produces :
  - `schemaInvitation` (Zod) : `{ nom: string; email: string; role: Role }` avec email normalisé.
  - Server Actions : `inviterCompte(etat: Resultat | null, donnees: FormData): Promise<Resultat>`, `renvoyerInvitation(id: string): Promise<Resultat>`, `modifierRole(id: string, role: string): Promise<Resultat>`, `modifierActivation(id: string, actif: boolean): Promise<Resultat>`.
  - Route `/admin/comptes`.

- [ ] **Étape 1 : tests de validation (ils doivent échouer)**

`src/lib/validation/comptes.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { schemaInvitation } from "./comptes";

describe("schemaInvitation", () => {
  it("normalise l'email et le nom", () => {
    expect(schemaInvitation.parse({ nom: "  Awa Ndiaye ", email: " Awa@Exemple.SN ", role: "editeur" })).toEqual({
      nom: "Awa Ndiaye",
      email: "awa@exemple.sn",
      role: "editeur",
    });
  });

  it("refuse un email invalide, un nom vide et un rôle inconnu", () => {
    const r = schemaInvitation.safeParse({ nom: " ", email: "awa", role: "admin" });
    expect(r.success).toBe(false);
    const champs = r.error!.issues.map((i) => i.path[0]);
    expect(champs).toEqual(expect.arrayContaining(["nom", "email", "role"]));
  });
});
```

Run : `npx vitest run src/lib/validation` — Expected : FAIL.

- [ ] **Étape 2 : schéma**

`src/lib/validation/comptes.ts` :

```ts
import { z } from "zod";
import { ROLES } from "@/lib/roles";

export const schemaInvitation = z.object({
  nom: z.string().trim().min(2, "Indiquez le prénom et le nom."),
  email: z.string().trim().toLowerCase().pipe(z.email("Adresse email invalide.")),
  role: z.enum(ROLES, "Choisissez un rôle."),
});

export const schemaRole = z.enum(ROLES);
```

Run : `npx vitest run src/lib/validation` — Expected : PASS.

- [ ] **Étape 3 : Server Actions**

`src/lib/admin/comptes.ts` :

```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { changerActivation, changerRole, creerCompte, trouverCompte } from "@/db/operations/comptes";
import { ErreurMetier } from "@/db/operations/erreurs";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat } from "@/lib/admin/resultat";
import { auth } from "@/lib/auth";
import { schemaInvitation, schemaRole } from "@/lib/validation/comptes";

async function envoyerLien(email: string) {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: "/admin/reinitialiser" } });
}

export async function inviterCompte(_etat: Resultat | null, donnees: FormData): Promise<Resultat> {
  return action("superadmin", async () => {
    const saisie = schemaInvitation.safeParse(Object.fromEntries(donnees));
    if (!saisie.success) return erreursDe(saisie.error);
    await creerCompte(db, saisie.data);
    await envoyerLien(saisie.data.email);
    revalidatePath("/admin/comptes");
    return { ok: true, message: `Invitation envoyée à ${saisie.data.email}.` };
  });
}

export async function renvoyerInvitation(id: string): Promise<Resultat> {
  return action("superadmin", async () => {
    const compte = await trouverCompte(db, id);
    if (!compte) throw new ErreurMetier("Compte introuvable.");
    if (compte.aMotDePasse) throw new ErreurMetier("Ce compte a déjà défini son mot de passe.");
    await envoyerLien(compte.email);
    return { ok: true, message: `Invitation renvoyée à ${compte.email}.` };
  });
}

export async function modifierRole(id: string, role: string): Promise<Resultat> {
  return action("superadmin", async (session) => {
    const nouveauRole = schemaRole.safeParse(role);
    if (!nouveauRole.success) throw new ErreurMetier("Rôle inconnu.");
    await changerRole(db, { acteurId: session.userId, cibleId: id, role: nouveauRole.data });
    revalidatePath("/admin/comptes");
    return { ok: true, message: "Rôle mis à jour." };
  });
}

export async function modifierActivation(id: string, actif: boolean): Promise<Resultat> {
  return action("superadmin", async (session) => {
    await changerActivation(db, { acteurId: session.userId, cibleId: id, actif });
    revalidatePath("/admin/comptes");
    return { ok: true, message: actif ? "Compte réactivé." : "Compte désactivé : ses sessions sont fermées." };
  });
}
```

Si `auth.api.requestPasswordReset` refuse le `redirectTo` relatif appelé côté serveur (erreur d'origine), passer l'URL absolue construite avec `process.env.BETTER_AUTH_URL` ou l'URL de base exposée par la configuration (`(await auth.$context).baseURL` sans le suffixe `/api/auth`). Vérifier sur l'email reçu (ou dans le terminal sans Resend) que le lien mène bien à `/admin/reinitialiser?token=…`.

- [ ] **Étape 4 : page Comptes**

`src/app/admin/(espace)/comptes/page.tsx` :

```tsx
import type { Metadata } from "next";
import { AccesRefusePage, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerComptes } from "@/db/operations/comptes";
import { aLeRole } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulaireInvitation } from "./formulaire-invitation";
import { LigneCompte } from "./ligne-compte";

export const metadata: Metadata = { title: "Comptes" };

export default async function Comptes() {
  const session = await exigerSession();
  if (!aLeRole(session.role, "superadmin")) return <AccesRefusePage />;
  const comptes = await listerComptes(db);
  return (
    <>
      <TitrePage>Comptes</TitrePage>
      <section aria-labelledby="inviter" className="max-w-2xl border-[1.5px] border-encre p-5 sm:p-6">
        <h2 id="inviter" className="font-titre text-2xl">
          Inviter une personne
        </h2>
        <p className="mt-1">Elle recevra un email pour choisir son mot de passe (lien valable 24 heures).</p>
        <FormulaireInvitation />
      </section>
      <h2 className="font-titre mt-12 text-2xl">Comptes existants</h2>
      <ul className="mt-4 space-y-4">
        {comptes.map((c) => (
          <LigneCompte key={c.id} compte={c} estMoi={c.id === session.userId} />
        ))}
      </ul>
    </>
  );
}
```

`src/app/admin/(espace)/comptes/formulaire-invitation.tsx` :

```tsx
"use client";

import { useActionState } from "react";
import { Alerte, Bouton, Champ, Selection } from "@/components/admin/ui";
import { inviterCompte } from "@/lib/admin/comptes";
import { LIBELLES_ROLES, ROLES } from "@/lib/roles";

export function FormulaireInvitation() {
  const [resultat, envoyer, enCours] = useActionState(inviterCompte, null);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  return (
    // La clé remet le formulaire à zéro après une invitation réussie.
    <form key={resultat?.ok ? resultat.message : "saisie"} action={envoyer} className="mt-5 grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Alerte resultat={resultat} />
      </div>
      <Champ label="Prénom et nom" name="nom" autoComplete="off" erreurs={erreurs?.nom} required />
      <Champ label="Email" name="email" type="email" autoComplete="off" erreurs={erreurs?.email} required />
      <Selection
        label="Rôle"
        name="role"
        defaultValue="editeur"
        options={ROLES.map((r) => ({ valeur: r, libelle: LIBELLES_ROLES[r] }))}
        aide="L'éditeur gère le contenu ; le super-admin gère aussi les comptes."
        erreurs={erreurs?.role}
      />
      <div className="flex items-end">
        <Bouton type="submit" disabled={enCours} className="w-full sm:w-auto">
          {enCours ? "Envoi…" : "Envoyer l'invitation"}
        </Bouton>
      </div>
    </form>
  );
}
```

`src/app/admin/(espace)/comptes/ligne-compte.tsx` :

```tsx
"use client";

import { useState, useTransition } from "react";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Badge, Bouton, Selection } from "@/components/admin/ui";
import type { Compte } from "@/db/operations/comptes";
import { modifierActivation, modifierRole, renvoyerInvitation } from "@/lib/admin/comptes";
import type { Resultat } from "@/lib/admin/resultat";
import { LIBELLES_ROLES, ROLES } from "@/lib/roles";

export function LigneCompte({ compte, estMoi }: { compte: Compte; estMoi: boolean }) {
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  const executer = (fn: () => Promise<Resultat>) => demarrer(async () => setResultat(await fn()));

  return (
    <li className="border-[1.5px] border-encre p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">
            {compte.nom} {estMoi && <span className="font-normal">(vous)</span>}
          </p>
          <p className="break-all">{compte.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {compte.actif ? <Badge ton="vert">Actif</Badge> : <Badge ton="rouge">Désactivé</Badge>}
          {!compte.aMotDePasse && <Badge ton="moutarde">Invitation en attente</Badge>}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Selection
          label="Rôle"
          name={`role-${compte.id}`}
          value={compte.role}
          disabled={estMoi || enCours}
          onChange={(e) => executer(() => modifierRole(compte.id, e.target.value))}
          options={ROLES.map((r) => ({ valeur: r, libelle: LIBELLES_ROLES[r] }))}
          className="w-48"
        />
        {!compte.aMotDePasse && (
          <Bouton type="button" variante="secondaire" disabled={enCours} onClick={() => executer(() => renvoyerInvitation(compte.id))}>
            Renvoyer l&apos;invitation
          </Bouton>
        )}
        {!estMoi &&
          (compte.actif ? (
            <BoutonConfirmation
              libelle="Désactiver"
              question={`Désactiver le compte de ${compte.nom} ? La personne sera déconnectée immédiatement.`}
              confirmer="Désactiver"
              disabled={enCours}
              onConfirmer={() => executer(() => modifierActivation(compte.id, false))}
            />
          ) : (
            <Bouton type="button" variante="secondaire" disabled={enCours} onClick={() => executer(() => modifierActivation(compte.id, true))}>
              Réactiver
            </Bouton>
          ))}
      </div>
      {resultat && (
        <div className="mt-3">
          <Alerte resultat={resultat} />
        </div>
      )}
    </li>
  );
}
```

- [ ] **Étape 5 : vérifier**

Run : `npx tsc --noEmit && npm run lint && npm test` — Expected : tout passe.

Vérification manuelle (`npm run dev`, connecté en super-admin) :
1. Inviter « Essai Éditeur », email de test (celui du compte Resend si la clé est en place, sinon une adresse quelconque et lire le lien dans le terminal), rôle Éditeur → « Invitation envoyée… », la ligne apparaît avec « Invitation en attente ».
2. Inviter la même adresse en majuscules → erreur sur le champ Email « Un compte existe déjà… ».
3. « Renvoyer l'invitation » → message de confirmation, nouveau lien reçu.
4. Ouvrir le lien dans une fenêtre privée, choisir un mot de passe, se connecter : le menu ne contient pas « Comptes » ; ouvrir `/admin/comptes` à la main → « Accès refusé ».
5. Revenir en super-admin : changer le rôle de l'éditeur, le désactiver (boîte de confirmation) ; dans la fenêtre privée, recharger → retour à la connexion ; tenter de se connecter → « Ce compte est désactivé… ». Le réactiver.
6. Sur sa propre ligne : sélecteur de rôle grisé, pas de bouton « Désactiver ».

- [ ] **Étape 6 : commit**

```bash
git add src/lib/validation src/lib/admin/comptes.ts "src/app/admin/(espace)/comptes"
git commit -m "Gestion des comptes : invitation, rôles, activation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 11 : page « Mon compte »

**Files :**
- Create : `src/app/admin/(espace)/mon-compte/page.tsx`, `src/app/admin/(espace)/mon-compte/formulaires.tsx`

**Interfaces :**
- Consumes : `exigerSession` (Tâche 8), `authClient` (Tâche 8), `messageChangementMotDePasse` (Tâche 8), composants admin (Tâche 9).
- Produces : route `/admin/mon-compte`.

- [ ] **Étape 1 : page**

`src/app/admin/(espace)/mon-compte/page.tsx` :

```tsx
import type { Metadata } from "next";
import { TitrePage } from "@/components/admin/ui";
import { LIBELLES_ROLES } from "@/lib/roles";
import { exigerSession } from "@/lib/session";
import { FormulaireMotDePasse, FormulaireNom } from "./formulaires";

export const metadata: Metadata = { title: "Mon compte" };

export default async function MonCompte() {
  const session = await exigerSession();
  return (
    <>
      <TitrePage>Mon compte</TitrePage>
      <p>
        {session.email} · {LIBELLES_ROLES[session.role]}
      </p>
      <div className="mt-8 grid max-w-4xl gap-8 lg:grid-cols-2">
        <section aria-labelledby="titre-nom" className="border-[1.5px] border-encre p-5 sm:p-6">
          <h2 id="titre-nom" className="font-titre text-2xl">
            Nom affiché
          </h2>
          <FormulaireNom nom={session.nom} />
        </section>
        <section aria-labelledby="titre-mdp" className="border-[1.5px] border-encre p-5 sm:p-6">
          <h2 id="titre-mdp" className="font-titre text-2xl">
            Mot de passe
          </h2>
          <FormulaireMotDePasse />
        </section>
      </div>
    </>
  );
}
```

- [ ] **Étape 2 : formulaires**

`src/app/admin/(espace)/mon-compte/formulaires.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { messageChangementMotDePasse } from "@/lib/admin/messages";
import { authClient } from "@/lib/auth-client";

type Retour = { ok: boolean; message: string } | null;

export function FormulaireNom({ nom }: { nom: string }) {
  const router = useRouter();
  const [retour, setRetour] = useState<Retour>(null);
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const nouveau = String(new FormData(evenement.currentTarget).get("nom")).trim();
    if (nouveau.length < 2) return setRetour({ ok: false, message: "Indiquez le prénom et le nom." });
    setEnvoi(true);
    const { error } = await authClient.updateUser({ name: nouveau });
    setEnvoi(false);
    setRetour(error ? { ok: false, message: "Le nom n'a pas pu être enregistré." } : { ok: true, message: "Nom enregistré." });
    if (!error) router.refresh();
  }

  return (
    <form onSubmit={soumettre} className="mt-4 space-y-5">
      <Alerte resultat={retour} />
      <Champ label="Prénom et nom" name="nom" defaultValue={nom} autoComplete="name" required />
      <Bouton type="submit" disabled={envoi}>
        {envoi ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}

export function FormulaireMotDePasse() {
  const [retour, setRetour] = useState<Retour>(null);
  const [erreurs, setErreurs] = useState<{ nouveau?: string[]; confirmation?: string[] }>({});
  const [envoi, setEnvoi] = useState(false);

  async function soumettre(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    const formulaire = evenement.currentTarget;
    const donnees = new FormData(formulaire);
    const nouveau = String(donnees.get("nouveau"));
    if (nouveau.length < 12) return setErreurs({ nouveau: ["12 caractères minimum."] });
    if (nouveau !== String(donnees.get("confirmation"))) {
      return setErreurs({ confirmation: ["Les deux mots de passe diffèrent."] });
    }
    setErreurs({});
    setEnvoi(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(donnees.get("actuel")),
      newPassword: nouveau,
      // Les autres appareils connectés sont déconnectés.
      revokeOtherSessions: true,
    });
    setEnvoi(false);
    if (error) return setRetour({ ok: false, message: messageChangementMotDePasse(error.code) });
    formulaire.reset();
    setRetour({ ok: true, message: "Mot de passe changé. Vos autres appareils ont été déconnectés." });
  }

  return (
    <form onSubmit={soumettre} className="mt-4 space-y-5">
      <Alerte resultat={retour} />
      <Champ label="Mot de passe actuel" name="actuel" type="password" autoComplete="current-password" required />
      <Champ
        label="Nouveau mot de passe"
        name="nouveau"
        type="password"
        autoComplete="new-password"
        aide="12 caractères minimum."
        erreurs={erreurs.nouveau}
        required
      />
      <Champ
        label="Confirmer le nouveau mot de passe"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        erreurs={erreurs.confirmation}
        required
      />
      <Bouton type="submit" disabled={envoi}>
        {envoi ? "Enregistrement…" : "Changer le mot de passe"}
      </Bouton>
    </form>
  );
}
```

- [ ] **Étape 3 : vérifier**

Run : `npx tsc --noEmit && npm run lint` — Expected : aucune erreur. Si `error.code` n'existe pas sur l'erreur renvoyée par `authClient.changePassword`, lire le type de retour dans `node_modules/better-auth` et utiliser le champ qui porte le code (`INVALID_PASSWORD`).

Vérification manuelle : changer son nom (le menu affiche le nouveau nom après rechargement) ; mot de passe actuel faux → « Le mot de passe actuel est incorrect. » ; changement réussi → reconnexion avec le nouveau mot de passe.

- [ ] **Étape 4 : commit**

```bash
git add "src/app/admin/(espace)/mon-compte"
git commit -m "Page Mon compte : nom et mot de passe

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 12 : médiathèque côté serveur

**Files :**
- Create : `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/validation/media.ts`, `src/lib/validation/media.test.ts`, `src/lib/admin/preparer-image.ts`, `src/lib/admin/preparer-image.test.ts`, `src/db/operations/media.ts`, `src/db/operations/media.test.ts`, `src/lib/admin/media.ts`, `src/app/api/media/upload/route.ts`
- Modify : `next.config.ts`

**Interfaces :**
- Consumes : schéma, `Db`, `creerDbTest`, `seed` (Tâches 1 et 3) ; `ErreurMetier` (Tâche 7) ; `action`, `erreursDe`, `Resultat` (Tâche 8) ; `lireSession` (Tâche 8) ; `TAGS` (Tâche 6) ; `photos` initiales (Tâche 2).
- Produces :
  - `src/lib/format.ts` : `formatOctets(octets: number): string`.
  - `src/lib/validation/media.ts` : `TYPES_IMAGES`, `TAILLE_MAX` (10 Mo), `COTE_MAX` (2000), `QUALITE_WEBP` (0,82), `estUrlBlob(url: string): boolean`, `verifierFichier(f: { name: string; type: string; size: number }): string | null`, `schemaNouveauMedia`, `schemaMajMedia`.
  - `src/lib/admin/preparer-image.ts` : `calculerDimensions(largeur, hauteur, max?)`, `nomDeFichier(nom, extension)`, `preparerImage(fichier: File): Promise<{ fichier: File; width: number; height: number }>` (navigateur).
  - `src/db/operations/media.ts` : `type Media`, `type NouveauMedia`, `type UsageMedia = { libelle: string; lien: string }`, `listerMedias(db, recherche?)`, `lireMedia(db, id)`, `creerMedia(db, donnees, creePar)`, `modifierMedia(db, id, { alt, credit })`, `usagesMedia(db, id)`, `supprimerMedia(db, id): Promise<{ url: string; pathname: string | null }>`.
  - Server Actions : `enregistrerMedia(donnees: unknown): Promise<Resultat<{ id: string }>>`, `mettreAJourMedia(id: string, etat: Resultat | null, donnees: FormData): Promise<Resultat>`, `supprimerMediaAction(id: string): Promise<Resultat>`, `chercherMedias(recherche: string): Promise<Resultat<Media[]>>`.
  - Route `POST /api/media/upload` (jetons d'envoi Vercel Blob).

- [ ] **Étape 1 : tests des fonctions pures (ils doivent échouer)**

`src/lib/format.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { formatOctets } from "./format";

describe("formatOctets", () => {
  it("affiche des unités françaises", () => {
    expect(formatOctets(512)).toBe("512 o");
    expect(formatOctets(250 * 1024)).toBe("250 Ko");
    expect(formatOctets(1.5 * 1024 * 1024)).toBe("1,5 Mo");
    expect(formatOctets(25 * 1024 * 1024)).toBe("25 Mo");
  });
});
```

`src/lib/validation/media.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { estUrlBlob, schemaNouveauMedia, verifierFichier } from "./media";

const Mo = 1024 * 1024;

describe("verifierFichier", () => {
  it("accepte les formats d'image courants", () => {
    expect(verifierFichier({ name: "photo.jpg", type: "image/jpeg", size: 3 * Mo })).toBeNull();
    expect(verifierFichier({ name: "logo.svg", type: "image/svg+xml", size: 20_000 })).toBeNull();
  });

  it("refuse une photo HEIC d'iPhone avec un message clair", () => {
    expect(verifierFichier({ name: "IMG_0042.HEIC", type: "image/heic", size: 2 * Mo })).toBe(
      "Format non pris en charge (HEIC) : utilisez une image JPEG, PNG, WebP, AVIF ou SVG.",
    );
  });

  it("refuse un PDF", () => {
    expect(verifierFichier({ name: "affiche.pdf", type: "application/pdf", size: Mo })).toBe(
      "Format non pris en charge (PDF) : utilisez une image JPEG, PNG, WebP, AVIF ou SVG.",
    );
  });

  it("refuse un fichier de plus de 10 Mo", () => {
    expect(verifierFichier({ name: "panorama.jpg", type: "image/jpeg", size: 25 * Mo })).toBe(
      "Fichier trop lourd (25 Mo) : 10 Mo maximum.",
    );
  });
});

describe("estUrlBlob", () => {
  it("reconnaît les adresses publiques de Vercel Blob", () => {
    expect(estUrlBlob("https://abc123.public.blob.vercel-storage.com/medias/photo-x1.webp")).toBe(true);
    expect(estUrlBlob("https://exemple.com/photo.webp")).toBe(false);
    expect(estUrlBlob("/actualites/photo.jpg")).toBe(false);
  });
});

describe("schemaNouveauMedia", () => {
  const valide = {
    url: "https://abc123.public.blob.vercel-storage.com/medias/photo-x1.webp",
    pathname: "medias/photo-x1.webp",
    alt: "  Le bureau devant l'ENSMG ",
    credit: "",
    width: 2000,
    height: 1333,
    mime: "image/webp",
    taille: 300_000,
  };

  it("nettoie le texte alternatif et vide le crédit absent", () => {
    expect(schemaNouveauMedia.parse(valide)).toMatchObject({ alt: "Le bureau devant l'ENSMG", credit: null });
  });

  it("exige un texte alternatif et une adresse Blob", () => {
    const r = schemaNouveauMedia.safeParse({ ...valide, alt: "", url: "https://exemple.com/x.webp" });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path[0])).toEqual(expect.arrayContaining(["alt", "url"]));
  });
});
```

`src/lib/admin/preparer-image.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { calculerDimensions, nomDeFichier } from "./preparer-image";

describe("calculerDimensions", () => {
  it("réduit le plus grand côté à 2000 px en gardant les proportions", () => {
    expect(calculerDimensions(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(calculerDimensions(3024, 4032)).toEqual({ width: 1500, height: 2000 });
  });

  it("n'agrandit jamais une petite image", () => {
    expect(calculerDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("nomDeFichier", () => {
  it("produit un nom sans accents ni espaces", () => {
    expect(nomDeFichier("Journée Contenu Local (1).JPG", "webp")).toBe("journee-contenu-local-1.webp");
  });

  it("donne un nom par défaut", () => {
    expect(nomDeFichier("???.png", "webp")).toBe("image.webp");
  });
});
```

Run : `npx vitest run src/lib/format.test.ts src/lib/validation/media.test.ts src/lib/admin/preparer-image.test.ts` — Expected : FAIL (modules introuvables).

- [ ] **Étape 2 : implémenter les fonctions pures**

`src/lib/format.ts` :

```ts
export function formatOctets(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}
```

`src/lib/validation/media.ts` :

```ts
import { z } from "zod";
import { formatOctets } from "@/lib/format";

export const TYPES_IMAGES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/svg+xml"] as const;
export const TAILLE_MAX = 10 * 1024 * 1024;
export const COTE_MAX = 2000;
export const QUALITE_WEBP = 0.82;

export function estUrlBlob(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

// Contrôle fait dans le navigateur avant tout envoi.
export function verifierFichier(f: { name: string; type: string; size: number }): string | null {
  if (!(TYPES_IMAGES as readonly string[]).includes(f.type)) {
    const extension = f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : null;
    return `Format non pris en charge${extension ? ` (${extension})` : ""} : utilisez une image JPEG, PNG, WebP, AVIF ou SVG.`;
  }
  if (f.size > TAILLE_MAX) return `Fichier trop lourd (${formatOctets(f.size)}) : 10 Mo maximum.`;
  return null;
}

const alt = z.string().trim().min(3, "Décrivez l'image en quelques mots (texte alternatif).");
const credit = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null);

export const schemaNouveauMedia = z.object({
  url: z.string().refine(estUrlBlob, "Adresse d'image inattendue."),
  pathname: z.string().min(1),
  alt,
  credit,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  mime: z.enum(TYPES_IMAGES),
  taille: z.number().int().positive().max(TAILLE_MAX),
});

export const schemaMajMedia = z.object({ alt, credit });
```

`src/lib/admin/preparer-image.ts` :

```ts
import { COTE_MAX, QUALITE_WEBP } from "@/lib/validation/media";

export function calculerDimensions(largeur: number, hauteur: number, max = COTE_MAX) {
  const echelle = Math.min(1, max / Math.max(largeur, hauteur));
  return { width: Math.round(largeur * echelle), height: Math.round(hauteur * echelle) };
}

export function nomDeFichier(nom: string, extension: string): string {
  const base = nom
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "image"}.${extension}`;
}

async function dimensionsSvg(fichier: File) {
  const url = URL.createObjectURL(fichier);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    // Un SVG sans largeur ni hauteur déclarées : format paysage par défaut.
    return { width: image.naturalWidth || 800, height: image.naturalHeight || 600 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Dans le navigateur : réduit l'image à 2000 px et la convertit en WebP (les SVG restent tels quels).
export async function preparerImage(fichier: File): Promise<{ fichier: File; width: number; height: number }> {
  if (fichier.type === "image/svg+xml") return { fichier, ...(await dimensionsSvg(fichier)) };
  // createImageBitmap applique l'orientation EXIF des photos de téléphone.
  const bitmap = await createImageBitmap(fichier);
  const { width, height } = calculerDimensions(bitmap.width, bitmap.height);
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/webp", quality: QUALITE_WEBP });
  // Safari ne sait pas encoder en WebP : il renvoie du PNG, qu'on garde tel quel.
  const type = blob.type || "image/png";
  const extension = type === "image/webp" ? "webp" : "png";
  return { fichier: new File([blob], nomDeFichier(fichier.name, extension), { type }), width, height };
}
```

Run : `npx vitest run src/lib/format.test.ts src/lib/validation/media.test.ts src/lib/admin/preparer-image.test.ts` — Expected : PASS. (Si `toLocaleString("fr-FR")` donne un séparateur inattendu dans l'environnement Node, vérifier que Node a l'ICU complète — c'est le cas par défaut depuis Node 13.)

- [ ] **Étape 3 : tests des opérations sur les médias (ils doivent échouer)**

`src/db/operations/media.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { photos } from "@/db/donnees-initiales/photos";
import { seed } from "@/db/seed";
import { creerDbTest } from "@/test/db";
import { ErreurMetier } from "./erreurs";
import { creerMedia, lireMedia, listerMedias, modifierMedia, supprimerMedia, usagesMedia } from "./media";

const nouveau = {
  url: "https://abc123.public.blob.vercel-storage.com/medias/visite-x1.webp",
  pathname: "medias/visite-x1.webp",
  alt: "Visite du chantier de Ndayane",
  credit: "ADEMIG",
  width: 2000,
  height: 1333,
  mime: "image/webp",
  taille: 280_000,
};

describe("médiathèque", () => {
  it("ajoute une image et la place en tête de liste", async () => {
    const db = await creerDbTest();
    await seed(db);
    const m = await creerMedia(db, nouveau, null);
    expect((await listerMedias(db))[0].id).toBe(m.id);
  });

  it("recherche dans le texte alternatif et le crédit, sans tenir compte de la casse", async () => {
    const db = await creerDbTest();
    await creerMedia(db, nouveau, null);
    expect(await listerMedias(db, "NDAYANE")).toHaveLength(1);
    expect(await listerMedias(db, "ademig")).toHaveLength(1);
    expect(await listerMedias(db, "pétrole")).toHaveLength(0);
    // Les caractères spéciaux de LIKE sont pris au pied de la lettre.
    expect(await listerMedias(db, "%")).toHaveLength(0);
  });

  it("modifie le texte alternatif et le crédit", async () => {
    const db = await creerDbTest();
    const m = await creerMedia(db, nouveau, null);
    await modifierMedia(db, m.id, { alt: "Nouvelle description", credit: null });
    expect(await lireMedia(db, m.id)).toMatchObject({ alt: "Nouvelle description", credit: null });
    await expect(modifierMedia(db, crypto.randomUUID(), { alt: "x x x", credit: null })).rejects.toBeInstanceOf(ErreurMetier);
  });

  it("liste les contenus qui utilisent une image", async () => {
    const db = await creerDbTest();
    await seed(db);
    const image = (await listerMedias(db)).find((m) => m.url === photos.journeeOfficiels.src)!;
    const usages = await usagesMedia(db, image.id);
    expect(usages.map((u) => u.lien)).toEqual(
      expect.arrayContaining([
        "/actualites/journee-nationale-contenu-local-2026",
        "/evenements/journee-nationale-contenu-local-2026",
      ]),
    );
    const portrait = (await listerMedias(db)).find((m) => m.url === "/membres/ibrahima-diao.jpg")!;
    expect(await usagesMedia(db, portrait.id)).toEqual([{ libelle: "Fiche de Dr Ibrahima Diao", lien: "/membres/ibrahima-diao" }]);
  });

  it("refuse de supprimer une image utilisée", async () => {
    const db = await creerDbTest();
    await seed(db);
    const portrait = (await listerMedias(db)).find((m) => m.url === "/membres/ibrahima-diao.jpg")!;
    await expect(supprimerMedia(db, portrait.id)).rejects.toThrow("Image utilisée par 1 contenu : retirez-la d'abord.");
  });

  it("supprime une image inutilisée et renvoie son chemin Blob", async () => {
    const db = await creerDbTest();
    const m = await creerMedia(db, nouveau, null);
    expect(await supprimerMedia(db, m.id)).toEqual({ url: nouveau.url, pathname: nouveau.pathname });
    expect(await lireMedia(db, m.id)).toBeUndefined();
  });
});
```

Run : `npx vitest run src/db/operations/media.test.ts` — Expected : FAIL.

- [ ] **Étape 4 : implémenter `src/db/operations/media.ts`**

```ts
import { desc, eq, ilike, or } from "drizzle-orm";
import {
  actualitePhotos,
  actualites,
  evenementPhotos,
  evenements,
  media,
  membres,
  partenaires,
} from "@/db/schema";
import type { Db } from "@/db/types";
import { ErreurMetier } from "./erreurs";

export type Media = typeof media.$inferSelect;
export type NouveauMedia = {
  url: string;
  pathname: string | null;
  alt: string;
  credit: string | null;
  width: number;
  height: number;
  mime: string;
  taille: number | null;
};
export type UsageMedia = { libelle: string; lien: string };

export async function listerMedias(db: Db, recherche = ""): Promise<Media[]> {
  const texte = recherche.trim();
  // Échappe %, _ et \ pour une recherche littérale.
  const motif = `%${texte.replace(/[\\%_]/g, "\\$&")}%`;
  return db
    .select()
    .from(media)
    .where(texte ? or(ilike(media.alt, motif), ilike(media.credit, motif)) : undefined)
    .orderBy(desc(media.creeLe));
}

export async function lireMedia(db: Db, id: string): Promise<Media | undefined> {
  return db.query.media.findFirst({ where: eq(media.id, id) });
}

export async function creerMedia(db: Db, donnees: NouveauMedia, creePar: string | null): Promise<Media> {
  const [ligne] = await db
    .insert(media)
    .values({ ...donnees, creePar })
    .returning();
  return ligne;
}

export async function modifierMedia(db: Db, id: string, donnees: { alt: string; credit: string | null }) {
  const lignes = await db.update(media).set(donnees).where(eq(media.id, id)).returning({ id: media.id });
  if (lignes.length === 0) throw new ErreurMetier("Image introuvable.");
}

export async function usagesMedia(db: Db, id: string): Promise<UsageMedia[]> {
  const [photosActualites, photosEvenements, affiches, portraits, logos] = await Promise.all([
    db
      .select({ titre: actualites.titre, slug: actualites.slug })
      .from(actualitePhotos)
      .innerJoin(actualites, eq(actualites.id, actualitePhotos.actualiteId))
      .where(eq(actualitePhotos.mediaId, id)),
    db
      .select({ titre: evenements.titre, slug: evenements.slug })
      .from(evenementPhotos)
      .innerJoin(evenements, eq(evenements.id, evenementPhotos.evenementId))
      .where(eq(evenementPhotos.mediaId, id)),
    db.select({ titre: evenements.titre, slug: evenements.slug }).from(evenements).where(eq(evenements.afficheId, id)),
    db.select({ nom: membres.nom, slug: membres.slug }).from(membres).where(eq(membres.photoId, id)),
    db.select({ nom: partenaires.nom }).from(partenaires).where(eq(partenaires.logoId, id)),
  ]);
  return [
    ...photosActualites.map((a) => ({ libelle: `Actualité « ${a.titre} »`, lien: `/actualites/${a.slug}` })),
    ...photosEvenements.map((e) => ({ libelle: `Événement « ${e.titre} » (photo)`, lien: `/evenements/${e.slug}` })),
    ...affiches.map((e) => ({ libelle: `Événement « ${e.titre} » (affiche)`, lien: `/evenements/${e.slug}` })),
    ...portraits.map((m) => ({ libelle: `Fiche de ${m.nom}`, lien: `/membres/${m.slug}` })),
    ...logos.map((p) => ({ libelle: `Logo du partenaire ${p.nom}`, lien: "/partenaires" })),
  ];
}

export async function supprimerMedia(db: Db, id: string): Promise<{ url: string; pathname: string | null }> {
  const usages = await usagesMedia(db, id);
  if (usages.length > 0) {
    const n = usages.length;
    throw new ErreurMetier(`Image utilisée par ${n} contenu${n > 1 ? "s" : ""} : retirez-la d'abord.`);
  }
  const [ligne] = await db
    .delete(media)
    .where(eq(media.id, id))
    .returning({ url: media.url, pathname: media.pathname });
  if (!ligne) throw new ErreurMetier("Image introuvable.");
  return ligne;
}
```

Run : `npx vitest run src/db/operations/media.test.ts` — Expected : 6 tests PASS.

- [ ] **Étape 5 : route d'envoi et configuration des images**

Lire `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` (section `remotePatterns`).

`src/app/api/media/upload/route.ts` :

```ts
import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { lireSession } from "@/lib/session";
import { TAILLE_MAX, TYPES_IMAGES } from "@/lib/validation/media";

// Délivre au navigateur un jeton d'envoi direct vers Vercel Blob (contourne la limite de 4,5 Mo des fonctions).
// La ligne `media` est créée ensuite par l'action `enregistrerMedia` : pas de rappel `onUploadCompleted`,
// qui ne fonctionne pas en local.
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const reponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        if (!(await lireSession())) throw new Error("Connexion requise.");
        return {
          allowedContentTypes: [...TYPES_IMAGES],
          maximumSizeInBytes: TAILLE_MAX,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(reponse);
  } catch (erreur) {
    return Response.json({ error: (erreur as Error).message }, { status: 400 });
  }
}
```

`next.config.ts` :

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Images envoyées depuis la médiathèque (Vercel Blob, stockage public).
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" }],
  },
};

export default nextConfig;
```

- [ ] **Étape 6 : Server Actions de la médiathèque**

`src/lib/admin/media.ts` :

```ts
"use server";

import { del } from "@vercel/blob";
import { revalidatePath, revalidateTag } from "next/cache";
import { db } from "@/db";
import { creerMedia, listerMedias, type Media, modifierMedia, supprimerMedia } from "@/db/operations/media";
import { action } from "@/lib/admin/action";
import { erreursDe, type Resultat } from "@/lib/admin/resultat";
import { TAGS } from "@/lib/content/tags";
import { estUrlBlob, schemaMajMedia, schemaNouveauMedia } from "@/lib/validation/media";

// Une image peut apparaître partout sur le site : on invalide tout le contenu public.
function invaliderContenus() {
  for (const tag of Object.values(TAGS)) {
    if (tag !== TAGS.reglages) revalidateTag(tag, { expire: 0 });
  }
}

export async function enregistrerMedia(donnees: unknown): Promise<Resultat<{ id: string }>> {
  return action("editeur", async (session) => {
    const saisie = schemaNouveauMedia.safeParse(donnees);
    if (!saisie.success) {
      // Le fichier est déjà dans Blob : on ne le laisse pas orphelin.
      const url = (donnees as { url?: unknown } | null)?.url;
      if (typeof url === "string" && estUrlBlob(url)) await del(url);
      return erreursDe(saisie.error);
    }
    const media = await creerMedia(db, saisie.data, session.userId);
    revalidatePath("/admin/medias");
    return { ok: true, message: "Image ajoutée.", donnees: { id: media.id } };
  });
}

export async function mettreAJourMedia(id: string, _etat: Resultat | null, donnees: FormData): Promise<Resultat> {
  return action("editeur", async () => {
    const saisie = schemaMajMedia.safeParse(Object.fromEntries(donnees));
    if (!saisie.success) return erreursDe(saisie.error);
    await modifierMedia(db, id, saisie.data);
    invaliderContenus();
    revalidatePath(`/admin/medias/${id}`);
    return { ok: true, message: "Description enregistrée." };
  });
}

export async function supprimerMediaAction(id: string): Promise<Resultat> {
  return action("editeur", async () => {
    const { url, pathname } = await supprimerMedia(db, id);
    // Les fichiers de /public ne sont jamais effacés du disque.
    if (pathname) await del(url);
    invaliderContenus();
    revalidatePath("/admin/medias");
    return { ok: true, message: "Image supprimée." };
  });
}

export async function chercherMedias(recherche: string): Promise<Resultat<Media[]>> {
  return action("editeur", async () => ({ ok: true, donnees: await listerMedias(db, recherche) }));
}
```

- [ ] **Étape 7 : vérifier et commiter**

Run : `npx tsc --noEmit && npm run lint && npm test` — Expected : tout passe.

```bash
git add src/lib src/db/operations src/app/api/media next.config.ts
git commit -m "Médiathèque côté serveur : envoi Blob, règles et usages des images

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 13 : médiathèque côté interface

**Files :**
- Create : `src/components/admin/envoi-images.tsx`, `src/components/admin/selecteur-media.tsx`, `src/app/admin/(espace)/medias/page.tsx`, `src/app/admin/(espace)/medias/[id]/page.tsx`, `src/app/admin/(espace)/medias/[id]/actions-media.tsx`

**Interfaces :**
- Consumes : tout ce que produit la Tâche 12 ; composants admin (Tâche 9) ; `exigerSession` (Tâche 8) ; `absoluteUrl` (`src/lib/site.ts`).
- Produces :
  - `EnvoiImages({ onEnvoye?: (id: string) => void })`.
  - `SelecteurMedia({ libelle, multiple?, valeur: string[], onChange: (ids: string[]) => void })` — utilisé par les formulaires du sous-projet 2.
  - Routes `/admin/medias` et `/admin/medias/[id]`.

- [ ] **Étape 1 : composant d'envoi**

`src/components/admin/envoi-images.tsx` :

```tsx
"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { enregistrerMedia } from "@/lib/admin/media";
import { preparerImage } from "@/lib/admin/preparer-image";
import { TYPES_IMAGES, verifierFichier } from "@/lib/validation/media";
import { Bouton, Champ } from "./ui";

type Element = {
  cle: string;
  fichier: File;
  apercu: string;
  alt: string;
  credit: string;
  etat: "attente" | "envoi" | "erreur";
  erreur?: string;
};

export function EnvoiImages({ onEnvoye }: { onEnvoye?: (id: string) => void }) {
  const router = useRouter();
  const [elements, setElements] = useState<Element[]>([]);
  const [refus, setRefus] = useState<string[]>([]);

  const maj = (cle: string, changement: Partial<Element>) =>
    setElements((liste) => liste.map((e) => (e.cle === cle ? { ...e, ...changement } : e)));

  function retirer(cle: string) {
    setElements((liste) => {
      const element = liste.find((e) => e.cle === cle);
      if (element) URL.revokeObjectURL(element.apercu);
      return liste.filter((e) => e.cle !== cle);
    });
  }

  function choisir(fichiers: FileList | null) {
    const acceptes: Element[] = [];
    const refuses: string[] = [];
    for (const fichier of Array.from(fichiers ?? [])) {
      const erreur = verifierFichier(fichier);
      if (erreur) refuses.push(`${fichier.name} : ${erreur}`);
      else
        acceptes.push({
          cle: crypto.randomUUID(),
          fichier,
          apercu: URL.createObjectURL(fichier),
          alt: "",
          credit: "",
          etat: "attente",
        });
    }
    setRefus(refuses);
    setElements((liste) => [...liste, ...acceptes]);
  }

  async function envoyer(element: Element) {
    if (element.alt.trim().length < 3) {
      return maj(element.cle, { etat: "erreur", erreur: "Décrivez l'image en quelques mots (texte alternatif)." });
    }
    maj(element.cle, { etat: "envoi", erreur: undefined });
    try {
      const prete = await preparerImage(element.fichier);
      const blob = await upload(`medias/${prete.fichier.name}`, prete.fichier, {
        access: "public",
        handleUploadUrl: "/api/media/upload",
        contentType: prete.fichier.type,
      });
      const resultat = await enregistrerMedia({
        url: blob.url,
        pathname: blob.pathname,
        alt: element.alt,
        credit: element.credit,
        width: prete.width,
        height: prete.height,
        mime: prete.fichier.type,
        taille: prete.fichier.size,
      });
      if (!resultat.ok) {
        return maj(element.cle, { etat: "erreur", erreur: resultat.erreurs?.alt?.[0] ?? resultat.message ?? "Envoi refusé." });
      }
      retirer(element.cle);
      if (resultat.donnees) onEnvoye?.(resultat.donnees.id);
      router.refresh();
    } catch {
      maj(element.cle, { etat: "erreur", erreur: "L'envoi a échoué. Vérifiez la connexion puis réessayez." });
    }
  }

  async function toutEnvoyer() {
    for (const element of elements.filter((e) => e.etat !== "envoi")) await envoyer(element);
  }

  return (
    <div className="mt-4 space-y-4">
      <label className="inline-flex min-h-11 cursor-pointer items-center border-[1.5px] border-encre bg-papier px-4 py-2 font-bold hover:bg-sable has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-moutarde">
        Choisir des images
        <input
          type="file"
          multiple
          accept={TYPES_IMAGES.join(",")}
          className="sr-only"
          onChange={(e) => {
            choisir(e.currentTarget.files);
            e.currentTarget.value = "";
          }}
        />
      </label>

      {refus.length > 0 && (
        <ul role="alert" className="space-y-1 border-l-4 border-rouge bg-rouge/10 px-4 py-3 font-bold">
          {refus.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      {elements.length > 0 && (
        <>
          <ul className="space-y-4">
            {elements.map((e) => (
              <li key={e.cle} className="grid gap-4 border-[1.5px] border-encre p-4 sm:grid-cols-[8rem_1fr]">
                {/* Aperçu local (URL blob:), hors du pipeline next/image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.apercu} alt="" className="aspect-square w-32 border border-encre bg-white object-contain" />
                <div className="min-w-0 space-y-3">
                  <p className="truncate font-bold">{e.fichier.name}</p>
                  <Champ
                    id={`alt-${e.cle}`}
                    label="Texte alternatif (obligatoire)"
                    name="alt"
                    aide="Ce que montre l'image, pour les personnes qui ne la voient pas."
                    value={e.alt}
                    onChange={(ev) => maj(e.cle, { alt: ev.target.value })}
                    disabled={e.etat === "envoi"}
                  />
                  <Champ
                    id={`credit-${e.cle}`}
                    label="Crédit photo (facultatif)"
                    name="credit"
                    value={e.credit}
                    onChange={(ev) => maj(e.cle, { credit: ev.target.value })}
                    disabled={e.etat === "envoi"}
                  />
                  {e.erreur && (
                    <p role="alert" className="border-l-4 border-rouge pl-2 font-bold">
                      {e.erreur}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Bouton type="button" disabled={e.etat === "envoi"} onClick={() => envoyer(e)}>
                      {e.etat === "envoi" ? "Envoi…" : e.etat === "erreur" ? "Réessayer" : "Envoyer"}
                    </Bouton>
                    <Bouton type="button" variante="secondaire" disabled={e.etat === "envoi"} onClick={() => retirer(e.cle)}>
                      Retirer
                    </Bouton>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {elements.length > 1 && (
            <Bouton type="button" onClick={toutEnvoyer}>
              Tout envoyer ({elements.length})
            </Bouton>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Étape 2 : page Médiathèque**

`src/app/admin/(espace)/medias/page.tsx` :

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EnvoiImages } from "@/components/admin/envoi-images";
import { Bouton, Champ, EtatVide, TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { listerMedias } from "@/db/operations/media";
import { exigerSession } from "@/lib/session";

export const metadata: Metadata = { title: "Médiathèque" };

export default async function Medias({ searchParams }: PageProps<"/admin/medias">) {
  await exigerSession();
  const { q } = await searchParams;
  const recherche = typeof q === "string" ? q : "";
  const medias = await listerMedias(db, recherche);

  return (
    <>
      <TitrePage>Médiathèque</TitrePage>
      <section aria-labelledby="ajouter" className="border-[1.5px] border-encre p-5 sm:p-6">
        <h2 id="ajouter" className="font-titre text-2xl">
          Ajouter des images
        </h2>
        <p className="mt-1">
          JPEG, PNG, WebP, AVIF ou SVG, 10 Mo maximum. Les photos sont réduites à 2000 px avant l&apos;envoi.
        </p>
        <EnvoiImages />
      </section>

      <form role="search" className="mt-10 flex flex-wrap items-end gap-3">
        <Champ label="Rechercher une image" name="q" type="search" defaultValue={recherche} className="w-full max-w-sm" />
        <Bouton type="submit" variante="secondaire">
          Rechercher
        </Bouton>
      </form>

      {medias.length === 0 ? (
        <div className="mt-6">
          <EtatVide>{recherche ? `Aucune image ne correspond à « ${recherche} ».` : "Aucune image pour le moment."}</EtatVide>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {medias.map((m) => (
            <li key={m.id}>
              <Link
                href={`/admin/medias/${m.id}`}
                className="block border-[1.5px] border-encre bg-white hover:bg-sable focus-visible:outline-3 focus-visible:outline-moutarde"
              >
                <span className="flex aspect-square items-center justify-center overflow-hidden p-2">
                  <Image
                    src={m.url}
                    alt=""
                    width={m.width}
                    height={m.height}
                    sizes="(min-width: 1280px) 18vw, (min-width: 640px) 30vw, 45vw"
                    unoptimized={m.mime === "image/svg+xml"}
                    className="max-h-full w-auto object-contain"
                  />
                </span>
                <span className="block truncate border-t border-encre px-2 py-1.5 text-sm">{m.alt}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
```

- [ ] **Étape 3 : page de détail**

`src/app/admin/(espace)/medias/[id]/actions-media.tsx` :

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { BoutonConfirmation } from "@/components/admin/confirmation";
import { Alerte, Bouton, Champ } from "@/components/admin/ui";
import { mettreAJourMedia, supprimerMediaAction } from "@/lib/admin/media";
import type { Resultat } from "@/lib/admin/resultat";

export function FormulaireMedia({ id, alt, credit }: { id: string; alt: string; credit: string }) {
  const [resultat, envoyer, enCours] = useActionState(mettreAJourMedia.bind(null, id), null);
  const erreurs = resultat && !resultat.ok ? resultat.erreurs : undefined;
  return (
    <form action={envoyer} className="space-y-5">
      <Alerte resultat={resultat} />
      <Champ
        label="Texte alternatif"
        name="alt"
        defaultValue={alt}
        aide="Ce que montre l'image, pour les personnes qui ne la voient pas."
        erreurs={erreurs?.alt}
        required
      />
      <Champ label="Crédit photo" name="credit" defaultValue={credit} erreurs={erreurs?.credit} />
      <Bouton type="submit" disabled={enCours}>
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </Bouton>
    </form>
  );
}

export function CopierUrl({ url }: { url: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <div>
      <Bouton
        type="button"
        variante="secondaire"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopie(true);
        }}
      >
        Copier l&apos;adresse de l&apos;image
      </Bouton>
      <p role="status" className="mt-1 text-sm">
        {copie ? "Adresse copiée." : ""}
      </p>
    </div>
  );
}

export function ZoneSuppression({ id, bloquee }: { id: string; bloquee: boolean }) {
  const router = useRouter();
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [enCours, demarrer] = useTransition();
  return (
    <div className="space-y-3">
      <Alerte resultat={resultat} />
      <BoutonConfirmation
        libelle="Supprimer l'image"
        question="Supprimer définitivement cette image ?"
        confirmer="Supprimer"
        disabled={bloquee || enCours}
        onConfirmer={() =>
          demarrer(async () => {
            const r = await supprimerMediaAction(id);
            if (r.ok) router.push("/admin/medias");
            else setResultat(r);
          })
        }
      />
      {bloquee && <p className="text-sm">Retirez d&apos;abord l&apos;image des contenus qui l&apos;utilisent.</p>}
    </div>
  );
}
```

`src/app/admin/(espace)/medias/[id]/page.tsx` :

```tsx
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { TitrePage } from "@/components/admin/ui";
import { db } from "@/db";
import { lireMedia, usagesMedia } from "@/db/operations/media";
import { formatOctets } from "@/lib/format";
import { exigerSession } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";
import { CopierUrl, FormulaireMedia, ZoneSuppression } from "./actions-media";

export const metadata: Metadata = { title: "Image" };

export default async function DetailMedia({ params }: PageProps<"/admin/medias/[id]">) {
  await exigerSession();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const media = await lireMedia(db, id);
  if (!media) notFound();
  const usages = await usagesMedia(db, id);

  return (
    <>
      <p className="mb-4">
        <Link href="/admin/medias" className="underline underline-offset-4">
          ← Médiathèque
        </Link>
      </p>
      <TitrePage>Image</TitrePage>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <figure className="border-[1.5px] border-encre bg-white p-3">
          <Image
            src={media.url}
            alt={media.alt}
            width={media.width}
            height={media.height}
            sizes="(min-width: 1024px) 60vw, 92vw"
            unoptimized={media.mime === "image/svg+xml"}
            className="mx-auto h-auto max-h-[70vh] w-auto"
          />
        </figure>
        <div className="space-y-8">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt className="font-bold">Dimensions</dt>
            <dd>
              {media.width} × {media.height} px
            </dd>
            <dt className="font-bold">Poids</dt>
            <dd>{media.taille ? formatOctets(media.taille) : "inconnu"}</dd>
            <dt className="font-bold">Format</dt>
            <dd>{media.mime}</dd>
            <dt className="font-bold">Ajoutée le</dt>
            <dd>{media.creeLe.toLocaleDateString("fr-FR")}</dd>
          </dl>
          <CopierUrl url={absoluteUrl(media.url)} />
          <FormulaireMedia id={media.id} alt={media.alt} credit={media.credit ?? ""} />
          <section aria-labelledby="usages">
            <h2 id="usages" className="font-titre text-2xl">
              Utilisée par
            </h2>
            {usages.length > 0 ? (
              <ul className="mt-2 list-disc pl-5">
                {usages.map((u) => (
                  <li key={u.libelle}>
                    <Link href={u.lien} target="_blank" className="underline underline-offset-4">
                      {u.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2">Aucun contenu n&apos;utilise cette image.</p>
            )}
          </section>
          <ZoneSuppression id={media.id} bloquee={usages.length > 0} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Étape 4 : sélecteur réutilisable**

`src/components/admin/selecteur-media.tsx` :

```tsx
"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import type { Media } from "@/db/operations/media";
import { chercherMedias } from "@/lib/admin/media";
import { EnvoiImages } from "./envoi-images";
import { Bouton, Champ } from "./ui";

// Choix d'une ou plusieurs images de la médiathèque, avec envoi possible sans quitter le formulaire.
export function SelecteurMedia({
  libelle,
  multiple = false,
  valeur,
  onChange,
}: {
  libelle: string;
  multiple?: boolean;
  valeur: string[];
  onChange: (ids: string[]) => void;
}) {
  const dialogue = useRef<HTMLDialogElement>(null);
  const [medias, setMedias] = useState<Media[]>([]);
  const [recherche, setRecherche] = useState("");
  const [choix, setChoix] = useState<string[]>(valeur);
  const [chargement, demarrer] = useTransition();

  const charger = (texte: string) =>
    demarrer(async () => {
      const r = await chercherMedias(texte);
      if (r.ok && r.donnees) setMedias(r.donnees);
    });

  const basculer = (id: string) =>
    setChoix((c) => (multiple ? (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]) : [id]));

  function ouvrir() {
    setChoix(valeur);
    charger(recherche);
    dialogue.current?.showModal();
  }

  return (
    <>
      <Bouton type="button" variante="secondaire" onClick={ouvrir}>
        {libelle}
        {valeur.length > 0 && ` (${valeur.length})`}
      </Bouton>
      <dialog
        ref={dialogue}
        aria-label={libelle}
        className="m-auto h-[min(48rem,calc(100%-2rem))] w-[min(64rem,calc(100%-2rem))] border-[1.5px] border-encre bg-papier p-0 text-encre backdrop:bg-encre/50"
      >
        <div className="flex h-full flex-col">
          <div className="flex flex-wrap items-end gap-3 border-b-[1.5px] border-encre p-4">
            <Champ
              label="Rechercher"
              name="recherche-media"
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  charger(recherche);
                }
              }}
              className="min-w-0 flex-1"
            />
            <Bouton type="button" variante="secondaire" onClick={() => charger(recherche)}>
              Rechercher
            </Bouton>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <details className="mb-6">
              <summary className="cursor-pointer font-bold">Envoyer de nouvelles images</summary>
              <EnvoiImages
                onEnvoye={(id) => {
                  basculer(id);
                  charger(recherche);
                }}
              />
            </details>
            {chargement && <p role="status">Chargement…</p>}
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {medias.map((m) => {
                const choisi = choix.includes(m.id);
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      aria-pressed={choisi}
                      onClick={() => basculer(m.id)}
                      className={`block w-full border-[1.5px] bg-white text-left focus-visible:outline-3 focus-visible:outline-moutarde ${choisi ? "border-brun outline-3 outline-brun" : "border-encre"}`}
                    >
                      <span className="flex aspect-square items-center justify-center p-1">
                        <Image
                          src={m.url}
                          alt=""
                          width={m.width}
                          height={m.height}
                          sizes="200px"
                          unoptimized={m.mime === "image/svg+xml"}
                          className="max-h-full w-auto object-contain"
                        />
                      </span>
                      <span className="block truncate border-t border-encre px-2 py-1 text-sm">{m.alt}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex justify-end gap-3 border-t-[1.5px] border-encre p-4">
            <Bouton type="button" variante="secondaire" onClick={() => dialogue.current?.close()}>
              Annuler
            </Bouton>
            <Bouton
              type="button"
              onClick={() => {
                onChange(choix);
                dialogue.current?.close();
              }}
            >
              Valider{choix.length > 0 && ` (${choix.length})`}
            </Bouton>
          </div>
        </div>
      </dialog>
    </>
  );
}
```

- [ ] **Étape 5 : vérifier**

Run : `npx tsc --noEmit && npm run lint && npm test && npm run build` — Expected : tout passe.

Vérification manuelle (`npm run dev`, connecté, `BLOB_READ_WRITE_TOKEN` présent dans `.env.local`) :
1. `/admin/medias` : les images du seed s'affichent ; rechercher « portrait » → les portraits du bureau.
2. Choisir un fichier HEIC ou PDF → message de refus, rien n'est envoyé.
3. Choisir deux photos de téléphone (> 3 Mo) ; cliquer « Envoyer » sans texte alternatif → message sur la vignette ; remplir les textes, « Tout envoyer » → elles apparaissent en tête de grille ; dans le détail, largeur ou hauteur = 2000 px, format `image/webp` (ou `image/png` sous Safari), poids de quelques centaines de Ko.
4. Détail d'une image du seed (`/membres/ibrahima-diao.jpg`) : « Utilisée par : Fiche de Dr Ibrahima Diao », bouton de suppression grisé.
5. Modifier le texte alternatif d'une photo d'actualité → « Description enregistrée. » ; ouvrir la page publique de l'actualité, inspecter l'image : le nouvel `alt` est servi (vérifie l'invalidation du cache) ; remettre le texte d'origine.
6. Supprimer une image envoyée à l'étape 3 → retour à la grille, l'image a disparu (et n'existe plus dans le store Blob, onglet Storage de Vercel).
7. Sélecteur : créer temporairement `src/app/admin/(espace)/essai-selecteur/page.tsx` qui affiche un composant client utilisant `<SelecteurMedia libelle="Choisir des photos" multiple valeur={ids} onChange={setIds} />` et la liste `ids` ; vérifier choix multiple, recherche, envoi depuis le sélecteur (l'image envoyée est cochée), « Annuler » ne change rien. **Supprimer ce fichier** avant le commit.
8. À 360 px : grille sur deux colonnes, sélecteur utilisable, aucun défilement horizontal.

- [ ] **Étape 6 : commit**

```bash
git status   # vérifier que essai-selecteur n'apparaît pas
git add src/components/admin "src/app/admin/(espace)/medias"
git commit -m "Médiathèque : envoi, recherche, détail, suppression et sélecteur d'images

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 14 : tests de bout en bout (Playwright)

Les tests tournent contre `npm run dev` et la base Neon `dev` de `.env.local`. Ils créent leurs propres comptes (`*@ademig.test`) et suppriment ce qu'ils ajoutent.

**Files :**
- Create : `playwright.config.ts`, `e2e/comptes.ts`, `e2e/preparation.ts`, `e2e/admin.spec.ts`
- Modify : `.gitignore` (résultats Playwright)

**Interfaces :**
- Consumes : `creerCompteAvecMotDePasse` (Tâche 7), `db` (Tâche 1), toutes les pages des Tâches 9 à 13.
- Produces : commande `npm run test:e2e`.

- [ ] **Étape 1 : configuration**

Run : `npx playwright install chromium`

`playwright.config.ts` :

```ts
import { defineConfig } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/preparation.ts",
  // Les tests partagent la même base : on les enchaîne.
  workers: 1,
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
```

Ajouter à `.gitignore` :

```
/test-results
/playwright-report
```

`e2e/comptes.ts` :

```ts
export const MOT_DE_PASSE = "MotDePasse-E2E-2026";

export const COMPTES = {
  superadmin: { email: "e2e-superadmin@ademig.test", nom: "E2E Super-admin", role: "superadmin" },
  editeur: { email: "e2e-editeur@ademig.test", nom: "E2E Éditeur", role: "editeur" },
  inactif: { email: "e2e-inactif@ademig.test", nom: "E2E Inactif", role: "editeur" },
  aDesactiver: { email: "e2e-a-desactiver@ademig.test", nom: "E2E À désactiver", role: "editeur" },
} as const;
```

`e2e/preparation.ts` :

```ts
import { eq, like } from "drizzle-orm";
import { db } from "../src/db";
import { creerCompteAvecMotDePasse } from "../src/db/operations/comptes";
import { user } from "../src/db/schema";
import { COMPTES, MOT_DE_PASSE } from "./comptes";

// Repart de comptes de test neufs à chaque lancement (la cascade supprime sessions et mots de passe).
export default async function preparation() {
  await db.delete(user).where(like(user.email, "%@ademig.test"));
  for (const compte of Object.values(COMPTES)) {
    await creerCompteAvecMotDePasse(db, { ...compte, motDePasse: MOT_DE_PASSE });
  }
  await db.update(user).set({ actif: false }).where(eq(user.email, COMPTES.inactif.email));
}
```

- [ ] **Étape 2 : écrire les parcours**

`e2e/admin.spec.ts` :

```ts
import { type Page, expect, test } from "@playwright/test";
import { COMPTES, MOT_DE_PASSE } from "./comptes";

async function seConnecter(page: Page, email: string, motDePasse = MOT_DE_PASSE) {
  await page.goto("/admin/connexion");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

test("sans session, l'admin renvoie vers la connexion", async ({ page }) => {
  await page.goto("/admin/comptes");
  await expect(page).toHaveURL(/\/admin\/connexion$/);
});

test("un super-admin se connecte puis se déconnecte", async ({ page }) => {
  await seConnecter(page, COMPTES.superadmin.email);
  await expect(page.getByRole("heading", { name: `Bonjour ${COMPTES.superadmin.nom}` })).toBeVisible();
  await expect(page.getByRole("link", { name: "Comptes" })).toBeVisible();
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion$/);
});

test("l'email est reconnu malgré les majuscules et les espaces", async ({ page }) => {
  await seConnecter(page, `  ${COMPTES.editeur.email.toUpperCase()} `);
  await expect(page.getByRole("heading", { name: `Bonjour ${COMPTES.editeur.nom}` })).toBeVisible();
});

test("un mauvais mot de passe est refusé", async ({ page }) => {
  await seConnecter(page, COMPTES.superadmin.email, "pas-le-bon-mot-de-passe");
  await expect(page.getByRole("alert")).toHaveText("Email ou mot de passe incorrect.");
});

test("un compte désactivé ne peut pas se connecter", async ({ page }) => {
  await seConnecter(page, COMPTES.inactif.email);
  await expect(page.getByRole("alert")).toHaveText("Ce compte est désactivé. Contactez un super-admin.");
});

test("un éditeur n'accède pas à la gestion des comptes", async ({ page }) => {
  await seConnecter(page, COMPTES.editeur.email);
  await expect(page.getByRole("heading", { name: /Bonjour/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Comptes" })).toHaveCount(0);
  await page.goto("/admin/comptes");
  await expect(page.getByRole("heading", { name: "Accès refusé" })).toBeVisible();
});

test("désactiver un compte coupe sa session ouverte", async ({ browser }) => {
  const contexteEditeur = await browser.newContext();
  const editeur = await contexteEditeur.newPage();
  await seConnecter(editeur, COMPTES.aDesactiver.email);
  await expect(editeur.getByRole("heading", { name: /Bonjour/ })).toBeVisible();

  const contexteAdmin = await browser.newContext();
  const admin = await contexteAdmin.newPage();
  await seConnecter(admin, COMPTES.superadmin.email);
  await admin.goto("/admin/comptes");
  const ligne = admin.getByRole("listitem").filter({ hasText: COMPTES.aDesactiver.email });
  await ligne.getByRole("button", { name: "Désactiver" }).click();
  await admin.getByRole("dialog").getByRole("button", { name: "Désactiver" }).click();
  await expect(ligne.getByText("Désactivé", { exact: true })).toBeVisible();

  await editeur.reload();
  await expect(editeur).toHaveURL(/\/admin\/connexion$/);

  await contexteEditeur.close();
  await contexteAdmin.close();
});

test("un lien de réinitialisation expiré est expliqué", async ({ page }) => {
  await page.goto("/admin/reinitialiser?error=INVALID_TOKEN");
  await expect(page.getByText("Ce lien n'est plus valable")).toBeVisible();
  await expect(page.getByRole("link", { name: "Demander un nouveau lien" })).toBeVisible();
});

test("la médiathèque reçoit, décrit et supprime une image", async ({ page }) => {
  const alt = `Image de test e2e ${Date.now()}`;
  await seConnecter(page, COMPTES.editeur.email);
  await page.goto("/admin/medias");

  await page.getByLabel("Choisir des images").setInputFiles("public/actualites/session-codes-2025.jpg");
  await page.getByLabel("Texte alternatif (obligatoire)").fill(alt);
  await page.getByRole("button", { name: "Envoyer", exact: true }).click();
  const vignette = page.getByRole("link", { name: alt });
  await expect(vignette).toBeVisible({ timeout: 30_000 });

  await vignette.click();
  await page.getByLabel("Texte alternatif").fill(`${alt} (modifié)`);
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Description enregistrée." })).toBeVisible();

  await page.getByRole("button", { name: "Supprimer l'image" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page).toHaveURL(/\/admin\/medias$/);
  await expect(page.getByRole("link", { name: `${alt} (modifié)` })).toHaveCount(0);
});

test("un fichier non pris en charge est refusé avant l'envoi", async ({ page }) => {
  await seConnecter(page, COMPTES.editeur.email);
  await page.goto("/admin/medias");
  await page.getByLabel("Choisir des images").setInputFiles({
    name: "IMG_0042.HEIC",
    mimeType: "image/heic",
    buffer: Buffer.from("faux contenu"),
  });
  await expect(page.getByRole("alert")).toContainText("Format non pris en charge (HEIC)");
});
```

- [ ] **Étape 3 : lancer**

Run : `npm run test:e2e`
Expected : 10 tests PASS. En cas d'échec, ouvrir la trace (`npx playwright show-trace test-results/…/trace.zip`) et corriger le code de l'application, pas l'attente du test, sauf si le libellé testé diffère volontairement du libellé affiché (dans ce cas, aligner le test sur le libellé de l'interface).

- [ ] **Étape 4 : commit**

```bash
git add playwright.config.ts e2e .gitignore
git commit -m "Tests de bout en bout de l'admin : connexion, droits, comptes, médiathèque

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tâche 15 : vérification finale et documentation

**Files :**
- Modify : `README.md`, `docs/superpowers/specs/2026-10-08-back-office-fondations-design.md` (statut)

**Interfaces :**
- Consumes : tout le reste.
- Produces : documentation d'installation et d'exploitation du back office.

- [ ] **Étape 1 : documentation**

Ajouter à `README.md` une section :

````markdown
## Administration (back office)

Le contenu du site est en base Postgres (Neon) et se gère sur `/admin`.

### Installation locale

1. `vercel link` puis `vercel env pull .env.local` ; dans `.env.local`, pointer `DATABASE_URL` sur la branche Neon `dev` et ajouter `BETTER_AUTH_URL=http://localhost:3000` (voir `.env.example`).
2. `npm run db:migrate` puis `npm run db:seed` (le seed n'écrase jamais une donnée existante).
3. `npm run admin:creer -- --email vous@exemple.sn --nom "Prénom Nom"` : crée un super-admin et affiche un mot de passe temporaire, à changer dans « Mon compte ».
4. `npm run dev`, puis http://localhost:3000/admin.

### Commandes

| Commande | Rôle |
|---|---|
| `npm run db:generate` | Génère une migration après une modification de `src/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations à la base de `DATABASE_URL` |
| `npm run db:seed` | Importe le contenu initial (`src/db/donnees-initiales/`) |
| `npm run admin:creer` | Crée un super-admin |
| `npm test` | Tests unitaires et d'intégration (PGlite, sans réseau) |
| `npm run test:e2e` | Tests de bout en bout (base `dev`, `npm run dev`) |

### Mise en production

Avant le premier déploiement : appliquer les migrations et le seed sur la branche Neon `main` (`DATABASE_URL` de production), créer le premier super-admin, vérifier un domaine dans Resend et renseigner `EMAIL_EXPEDITEUR`.
````

- [ ] **Étape 2 : vérification complète**

Run : `npx tsc --noEmit && npm run lint && npm test && npm run build && npm run test:e2e`
Expected : tout passe.

Vérifier la spec point par point (`docs/superpowers/specs/2026-10-08-back-office-fondations-design.md`, section 1 « Critères de réussite ») et noter dans la réponse finale tout écart.

Contrôle de non-régression visuelle : avec `npm run build && npm run start`, parcourir les pages publiques listées à l'étape 8 de la Tâche 6 et comparer avec le site avant le chantier (`git stash` n'est pas utile ; utiliser `git worktree add ../ademig-avant 972c1df`, `npm install` et `npm run dev -- -p 3001` dans ce dossier pour comparer côte à côte, puis supprimer le worktree).

- [ ] **Étape 3 : statut de la spec et commit**

Dans la spec, remplacer `Statut : en revue` par `Statut : implémenté`.

```bash
git add README.md docs/superpowers/specs/2026-10-08-back-office-fondations-design.md
git commit -m "Documentation du back office

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
