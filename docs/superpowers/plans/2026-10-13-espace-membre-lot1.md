# Espace membre — Lot 1 (comptes et profil) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** donner un compte aux ~500 membres, importés d'un CSV et invités par Gmail, avec un espace membre (profil, mot de passe, annuaire privé).

**Architecture :** on étend l'existant. Better Auth reçoit deux nouveaux rôles. La table `membres` gagne un lien vers `user` et quelques colonnes privées. Deux tables s'ajoutent : `invitations` (jetons hachés valables 30 jours) et `emails_file` (file d'envoi vidée par un cron Vercel quotidien). Les nouvelles routes sont `/connexion`, `/espace-membre/*` et `/admin/membres/importer`. Toute la logique métier vit dans des fonctions pures ou des opérations Drizzle testées sur PGlite ; les pages et Server Actions restent minces.

**Tech Stack :** Next.js 16.3 (App Router, Server Actions, `proxy.ts`), Drizzle 0.45 + Neon, Better Auth 1.7, Zod 4, Vercel Blob (envoi client), nodemailer (Gmail SMTP), Vitest 5 + PGlite, Playwright.

**Spec :** `docs/superpowers/specs/2026-10-13-espace-membre-design.md` (sections 3, 4, 7, 8, 9 ; lot 1 de la section 10).

## Global Constraints

- Tout le code, les commentaires, les commits et les textes d'interface sont en **français**, comme le reste du dépôt.
- Lire `AGENTS.md` : cette version de Next diffère de la mémoire du modèle. Consulter `node_modules/next/dist/docs/` avant d'utiliser une API Next.
- **La base Neon est partagée entre dev, e2e et prod.** Les migrations sont additives uniquement (`npm run db:generate` puis `npm run db:migrate`). Pas de seed destructeur. Les données de test sont préfixées `e2e-` ou `E2E `, ou ont un email en `@ademig.test`, et `e2e/nettoyage.ts` les supprime.
- **Le dépôt est public :** aucun secret dans le code. Les nouvelles variables (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `EMAILS_PAR_JOUR`, `CRON_SECRET`) sont ajoutées sans valeur dans `.env.example`. Ne jamais commiter `docs/*.docx` ni `docs/*.pptx`.
- Patterns à réutiliser :
  - `action(role, fn)` (src/lib/admin/action.ts) ;
  - `lireFormulaire`, `erreursDe`, `resultatDErreur` (src/lib/admin/resultat.ts) ;
  - `ErreurMetier` (src/db/operations/erreurs.ts) ;
  - `creerDbTest()` (src/test/db.ts) ;
  - `normaliserEmail` (src/db/operations/comptes.ts) ;
  - `hashPassword` de `better-auth/crypto` ;
  - les composants `Champ`, `Bouton`, `Alerte` de src/components/admin/ui.tsx ;
  - `Cadre`, `Etiquette` et les composants du site pour l'espace membre.
- Le site est consulté surtout sur mobile : chaque écran de l'espace membre est conçu pour 390 px d'abord.
- Les jetons d'invitation durent **30 jours**. Ils sont générés par `crypto.randomBytes(32)` en base64url et seul leur hash SHA-256 est stocké.
- La file d'envoi traite au maximum `EMAILS_PAR_JOUR` emails (150 par défaut), avec une pause d'une seconde entre deux, et 3 tentatives au maximum par email. *(Revue finale : une panne du service — identifiants, réseau, quota — arrête le passage sans compter de tentative ; seule une erreur propre au destinataire en compte une. Sans service configuré, le cron répond 503. Une invitation est mise en file sans jeton ni contenu : le cron la construit à l'envoi.)*
- Présentation : 500 caractères maximum. LinkedIn : uniquement `https://(www.)linkedin.com/in/<identifiant>`. Photo : 5 Mo maximum, JPEG, PNG ou WebP. Mot de passe : 12 caractères minimum.
- Le téléphone, l'email de contact et le statut de cotisation ne sont **jamais** affichés dans l'annuaire, ni public ni privé.
- `/connexion`, `/espace-membre/*` et `/verifier/*` sont en `noindex` et absents du sitemap.
- Chaque commit se termine par la ligne `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**Écart à la spec, décidé ici :** la spec (§3.2) prévoyait un enum `visibilite`. Pour ne pas réécrire la quinzaine de fichiers qui lisent `membres.visible`, on garde `visible` (= fiche publique sur le site) et on ajoute `annuaire boolean default true` (= fiche dans l'annuaire privé). Le membre voit trois choix, que `versVisibilite` et `depuisVisibilite` (tâche 3) convertissent en deux colonnes :

| Choix | visible | annuaire |
|---|---|---|
| `publique` | true | true |
| `membres` | false | true |
| `masquee` | false | false |

La spec est mise à jour dans la tâche 1.

## Review Focus

1. **Excel en français** exporte en `;`, en Windows-1252 et avec un BOM. Un CSV avec BOM et `;` doit être lu correctement. Un fichier qui n'est pas en UTF-8 (présence de `�` après décodage) doit être refusé avec le message « Enregistrez le fichier en CSV UTF-8 », et ne jamais produire des noms corrompus. Test : tâche 3.
2. **Email déjà présent** (compte admin existant, ou fiche du bureau existante sans compte) : l'import ne crée pas de doublon. Une fiche existante est rattachée, un compte existant est seulement lié à la fiche, et un compte admin garde son rôle. Test : tâche 4.
3. **Lien d'invitation ouvert deux fois, ou après un « Renvoyer »** : le jeton est refusé avec un message clair et ne crée jamais un second mot de passe. Test : tâche 6.
4. **Un membre qui ouvre `/admin`**, ou un compte admin sans fiche qui ouvre `/espace-membre` : le premier est redirigé vers `/espace-membre` sans voir l'admin, le second voit un message explicite au lieu d'une erreur 500. Test : tâche 7.
5. **Une Server Action de profil appelée avec l'identifiant d'une autre fiche** : l'identifiant envoyé est ignoré et seule la fiche de la session est modifiée. Test : tâche 9.

---

## Structure des fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/roles.ts` (modifié) | Rôles `tresorier` et `membre`, `ROLES_ADMIN`, `estRoleAdmin` |
| `src/db/schema.ts` (modifié) | Colonnes de `membres`, tables `invitations` et `emails_file` |
| `src/db/migrations/0002_espace_membre.sql` (généré) | Migration additive |
| `src/lib/membres/visibilite.ts` | Conversion des trois choix en deux booléens |
| `src/lib/membres/import-csv.ts` | Analyse pure du CSV (séparateur, BOM, validation, doublons) |
| `src/db/operations/import-membres.ts` | Classement par rapport à la base et écriture en une transaction |
| `src/lib/membres/jetons.ts` | Génération et hachage des jetons |
| `src/db/operations/invitations.ts` | Créer, renouveler, vérifier et consommer une invitation (activation) |
| `src/lib/emails.ts` (modifié) | `envoyerEmail` (Gmail ou Resend), gabarit de l'invitation membre |
| `src/db/operations/emails-file.ts` | Mettre en file, vider la file (quota, tentatives) |
| `src/app/api/cron/quotidien/route.ts` | Cron protégé par `CRON_SECRET` |
| `vercel.json` (modifié) | Déclaration du cron |
| `src/lib/session.ts` (modifié) | `exigerAdmin`, `exigerMembre` |
| `src/proxy.ts`, `src/lib/admin/routes.ts` (modifiés) | Protection de `/espace-membre` |
| `src/app/(site)/connexion/*` | Connexion publique des membres |
| `src/app/(membre)/espace-membre/*` | Accueil, profil, mot de passe, annuaire, activation |
| `src/lib/membres/profil.ts` | Validation du profil (Zod) |
| `src/db/operations/profil.ts` | Lire et modifier la fiche de la session |
| `src/db/requetes/annuaire.ts` | Annuaire privé paginé |
| `src/app/admin/(espace)/membres/importer/*` | Écran d'import en deux temps |
| `src/lib/admin/invitations.ts` | Server Actions : renvoyer, copier le lien, désactiver |
| `e2e/espace-membre.spec.ts` | Parcours activation → profil → annuaire |

---

### Task 1 : rôles, schéma et migration

**Files:**
- Modify: `src/lib/roles.ts`, `src/lib/roles.test.ts`, `src/db/schema.ts`, `src/db/schema.test.ts`, `src/lib/admin/comptes.ts` / `src/lib/validation/comptes.ts` (liste des rôles proposés), `src/db/operations/comptes.ts` (`listerComptes` exclut le rôle `membre`), `docs/superpowers/specs/2026-10-13-espace-membre-design.md` (§3.2 : écart `visible` + `annuaire`)
- Create: `src/db/migrations/0002_espace_membre.sql` (via drizzle-kit)

**Interfaces:**
- Produces :
  - `ROLES = ["superadmin","editeur","tresorier","membre"]` ;
  - `ROLES_ADMIN = ["superadmin","editeur","tresorier"] as const` ;
  - `estRoleAdmin(role: Role): boolean` ;
  - colonnes Drizzle `membres.userId`, `membres.emailContact`, `membres.telephone`, `membres.annuaire`, `membres.activeLe`, `membres.numeroMembre` ;
  - tables `invitations` et `emailsFile` (noms TS) ;
  - `listerComptes` ne renvoie que les rôles admin.

- [ ] **Step 1 : tests des rôles qui échouent.** Dans `src/lib/roles.test.ts`, ajouter :

```ts
import { aLeRole, estRoleAdmin } from "./roles";

describe("nouveaux rôles", () => {
  it("le trésorier et le membre n'ont pas les droits de l'éditeur", () => {
    expect(aLeRole("tresorier", "editeur")).toBe(false);
    expect(aLeRole("membre", "editeur")).toBe(false);
    expect(aLeRole("tresorier", "tresorier")).toBe(true);
    expect(aLeRole("superadmin", "tresorier")).toBe(true);
  });
  it("seul le membre n'a pas accès à l'admin", () => {
    expect(estRoleAdmin("membre")).toBe(false);
    expect(["superadmin", "editeur", "tresorier"].every((r) => estRoleAdmin(r as never))).toBe(true);
  });
});
```

Run : `npx vitest run src/lib/roles.test.ts`. Résultat attendu : ÉCHEC (`estRoleAdmin` n'existe pas).

- [ ] **Step 2 : implémentation des rôles.**

```ts
export const ROLES = ["superadmin", "editeur", "tresorier", "membre"] as const;
export type Role = (typeof ROLES)[number];
export const ROLES_ADMIN = ["superadmin", "editeur", "tresorier"] as const satisfies readonly Role[];

export const LIBELLES_ROLES: Record<Role, string> = {
  superadmin: "Super-admin",
  editeur: "Éditeur",
  tresorier: "Trésorier",
  membre: "Membre",
};

// Le super-admin a tous les droits ; les autres rôles n'ont que le leur.
export function aLeRole(role: Role, requis: Role): boolean {
  return role === "superadmin" || role === requis;
}

export function estRoleAdmin(role: Role): boolean {
  return (ROLES_ADMIN as readonly Role[]).includes(role);
}
```

Dans `src/lib/validation/comptes.ts`, le schéma du rôle d'un compte d'administration (`schemaRole`, `schemaInvitation`) n'accepte que `ROLES_ADMIN`. Le rôle `membre` ne se donne que par l'import. Dans `listerComptes`, ajouter `where: (u, { ne }) => ne(u.role, "membre")`. Run : `npx vitest run src/lib`. Résultat attendu : SUCCÈS (adapter les tests de comptes qui énumèrent les rôles).

- [ ] **Step 3 : schéma.** Dans `src/db/schema.ts`, ajouter à la table `membres` (après `visible`) :

```ts
  // Fiche listée dans l'annuaire privé des membres connectés (indépendant de `visible` = site public).
  annuaire: boolean("annuaire").default(true).notNull(),
  // Compte de connexion rattaché (au plus un), données privées jamais affichées publiquement.
  userId: text("user_id").unique().references(() => user.id, { onDelete: "set null" }),
  emailContact: text("email_contact"),
  telephone: text("telephone"),
  // Date d'activation du compte : départ des cotisations (lot 2).
  activeLe: timestamp("active_le", { withTimezone: true }),
  numeroMembre: integer("numero_membre").unique(),
```

Puis, à la suite :

```ts
export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    jetonHash: text("jeton_hash").notNull().unique(),
    expireLe: timestamp("expire_le", { withTimezone: true }).notNull(),
    utiliseeLe: timestamp("utilisee_le", { withTimezone: true }),
    creeLe: timestamp("cree_le", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("invitations_user").on(t.userId)],
);

export const emailsFile = pgTable(
  "emails_file",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    destinataire: text("destinataire").notNull(),
    sujet: text("sujet").notNull(),
    html: text("html").notNull(),
    type: text("type").$type<"invitation" | "rappel" | "systeme">().notNull(),
    // Invitation concernée : permet d'afficher le statut d'envoi dans l'admin.
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    statut: text("statut").$type<"a_envoyer" | "envoye" | "echec">().default("a_envoyer").notNull(),
    tentatives: integer("tentatives").default(0).notNull(),
    erreur: text("erreur"),
    envoyeLe: timestamp("envoye_le", { withTimezone: true }),
    creeLe: timestamp("cree_le", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("emails_file_statut").on(t.statut, t.creeLe)],
);
```

Importer `index` si nécessaire. Ajouter les relations Drizzle `membres.compte` (one → user) et `user.membre` dans le bloc des relations existant. Le schéma contient une séquence pour `numero_membre` : on calcule plutôt `max(numero_membre) + 1` sous verrou à l'activation (tâche 6).

- [ ] **Step 4 : test du schéma.** Dans `src/db/schema.test.ts`, ajouter un test qui, sur `creerDbTest()`, insère une fiche avec `annuaire` par défaut et vérifie `annuaire === true` et `userId === null`. Il insère aussi deux fiches avec le même `userId` et attend l'échec de la seconde (`23505`).

- [ ] **Step 5 : migration.** Run : `npm run db:generate -- --name espace_membre`. Relire le SQL : il ne doit contenir que des `ALTER TABLE … ADD COLUMN`, `CREATE TABLE` et `CREATE INDEX`, sans `DROP`. Puis `npx vitest run src/db`. Résultat attendu : SUCCÈS. Enfin `npm run db:migrate`, qui l'applique à Neon.

- [ ] **Step 6 : mise à jour de la spec et commit.** Dans la spec §3.2, remplacer le paragraphe `visibilite` par la règle `visible` + `annuaire` et le tableau de conversion de ce plan.

```bash
git add -A src/lib/roles.ts src/lib/roles.test.ts src/lib/validation/comptes.ts src/lib/admin/comptes.ts src/db docs/superpowers/specs/2026-10-13-espace-membre-design.md
git commit -m "Rôles trésorier et membre ; fiches rattachées à un compte, invitations et file d'emails en base"
```

---

### Task 2 : jetons et visibilité (fonctions pures)

**Files:**
- Create: `src/lib/membres/jetons.ts`, `src/lib/membres/jetons.test.ts`, `src/lib/membres/visibilite.ts`, `src/lib/membres/visibilite.test.ts`

**Interfaces:**
- Produces :
  - `nouveauJeton(): { jeton: string; hash: string }` ;
  - `hacherJeton(jeton: string): string` ;
  - `type Visibilite = "publique" | "membres" | "masquee"` ;
  - `versVisibilite({ visible, annuaire }): Visibilite` ;
  - `depuisVisibilite(v): { visible: boolean; annuaire: boolean }` ;
  - `LIBELLES_VISIBILITE: Record<Visibilite, { titre: string; aide: string }>`.

- [ ] **Step 1 : tests.**

```ts
// jetons.test.ts
import { hacherJeton, nouveauJeton } from "./jetons";
it("le hash correspond au jeton et le jeton est imprévisible", () => {
  const a = nouveauJeton();
  const b = nouveauJeton();
  expect(a.jeton).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(a.jeton).not.toBe(b.jeton);
  expect(hacherJeton(a.jeton)).toBe(a.hash);
  expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
});

// visibilite.test.ts
import { depuisVisibilite, versVisibilite } from "./visibilite";
it.each([
  ["publique", { visible: true, annuaire: true }],
  ["membres", { visible: false, annuaire: true }],
  ["masquee", { visible: false, annuaire: false }],
] as const)("%s ⇄ colonnes", (v, cols) => {
  expect(depuisVisibilite(v)).toEqual(cols);
  expect(versVisibilite(cols)).toBe(v);
});
it("une fiche publique hors annuaire reste publique", () => {
  expect(versVisibilite({ visible: true, annuaire: false })).toBe("publique");
});
```

Run : `npx vitest run src/lib/membres`. Résultat attendu : ÉCHEC (modules absents).

- [ ] **Step 2 : implémentation.**

```ts
// jetons.ts
import { createHash, randomBytes } from "node:crypto";

export function hacherJeton(jeton: string): string {
  return createHash("sha256").update(jeton).digest("hex");
}

// Le jeton en clair ne quitte le serveur que dans l'email ou le lien copié ; la base n'en garde que le hash.
export function nouveauJeton(): { jeton: string; hash: string } {
  const jeton = randomBytes(32).toString("base64url");
  return { jeton, hash: hacherJeton(jeton) };
}
```

```ts
// visibilite.ts
export const VISIBILITES = ["publique", "membres", "masquee"] as const;
export type Visibilite = (typeof VISIBILITES)[number];

export const LIBELLES_VISIBILITE: Record<Visibilite, { titre: string; aide: string }> = {
  publique: { titre: "Publique", aide: "Votre fiche apparaît sur le site, visible de tous, et dans l'annuaire des membres." },
  membres: { titre: "Membres seulement", aide: "Seuls les membres connectés voient votre fiche, dans l'annuaire." },
  masquee: { titre: "Masquée", aide: "Personne ne voit votre fiche, à part le bureau." },
};

export function versVisibilite(c: { visible: boolean; annuaire: boolean }): Visibilite {
  if (c.visible) return "publique";
  return c.annuaire ? "membres" : "masquee";
}

export function depuisVisibilite(v: Visibilite): { visible: boolean; annuaire: boolean } {
  return { visible: v === "publique", annuaire: v !== "masquee" };
}
```

Run : `npx vitest run src/lib/membres`. Résultat attendu : SUCCÈS.

- [ ] **Step 3 : commit.** `git add src/lib/membres && git commit -m "Jetons d'invitation hachés ; visibilité d'une fiche en trois choix"`

---

### Task 3 : analyse du CSV (pure)

**Files:**
- Create: `src/lib/membres/import-csv.ts`, `src/lib/membres/import-csv.test.ts`, `public/modele-import-membres.csv`

**Interfaces:**
- Produces :

```ts
export type LigneImport = { ligne: number; nom: string; prenom: string; email: string; telephone: string | null; promotion: number | null; specialite: string | null };
export type ProblemeImport = { ligne: number; message: string };
export type AnalyseCsv = { valides: LigneImport[]; problemes: ProblemeImport[] };
export function analyserCsv(texte: string): AnalyseCsv; // lève ErreurMetier si en-têtes ou encodage invalides
export const COLONNES_IMPORT = ["nom", "prenom", "email", "telephone", "promotion", "specialite"] as const;
```

- [ ] **Step 1 : tests qui échouent.**

```ts
import { describe, expect, it } from "vitest";
import { ErreurMetier } from "@/db/operations/erreurs";
import { analyserCsv } from "./import-csv";

describe("analyserCsv", () => {
  it("lit le format Excel français (BOM, point-virgule, guillemets, CRLF)", () => {
    const csv = "﻿Nom;Prénom;Email;Téléphone;Promotion;Spécialité\r\nNdiaye;Awa;AWA@Example.org ;77 123 45 67;2015;\"Mines; carrières\"\r\n";
    expect(analyserCsv(csv)).toEqual({
      valides: [{ ligne: 2, nom: "Ndiaye", prenom: "Awa", email: "awa@example.org", telephone: "77 123 45 67", promotion: 2015, specialite: "Mines; carrières" }],
      problemes: [],
    });
  });
  it("accepte la virgule et des colonnes facultatives absentes", () => {
    const r = analyserCsv("nom,prenom,email\nSow,Ali,ali@ex.org\n");
    expect(r.valides[0]).toMatchObject({ nom: "Sow", telephone: null, promotion: null, specialite: null });
  });
  it("signale email invalide, champ manquant, promotion absurde et doublon dans le fichier", () => {
    const csv = "nom;prenom;email;promotion\nA;B;pas-un-email;\n;C;c@ex.org;\nD;E;d@ex.org;1850\nF;G;f@ex.org;\nH;I;F@EX.ORG;\n";
    const r = analyserCsv(csv);
    expect(r.valides.map((l) => l.email)).toEqual(["f@ex.org"]);
    expect(r.problemes).toEqual([
      { ligne: 2, message: "Email invalide : « pas-un-email »." },
      { ligne: 3, message: "Nom manquant." },
      { ligne: 4, message: "Promotion invalide : « 1850 »." },
      { ligne: 6, message: "Email en double dans le fichier (déjà ligne 5)." },
    ]);
  });
  it("ignore les lignes vides", () => {
    expect(analyserCsv("nom;prenom;email\n\n;;\nA;B;a@ex.org\n").valides).toHaveLength(1);
  });
  it("refuse un fichier sans les colonnes obligatoires", () => {
    expect(() => analyserCsv("name;mail\nA;a@ex.org")).toThrow(ErreurMetier);
  });
  it("refuse un fichier mal décodé (pas en UTF-8)", () => {
    expect(() => analyserCsv("nom;prenom;email\nNd�aye;A;a@ex.org")).toThrow(/CSV UTF-8/);
  });
  it("refuse plus de 2000 lignes", () => {
    const csv = "nom;prenom;email\n" + Array.from({ length: 2001 }, (_, i) => `N${i};P;m${i}@ex.org`).join("\n");
    expect(() => analyserCsv(csv)).toThrow(/2000/);
  });
});
```

Run : `npx vitest run src/lib/membres/import-csv.test.ts`. Résultat attendu : ÉCHEC.

- [ ] **Step 2 : implémentation.** Un petit lecteur CSV conforme à la RFC 4180, sans dépendance :
  - guillemets doublés `""` ;
  - séparateur à l'intérieur de guillemets ;
  - CRLF et LF.

  Le séparateur est celui des deux (`;` ou `,`) qui apparaît le plus souvent dans la ligne d'en-tête, hors guillemets.

  Les en-têtes sont normalisés en minuscules, sans accents (`normalize("NFD").replace(/\p{Diacritic}/gu, "")`), sans espaces, avec ces alias :
  - `mail` → `email` ;
  - `prénom` → `prenom` ;
  - `tel` et `telephone` → `telephone` ;
  - `promo` → `promotion` ;
  - `specialite` reste tel quel.

  Validation et messages :
  - email : `z.email()` après `normaliserEmail`. En cas d'échec : `` `Email invalide : « ${brut} ».` `` ;
  - nom et prénom obligatoires après trim : `"Nom manquant."` et `"Prénom manquant."` ;
  - promotion : entier entre 1960 et l'année en cours + 1, ou vide (→ null). Sinon : `` `Promotion invalide : « ${brut} ».` `` ;
  - doublon : `` `Email en double dans le fichier (déjà ligne ${n}).` `` ;
  - une ligne dont toutes les cellules sont vides est ignorée ;
  - le numéro de ligne est celui du fichier (en-tête = ligne 1).

  Erreurs bloquantes (`ErreurMetier`) :
  - `"Colonnes obligatoires manquantes : nom, prenom, email. Téléchargez le modèle."` ;
  - `"Le fichier contient des caractères illisibles : enregistrez-le en « CSV UTF-8 » depuis Excel."` si `�` est présent ;
  - `"Fichier trop long : 2000 lignes au maximum."`.

  Créer `public/modele-import-membres.csv` :

```
nom;prenom;email;telephone;promotion;specialite
Ndiaye;Awa;awa.ndiaye@example.org;77 000 00 00;2015;Mines
```

Run : `npx vitest run src/lib/membres/import-csv.test.ts`. Résultat attendu : SUCCÈS.

- [ ] **Step 3 : commit.** `git commit -m "Lecture du CSV des membres : format Excel français, validations et doublons"`

---

### Task 4 : import en base (classement et écriture)

**Files:**
- Create: `src/db/operations/import-membres.ts`, `src/db/operations/import-membres.test.ts`

**Interfaces:**
- Consumes : `LigneImport` (tâche 3), `normaliserEmail`, `slugifier` (src/lib/admin/slug.ts ; vérifier le nom exact exporté). Les invitations ne sont pas créées ici : `executerImport` renvoie `aInviter`, et la Server Action de la tâche 11 appelle `inviterParEmail`.
- Produces :

```ts
export type StatutLigne = "nouveau" | "rattacher_fiche" | "lier_compte" | "deja_membre";
export type LigneClassee = LigneImport & { statut: StatutLigne; ficheId: string | null; userId: string | null };
export async function classerImport(db: Db, lignes: LigneImport[]): Promise<LigneClassee[]>;
export async function executerImport(db: Db, lignes: LigneImport[]): Promise<{ crees: number; rattaches: number; ignores: number; aInviter: string[] }>; // aInviter = userIds sans mot de passe
```

Règles de classement (comparaison d'emails sans tenir compte de la casse) :
- `deja_membre` : un `user` existe avec cet email **et** une fiche lui est déjà rattachée. On l'ignore.
- `lier_compte` : un `user` existe (par exemple un admin) mais aucune fiche ne lui est rattachée. On rattache une fiche existante si une fiche sans compte porte le même `nom` (comparé sans accents ni casse, prénom + nom), sinon on crée une fiche. **Le rôle ne change jamais.**
- `rattacher_fiche` : aucun `user`, mais une fiche sans compte a le même `emailContact` ou le même nom complet normalisé (cas des 11 fiches du bureau). On crée un `user` de rôle `membre` et on le rattache à cette fiche.
- `nouveau` : on crée la fiche et le `user`.

Une fiche créée par l'import reçoit :
- `nom = "${prenom} ${nom}"` ;
- un `slug` unique : `slugifier(nom complet)`, suffixé `-2`, `-3`… si le slug est pris ;
- `titre: "Ingénieur"` ;
- `specialite: ligne.specialite ?? ""`, `promotion`, `telephone`, `emailContact: email` ;
- `resume: ""` ;
- `visible: false`, `annuaire: true`.

Un `user` créé par l'import a `role: "membre"`, `actif: false` et `emailVerified: true`.

- [ ] **Step 1 : tests sur PGlite.**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { creerDbTest } from "@/test/db";
import * as t from "@/db/schema";
import { classerImport, executerImport } from "./import-membres";
import type { Db } from "@/db/types";

const ligne = (n: number, prenom: string, nom: string, email: string) => ({ ligne: n, prenom, nom, email, telephone: null, promotion: 2010, specialite: "Géologie" });

describe("import des membres", () => {
  let db: Db;
  beforeEach(async () => { db = await creerDbTest(); });

  it("crée fiche + compte membre inactif pour un nouvel email", async () => {
    const r = await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(r).toMatchObject({ crees: 1, rattaches: 0, ignores: 0 });
    const u = await db.query.user.findFirst({ where: eq(t.user.email, "awa@ex.org") });
    expect(u).toMatchObject({ role: "membre", actif: false });
    const f = await db.query.membres.findFirst({ where: eq(t.membres.userId, u!.id) });
    expect(f).toMatchObject({ nom: "Awa Ndiaye", visible: false, annuaire: true, emailContact: "awa@ex.org", promotion: 2010 });
    expect(r.aInviter).toEqual([u!.id]);
  });

  it("rattache une fiche existante du même nom (bureau) sans la dupliquer", async () => {
    await db.insert(t.membres).values({ slug: "awa-ndiaye", nom: "Awa NDIAYE", titre: "Dr", specialite: "Mines", resume: "r", visible: true });
    const [classee] = await classerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(classee.statut).toBe("rattacher_fiche");
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    const fiches = await db.select().from(t.membres);
    expect(fiches).toHaveLength(1);
    expect(fiches[0]).toMatchObject({ visible: true, titre: "Dr" }); // la fiche publique garde ses réglages
    expect(fiches[0].userId).not.toBeNull();
  });

  it("lie un compte admin existant (avec mot de passe) sans changer son rôle ni l'inviter", async () => {
    await db.insert(t.user).values({ id: "u1", name: "Admin", email: "admin@ex.org", role: "editeur", emailVerified: true });
    await db.insert(t.account).values({ id: "a1", accountId: "u1", providerId: "credential", userId: "u1", password: "x" });
    const r = await executerImport(db, [ligne(2, "Ali", "Sow", "ADMIN@ex.org")]);
    expect((await db.query.user.findFirst({ where: eq(t.user.id, "u1") }))!.role).toBe("editeur");
    expect(await db.query.membres.findFirst({ where: eq(t.membres.userId, "u1") })).toBeDefined();
    expect(r.aInviter).toEqual([]);
  });

  it("invite un compte existant qui n'a pas encore de mot de passe", async () => {
    await db.insert(t.user).values({ id: "u2", name: "Invité", email: "inv@ex.org", role: "editeur", emailVerified: true });
    const r = await executerImport(db, [ligne(2, "Ali", "Sow", "inv@ex.org")]);
    expect(r.aInviter).toEqual(["u2"]);
  });

  it("ignore un email déjà membre, et un second import ne crée rien", async () => {
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    const r = await executerImport(db, [ligne(2, "Awa", "Ndiaye", "awa@ex.org")]);
    expect(r).toMatchObject({ crees: 0, ignores: 1 });
    expect(await db.$count(t.membres)).toBe(1);
  });

  it("donne un slug unique à deux homonymes", async () => {
    await executerImport(db, [ligne(2, "Awa", "Ndiaye", "a1@ex.org"), ligne(3, "Awa", "Ndiaye", "a2@ex.org")]);
    const slugs = (await db.select({ s: t.membres.slug }).from(t.membres)).map((r) => r.s).sort();
    expect(slugs).toEqual(["awa-ndiaye", "awa-ndiaye-2"]);
  });
});
```

`aInviter` contient les `userId` des lignes traitées qui n'ont pas de compte `credential`.

Deux homonymes sans fiche existante créent deux fiches. Si une fiche sans compte du même nom existe, seule la **première** ligne la rattache.

Run : `npx vitest run src/db/operations/import-membres.test.ts`. Résultat attendu : ÉCHEC.

- [ ] **Step 2 : implémentation.** `executerImport` s'exécute dans `db.transaction` :
  1. recalcule le classement à l'intérieur de la transaction, pour éviter une course entre l'aperçu et la confirmation ;
  2. traite les lignes une à une ;
  3. calcule `aInviter` par une requête sur `account` (`providerId = "credential"`).

  Fonction de normalisation du nom :

  ```ts
  const cle = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
  ```

  Run : `npx vitest run src/db/operations/import-membres.test.ts`. Résultat attendu : SUCCÈS.

- [ ] **Step 3 : commit.** `git commit -m "Import des membres : rattachement aux fiches et comptes existants, slugs uniques, en une transaction"`

---

### Task 5 : envoi des emails (Gmail ou Resend) et file d'envoi

**Files:**
- Modify: `src/lib/emails.ts`, `src/lib/emails.test.ts`, `package.json` (`npm i nodemailer` et `npm i -D @types/nodemailer`), `.env.example`
- Create: `src/db/operations/emails-file.ts`, `src/db/operations/emails-file.test.ts`

**Interfaces:**
- Produces :

```ts
// src/lib/emails.ts
export type Email = { a: string; sujet: string; html: string };
export function emailsConfigures(): boolean; // vrai si Gmail OU Resend configuré (ou dev)
export async function envoyerEmail(e: Email): Promise<void>; // lève en cas d'échec
export function contenuInvitationMembre(p: { prenomNom: string; url: string }): { sujet: string; html: string };
// src/db/operations/emails-file.ts
export async function mettreEnFile(db: Db, e: { destinataire: string; sujet: string; html: string; type: "invitation" | "rappel" | "systeme"; userId?: string }): Promise<void>;
export async function viderFile(db: Db, o: { max: number; envoyer: (e: Email) => Promise<void>; pauseMs: number }): Promise<{ envoyes: number; echecs: number; restants: number }>;
```

- [ ] **Step 1 : tests de `viderFile`** (PGlite, `envoyer` simulé) :
  - quatre emails en file et `max: 3` → 3 envoyés, `restants: 1`, et les trois plus anciens passent en `envoye` avec `envoyeLe` renseigné ;
  - `envoyer` lève `new Error("SMTP 550")` → `tentatives: 1`, l'email reste `a_envoyer`, `erreur: "SMTP 550"`. À la 3ᵉ erreur, il passe en `echec` et n'est plus repris ;
  - un email `echec` ou `envoye` n'est jamais renvoyé ;
  - `pauseMs: 0` dans les tests.

  Tests de `contenuInvitationMembre` :
  - le HTML contient l'URL échappée et le nom échappé (`<script>` → `&lt;script&gt;`) ;
  - le sujet est « Votre espace membre ADEMIG » ;
  - le texte mentionne « valable 30 jours ».

  Run : `npx vitest run src/db/operations/emails-file.test.ts src/lib/emails.test.ts`. Résultat attendu : ÉCHEC.

- [ ] **Step 2 : implémentation.**

```ts
// src/lib/emails.ts (extraits à ajouter ; garder contenuEmailMotDePasse et envoyerEmailMotDePasse, qui délègue désormais à envoyerEmail)
import nodemailer from "nodemailer";

const gmailConfigure = () => Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
const resendConfigure = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_EXPEDITEUR);

export function emailsConfigures(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  return gmailConfigure() || resendConfigure();
}

let transport: nodemailer.Transporter | null = null;

export async function envoyerEmail({ a, sujet, html }: Email): Promise<void> {
  if (process.env.NODE_ENV === "development" && !gmailConfigure() && !resendConfigure()) {
    console.info(`[email de développement] à ${a} — ${sujet}\n${html}`);
    return;
  }
  if (gmailConfigure()) {
    transport ??= nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    });
    await transport.sendMail({ from: `ADEMIG <${process.env.GMAIL_USER}>`, to: a, subject: sujet, html });
    return;
  }
  if (!resendConfigure()) throw new Error("Aucun service d'email configuré (GMAIL_USER/GMAIL_APP_PASSWORD ou RESEND_API_KEY).");
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.EMAIL_EXPEDITEUR!, to: a, subject: sujet, html });
  if (error) throw new Error(error.message);
}
```

`contenuInvitationMembre` reprend le gabarit HTML de `contenuEmailMotDePasse` avec le fond papier, mais la couleur du bouton passe au marine `#16415D`. Texte :
- « Bonjour {prénom nom}, »
- « L'ADEMIG ouvre son espace membre : mettez à jour votre profil, retrouvez les autres ingénieurs de l'amicale et, bientôt, réglez votre cotisation en ligne. »
- bouton « Activer mon compte » ;
- « Ce lien est valable 30 jours et ne sert qu'une fois. » ;
- l'adresse en clair ;
- « Si ce message est arrivé dans vos spams, marquez-le comme « non spam » pour recevoir les prochains. »

`viderFile` :
1. sélectionne les `a_envoyer` par `creeLe` croissant, avec `limit(max)` ;
2. pour chacun, en séquence :
   - appelle `envoyer` dans un `try`. En cas de succès : `statut = "envoye"` et `envoyeLe = now()`. En cas d'erreur : `tentatives + 1`, `erreur = message` (tronqué à 500 caractères), et `statut = "echec"` si `tentatives` atteint 3 *(revue finale : sauf panne du service, qui arrête le passage sans compter de tentative)* ;
   - attend `pauseMs` (`await new Promise((r) => setTimeout(r, pauseMs))`) entre deux envois ;
3. calcule `restants` = nombre de `a_envoyer` après le traitement.

Ajouter dans `.env.example`, sans valeur : `GMAIL_USER=`, `GMAIL_APP_PASSWORD=`, `EMAILS_PAR_JOUR=150`, `CRON_SECRET=`. Créer le fichier s'il n'existe pas, en listant aussi les variables existantes lues dans le code (`grep -rho "process.env.[A-Z_]*" src | sort -u`).

Run : les tests de l'étape 1. Résultat attendu : SUCCÈS.

- [ ] **Step 3 : commit.** `git commit -m "Emails par Gmail (mot de passe d'application) ou Resend ; file d'envoi avec quota et tentatives"`

---

### Task 6 : invitations, activation et cron

**Files:**
- Create: `src/db/operations/invitations.ts`, `src/db/operations/invitations.test.ts`, `src/app/api/cron/quotidien/route.ts`, `src/lib/membres/url.ts`
- Modify: `vercel.json`

**Interfaces:**
- Consumes : `nouveauJeton`, `hacherJeton`, `mettreEnFile`, `viderFile`, `envoyerEmail`, `contenuInvitationMembre`, `hashPassword` (`better-auth/crypto`).
- Produces :

```ts
export const DUREE_INVITATION_JOURS = 30;
export async function creerInvitation(db: Db, userId: string, maintenant?: Date): Promise<{ jeton: string }>; // invalide les invitations non utilisées précédentes
export async function inviterParEmail(db: Db, userId: string, urlActivation: (jeton: string) => string): Promise<void>; // crée l'invitation + met en file
export type EtatJeton = { ok: true; userId: string; email: string; nom: string } | { ok: false; raison: "inconnu" | "expire" | "utilise" };
export async function verifierJeton(db: Db, jeton: string, maintenant?: Date): Promise<EtatJeton>;
export async function activerCompte(db: Db, jeton: string, motDePasse: string, maintenant?: Date): Promise<{ email: string }>; // ErreurMetier si jeton invalide
export type SuiviInvitation = { userId: string; statut: "a_inviter" | "en_file" | "invite" | "echec" | "active"; le: Date | null; erreur: string | null };
export async function suiviInvitations(db: Db, userIds: string[]): Promise<Map<string, SuiviInvitation>>;
// src/lib/membres/url.ts
export function urlSite(): string; // BETTER_AUTH_URL, sinon VERCEL_PROJECT_PRODUCTION_URL en https, sinon http://localhost:3000 (même logique que src/lib/auth.ts : extraire-la ici et l'importer dans auth.ts)
export const urlActivation = (jeton: string) => `${urlSite()}/espace-membre/activer?jeton=${jeton}`;
```

- [ ] **Step 1 : tests (PGlite).**
  - `creerInvitation` puis `verifierJeton(jeton)` → `ok: true`.
  - Un second `creerInvitation` rend le premier jeton `inconnu` : les invitations non utilisées précédentes sont supprimées.
  - `verifierJeton` avec `maintenant` = création + 31 jours → `expire`.
  - `activerCompte(jeton, "motdepasse-solide")` :
    - crée un `account` `credential` dont le `password` est vérifiable par `verifyPassword` de `better-auth/crypto` ;
    - passe `user.actif` à `true` ;
    - renseigne `membres.activeLe` ;
    - attribue `numeroMembre = 1`, puis `2` pour un second membre ;
    - marque l'invitation comme utilisée.
  - **Un second `activerCompte` avec le même jeton** lève `ErreurMetier("Ce lien a déjà servi : connectez-vous ou demandez un nouveau lien.")` et ne crée pas de second `account` (Review Focus n° 3).
  - Un mot de passe de moins de 12 caractères lève `ErreurMetier` avec le champ `motDePasse`.
  - Un compte qui a déjà un `credential` (admin) : `activerCompte` met à jour son mot de passe au lieu d'insérer un second `account`.
  - `inviterParEmail` met en file un email de type `invitation` dont le HTML contient l'URL d'activation.
  - `suiviInvitations` :
    - `a_inviter` s'il n'y a ni invitation ni email ;
    - `en_file` si l'email est `a_envoyer` ;
    - `invite` (avec `envoyeLe`) ;
    - `echec` (avec l'erreur) ;
    - `active` si un `credential` existe et que `actif` est vrai.

  Run : `npx vitest run src/db/operations/invitations.test.ts`. Résultat attendu : ÉCHEC.

- [ ] **Step 2 : implémentation de `activerCompte`**, en une transaction :

```ts
return db.transaction(async (tx) => {
  const inv = await tx.query.invitations.findFirst({ where: eq(invitations.jetonHash, hacherJeton(jeton)) });
  if (!inv) throw new ErreurMetier("Ce lien n'est plus valable : demandez-en un nouveau au bureau.");
  if (inv.utiliseeLe) throw new ErreurMetier("Ce lien a déjà servi : connectez-vous ou demandez un nouveau lien.");
  if (inv.expireLe < maintenant) throw new ErreurMetier("Ce lien a expiré : demandez-en un nouveau au bureau.");
  if (motDePasse.length < 12) throw new ErreurMetier("12 caractères au minimum.", "motDePasse");
  // Verrou : deux clics simultanés ne consomment pas deux fois le jeton.
  const [pris] = await tx.update(invitations).set({ utiliseeLe: maintenant })
    .where(and(eq(invitations.id, inv.id), isNull(invitations.utiliseeLe))).returning({ id: invitations.id });
  if (!pris) throw new ErreurMetier("Ce lien a déjà servi : connectez-vous ou demandez un nouveau lien.");
  const hash = await hashPassword(motDePasse);
  const existant = await tx.query.account.findFirst({ where: and(eq(account.userId, inv.userId), eq(account.providerId, "credential")) });
  if (existant) await tx.update(account).set({ password: hash }).where(eq(account.id, existant.id));
  else await tx.insert(account).values({ id: crypto.randomUUID(), accountId: inv.userId, providerId: "credential", userId: inv.userId, password: hash });
  const [u] = await tx.update(user).set({ actif: true }).where(eq(user.id, inv.userId)).returning({ email: user.email });
  // Numéro de membre séquentiel ; verrou de table pour deux activations simultanées.
  await tx.execute(sql`lock table ${membres} in share row exclusive mode`);
  const fiche = await tx.query.membres.findFirst({ where: eq(membres.userId, inv.userId), columns: { id: true, activeLe: true, numeroMembre: true } });
  if (fiche && !fiche.activeLe) {
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${membres.numeroMembre}), 0)` }).from(membres);
    await tx.update(membres).set({ activeLe: maintenant, numeroMembre: fiche.numeroMembre ?? Number(max) + 1 }).where(eq(membres.id, fiche.id));
  }
  return { email: u.email };
});
```

Vérifier dans `node_modules/better-auth` la colonne `password` de la table `account` (déjà utilisée par `creerCompteAvecMotDePasse`) et réutiliser exactement la même forme d'insertion.

- [ ] **Step 3 : cron.**

```ts
// src/app/api/cron/quotidien/route.ts
import { db } from "@/db";
import { viderFile } from "@/db/operations/emails-file";
import { envoyerEmail } from "@/lib/emails";

export const maxDuration = 300;

// Appelé une fois par jour par Vercel Cron (vercel.json). Vercel envoie `Authorization: Bearer <CRON_SECRET>`.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Non autorisé", { status: 401 });
  const max = Number(process.env.EMAILS_PAR_JOUR) || 150;
  const emails = await viderFile(db, { max, envoyer: envoyerEmail, pauseMs: 1000 });
  return Response.json({ emails });
}
```

Dans `vercel.json` :

```json
{
  "regions": ["fra1"],
  "crons": [{ "path": "/api/cron/quotidien", "schedule": "0 8 * * *" }]
}
```

Ajouter un test de la route (`route.test.ts`) qui vérifie la réponse 401 sans en-tête, puis avec un mauvais secret. Le cas valide est simulé avec `vi.mock("@/db/operations/emails-file")`.

Run : `npx vitest run src/db/operations/invitations.test.ts src/app/api/cron`. Résultat attendu : SUCCÈS.

- [ ] **Step 4 : commit.** `git commit -m "Invitations de 30 jours, activation du compte et numéro de membre ; cron quotidien d'envoi des emails"`

---

### Task 7 : sessions, proxy et garde des espaces

**Files:**
- Modify: `src/lib/session.ts`, `src/app/admin/(espace)/layout.tsx`, `src/lib/admin/routes.ts` (+ test), `src/proxy.ts`, `src/app/admin/(auth)/connexion/page.tsx`, `src/components/admin/coquille.tsx` (navigation selon le rôle)
- Create: `src/lib/session.test.ts` si absent (tester la logique pure `destinationApresConnexion`)

**Interfaces:**
- Produces :

```ts
export type SessionMembre = SessionAdmin & { membreId: string };
export async function exigerAdmin(): Promise<SessionAdmin>;   // redirige un membre vers /espace-membre
export async function exigerMembre(): Promise<SessionMembre | { sansFiche: true; session: SessionAdmin }>; // redirige vers /connexion sans session
export function destinationApresConnexion(role: Role): "/admin" | "/espace-membre";
export function estRouteMembrePublique(chemin: string): boolean; // /espace-membre/activer
```

- [ ] **Step 1 : tests.**
  - `destinationApresConnexion("membre") === "/espace-membre"`, `destinationApresConnexion("editeur") === "/admin"`, `destinationApresConnexion("tresorier") === "/admin"`.
  - `estRouteMembrePublique("/espace-membre/activer")` est vrai, `estRouteMembrePublique("/espace-membre/profil")` est faux.

  Run et attendre l'ÉCHEC.

- [ ] **Step 2 : implémentation.**
  - `exigerSession()` garde son comportement (redirection vers `/admin/connexion`).
  - `exigerAdmin()` appelle `exigerSession()`, puis `if (!estRoleAdmin(s.role)) redirect("/espace-membre")`. Le layout `src/app/admin/(espace)/layout.tsx` appelle `exigerAdmin()` au lieu de `exigerSession()`.
  - `action()` est déjà protégé : `aLeRole("membre", "editeur")` est faux.
  - La route `api/media/upload` est modifiée à la tâche 9.
  - `exigerMembre()` : `lireSession()`. Sans session : `redirect("/connexion")`. Ensuite, recherche de la fiche avec `where userId = session.userId`. Sans fiche : `{ sansFiche: true, session }`.
  - Proxy : `matcher: ["/admin/:path*", "/espace-membre/:path*"]`. Pour `/espace-membre`, sans cookie, redirection vers `/connexion?retour=<chemin>`, sauf pour une route membre publique.
  - Page `/admin/connexion` : si une session existe, `redirect(destinationApresConnexion(role))`.
  - `CoquilleAdmin` :
    - le rôle `tresorier` ne voit que « Tableau de bord » et « Mon compte » (la trésorerie arrive au lot 3) ;
    - tout compte rattaché à une fiche voit un lien « Mon espace membre ». Passer `aUneFiche` depuis le layout.

  Run : `npx vitest run`, `npx tsc --noEmit`. Résultat attendu : SUCCÈS.

- [ ] **Step 3 : commit.** `git commit -m "Espaces séparés : un membre est renvoyé vers son espace, l'admin réservé aux rôles d'administration"`

---

### Task 8 : connexion publique et activation (pages)

**Files:**
- Create :
  - `src/app/(site)/connexion/page.tsx`, `src/app/(site)/connexion/formulaire.tsx` ;
  - `src/app/(membre)/layout.tsx` (coquille de l'espace membre au design du site, `robots: { index: false }`) ;
  - `src/app/(membre)/espace-membre/activer/page.tsx`, `.../activer/formulaire.tsx` ;
  - `src/lib/membres/actions-activation.ts` (Server Action `activer`).
- Modify: `src/app/sitemap.ts` (rien à ajouter, vérifier l'absence), `src/app/robots.ts` (`disallow: ["/admin", "/espace-membre", "/connexion"]`), `src/components/site-header.tsx` (lien « Espace membre » discret dans le menu)

**Interfaces:**
- Consumes : `verifierJeton`, `activerCompte`, `destinationApresConnexion`, `exigerMembre`.

- [ ] **Step 1 : connexion `/connexion`.**
  - Formulaire client identique à `FormulaireConnexion` (email, mot de passe, `authClient.signIn.email`), mais avec les composants du site : `Cadre`, titre Lilita, boutons marine. Le formulaire est commun aux deux pages, avec une prop `variante: "site" | "admin"` : extraire la logique dans `src/components/connexion.tsx`.
  - Après succès : `router.push(retour ?? destinationApresConnexion(role))`. Le rôle est lu dans la réponse de `signIn.email` (`data.user.role`). `retour` n'est accepté que s'il commence par `/espace-membre`, contre les redirections ouvertes.
  - Lien « Mot de passe oublié ? » vers `/admin/mot-de-passe-oublie`. Mettre à jour la redirection de `requestPasswordReset` pour qu'elle mène à `/admin/reinitialiser`, puis à `destinationApresConnexion`.
  - Texte d'introduction : « Espace réservé aux membres de l'ADEMIG. Vous n'avez pas encore de compte ? Le bureau vous envoie un lien d'activation par email. »

- [ ] **Step 2 : activation.**
  - La page serveur lit `searchParams.jeton` et appelle `verifierJeton`. Si `!ok`, elle affiche dans un `Cadre` un message selon la raison :
    - « Ce lien a expiré… » ;
    - « Ce lien a déjà servi… » avec un lien vers `/connexion` ;
    - « Lien inconnu… » ;
    - et, dans tous les cas, un lien vers `/contact`.
  - Si `ok` : « Bienvenue, {nom} » et un formulaire avec le mot de passe et sa confirmation (12 caractères minimum, avec un compteur).
  - Server Action `activer(jeton, _etat, formData)` :
    1. valide avec Zod (les deux mots de passe identiques, sinon `"Les deux mots de passe ne correspondent pas."` sur le champ `confirmation`) ;
    2. appelle `activerCompte(db, jeton, motDePasse)` ;
    3. connecte le membre avec `auth.api.signInEmail({ body: { email, password }, headers: await headers() })` (le plugin `nextCookies` pose le cookie) ;
    4. hors du `try` : `redirect("/espace-membre?bienvenue=1")`.

    Erreurs : `resultatDErreur`.

- [ ] **Step 3 : vérification manuelle.**
  - Lancer `npx next dev -p 3100`.
  - Créer un membre de test : un script ponctuel dans le scratchpad, qui insère un `user` `e2e-…@ademig.test` avec le rôle membre, `actif: false`, et une fiche `e2e-test`, puis appelle `creerInvitation`.
  - Ouvrir le lien, définir le mot de passe et vérifier l'arrivée sur `/espace-membre`.
  - Supprimer les données de test.

  Captures Playwright à 390 px et à 1440 px de `/connexion` et de `/espace-membre/activer`.

- [ ] **Step 4 : commit.** `git commit -m "Connexion des membres et activation du compte par le lien d'invitation"`

---

### Task 9 : espace membre — accueil, profil, mot de passe

**Files:**
- Create :
  - `src/lib/membres/profil.ts` (+ test) : schéma Zod ;
  - `src/db/operations/profil.ts` (+ test) ;
  - `src/lib/membres/actions-profil.ts` : Server Actions ;
  - `src/app/(membre)/espace-membre/page.tsx` ;
  - `src/app/(membre)/espace-membre/profil/page.tsx`, `.../profil/formulaire.tsx` ;
  - `src/app/(membre)/espace-membre/mot-de-passe/page.tsx` ;
  - `src/components/membre/navigation.tsx` (onglets Accueil · Profil · Annuaire · Mot de passe · Déconnexion ; barre fixe en bas sur mobile).
- Modify: `src/app/api/media/upload/route.ts`

**Interfaces:**
- Produces :

```ts
export const schemaProfil: z.ZodType<{ resume: string; linkedin: string | null; promotion: number | null; specialite: string; organisation: string | null; ville: string | null; telephone: string | null; visibilite: Visibilite; photoUrl: string | null; photoPathname: string | null; photoLargeur: number | null; photoHauteur: number | null }>;
export type ProfilMembre = { membreId: string; nom: string; email: string; numeroMembre: number | null; photo: string | null; resume: string; linkedin: string; promotion: string; specialite: string; organisation: string; ville: string; telephone: string; visibilite: Visibilite; slug: string };
export async function lireProfil(db: Db, userId: string): Promise<ProfilMembre | undefined>;
export async function modifierProfil(db: Db, userId: string, p: z.output<typeof schemaProfil>): Promise<void>;
```

- [ ] **Step 1 : tests du schéma.**
  - `linkedin` accepte `https://www.linkedin.com/in/awa-ndiaye-123/` et `https://linkedin.com/in/awa` ; il refuse `http://…`, `https://linkedin.com/company/x` et `https://evil.com/in/x`, avec le message « Collez l'adresse de votre profil LinkedIn (https://www.linkedin.com/in/…). ». Une chaîne vide donne `null`.
  - `resume` : 501 caractères → « 500 caractères au maximum. ». Le HTML est refusé : un texte contenant `<` suivi d'une lettre est rejeté avec le message « Texte simple uniquement. ».
  - `telephone` : chiffres, espaces et `+`, entre 7 et 20 caractères, ou vide.
  - `visibilite` : une valeur de `VISIBILITES` uniquement.
  - `photoUrl` : `estUrlBlob` et `pathname` commençant par `membres/`.

  Run et attendre l'ÉCHEC.

- [ ] **Step 2 : tests des opérations (PGlite).**
  - `modifierProfil(db, userId, …)` modifie **uniquement** la fiche dont `userId` correspond. Créer deux fiches pour deux comptes et vérifier que la seconde n'a pas bougé (Review Focus n° 5).
  - La visibilité `membres` donne `visible: false` et `annuaire: true`.
  - La photo crée une ligne `media` (`alt: "Portrait de {nom}"`) et renseigne `photoId`. Une nouvelle photo remplace la précédente ; l'ancienne ligne `media` est supprimée si plus rien ne l'utilise (réutiliser `usagesMedia`).
  - `liens` garde `email` et `site`, et ne modifie que `linkedin`.

  Run et attendre l'ÉCHEC, puis implémenter. Run et attendre le SUCCÈS.

- [ ] **Step 3 : envoi de la photo.** Dans `src/app/api/media/upload/route.ts`, `onBeforeGenerateToken(pathname)` accepte :
  - un éditeur, comme aujourd'hui ;
  - **ou** une session dont l'utilisateur a une fiche rattachée, à condition que `pathname` commence par `membres/`. Dans ce cas : `allowedContentTypes: ["image/jpeg","image/png","image/webp"]` et `maximumSizeInBytes: 5 * 1024 * 1024`.

  Côté client, le formulaire de profil :
  - recadre l'image en carré de 800 px avec un canvas (réutiliser `preparer-image.ts` si l'API s'y prête, sinon une fonction `recadrerCarre(file): Promise<Blob>` testée) ;
  - l'envoie avec `upload("membres/portrait.webp", blob, { access: "public", handleUploadUrl: "/api/media/upload" })` ;
  - place l'URL, le pathname et les dimensions dans des champs cachés.

  Le nettoyage d'un fichier orphelin suit le modèle de `nettoyerEnvoiOrphelin`, avec le préfixe `/membres/`.

- [ ] **Step 4 : Server Action `enregistrerProfil(_etat, formData)`.**
  1. `const m = await exigerMembre()`. Si `sansFiche` : `{ ok: false, message: "Aucune fiche membre n'est liée à votre compte : contactez le bureau." }`.
  2. `lireFormulaire(schemaProfil, formData)`.
  3. `modifierProfil(db, m.userId, data)` : **aucun identifiant n'est lu dans `formData`**.
  4. `revalidateTag(TAGS.membres, { expire: 0 })` et `revalidatePath("/espace-membre")`.
  5. Renvoyer `{ ok: true, message: "Profil enregistré." }`.

  Ajouter un test unitaire de l'action (même style que `src/lib/admin/membres.test.ts`, avec les mocks de `@/db/operations/profil` et `@/lib/session`) : un `formData` qui contient `membreId=autre` appelle quand même `modifierProfil` avec `m.userId`.

- [ ] **Step 5 : pages.**
  - **Accueil :**
    - « Bonjour {prénom} » et le numéro de membre ;
    - si `?bienvenue=1` : une alerte « Compte activé ! Complétez votre profil. » ;
    - une carte « Votre profil », avec une jauge de complétude (photo, présentation, LinkedIn, promotion) et le bouton « Compléter » ;
    - une carte « Cotisations », avec le texte « Le paiement en ligne arrive bientôt. » (en attendant le lot 2) ;
    - une carte « Annuaire » ;
    - si `sansFiche` : le message de l'étape 4 dans un `Cadre`.
  - **Profil :**
    - photo ronde avec le bouton « Changer » ;
    - nom et email en lecture seule, avec l'aide « Pour les modifier, contactez le bureau. » ;
    - présentation (zone de texte avec compteur) ;
    - LinkedIn ;
    - promotion, spécialité, entreprise, ville, téléphone (avec l'aide « Visible uniquement par le bureau. ») ;
    - visibilité en trois boutons radio avec `LIBELLES_VISIBILITE` ;
    - si la fiche est publique, un lien « Voir ma fiche publique » vers `/membres/<slug>`.
  - **Mot de passe :** `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`, avec 12 caractères minimum.
  - **Déconnexion :** `authClient.signOut()`, puis `/`.

  Les pages sont des composants serveur ; seuls les formulaires sont des composants client (`useActionState`). Composants du site : `Cadre`, `Etiquette`, titres `font-titre text-marine`.

- [ ] **Step 6 : vérification visuelle.** Captures à 390 px et à 1440 px de l'accueil et du profil (avec et sans photo), avec le membre de test de la tâche 8. Les regarder, corriger, puis supprimer les données de test.

- [ ] **Step 7 : commit.** `git commit -m "Espace membre : accueil, profil (photo, présentation, LinkedIn, visibilité) et mot de passe"`

---

### Task 10 : annuaire privé

**Files:**
- Create: `src/db/requetes/annuaire.ts` (+ test), `src/app/(membre)/espace-membre/annuaire/page.tsx`

**Interfaces:**
- Produces :

```ts
export type FicheAnnuaire = { slug: string; nom: string; photo: string | null; promotion: number | null; specialite: string; organisation: string | null; ville: string | null; linkedin: string | null; resume: string };
export type FiltreAnnuaire = { q: string; promotion: number | null; specialite: string | null; page: number };
export async function listerAnnuaire(db: Db, f: FiltreAnnuaire): Promise<{ fiches: FicheAnnuaire[]; total: number; promotions: number[]; specialites: string[] }>;
export const PAR_PAGE_ANNUAIRE = 24;
```

- [ ] **Step 1 : tests (PGlite).**
  - Une fiche est listée si `annuaire = true` **et** si son compte est actif, **ou** si elle est publique (`visible = true`), même sans compte : le bureau actuel y figure.
  - Une fiche `masquee` et une fiche dont le compte n'est pas activé (`annuaire = true` mais `user.actif = false`) n'apparaissent pas.
  - `q` cherche dans le nom et l'organisation, sans tenir compte de la casse (`ilike` avec `motifRecherche`).
  - Filtres de promotion et de spécialité ; pagination par 24.
  - **Le type `FicheAnnuaire` ne contient ni `telephone` ni `emailContact`.** Ajouter un test qui vérifie que les clés de l'objet renvoyé sont exactement celles attendues.

  Run et attendre l'ÉCHEC, puis implémenter. Run et attendre le SUCCÈS.

- [ ] **Step 2 : page.**
  - Recherche et filtres dans un `<form method="get">`, donc sans JavaScript, comme les listes de l'admin.
  - Grille de cartes (1 colonne sur mobile, 2 sur tablette, 3 sur ordinateur) : `Portrait` (le composant existant), nom, « Promotion 2015 · Mines », organisation et ville, bouton LinkedIn (`target="_blank" rel="noopener"`).
  - Pagination identique à celle de l'admin (`urlListe`).
  - Message quand la liste est vide : « Aucun membre ne correspond à votre recherche. »

  La page appelle `exigerMembre()`. Un compte admin sans fiche voit l'annuaire quand même : le bureau en a besoin.

- [ ] **Step 3 : commit.** `git commit -m "Annuaire privé des membres : recherche, promotion, spécialité, LinkedIn"`

---

### Task 11 : admin — import et suivi des invitations

**Files:**
- Create :
  - `src/app/admin/(espace)/membres/importer/page.tsx`, `.../importer/formulaire.tsx` ;
  - `src/lib/admin/import-membres.ts` : Server Actions `analyserImport`, `confirmerImport` ;
  - `src/lib/admin/invitations.ts` : Server Actions `renvoyerInvitationMembre`, `copierLienInvitation`, `inviterTousLesNonInvites`, `desactiverMembre`.
- Modify :
  - `src/app/admin/(espace)/membres/page.tsx` : colonne « Compte », filtre `compte=` (tous / à inviter / invité / activé / échec), bouton « Importer des membres » ;
  - `src/db/requetes/admin/membres.ts` : jointure `user` et `suiviInvitations` ;
  - `src/app/admin/(espace)/membres/[id]/…` : encadré « Compte » avec le statut et les actions ;
  - `src/lib/admin/filtre.ts`.

**Interfaces:**
- Consumes : `analyserCsv`, `classerImport`, `executerImport`, `inviterParEmail`, `creerInvitation`, `suiviInvitations`, `urlActivation`.
- Produces :

```ts
export async function analyserImport(_e: unknown, fd: FormData): Promise<Resultat<{ lignes: LigneClassee[]; problemes: ProblemeImport[]; csv: string }>>;
export async function confirmerImport(csv: string): Promise<Resultat<{ crees: number; rattaches: number; ignores: number; invites: number }>>;
export async function copierLienInvitation(userId: string): Promise<Resultat<{ url: string }>>;
```

- [ ] **Step 1 : tests des actions** (mocks des opérations, comme `src/lib/admin/membres.test.ts`) :
  - `analyserImport` est refusé à un éditeur (`AccesRefuse`) et accepté pour un superadmin ;
  - un fichier de plus de 1 Mo est refusé ;
  - `confirmerImport` réanalyse le CSV reçu (aucune confiance dans l'aperçu), appelle `executerImport`, puis `inviterParEmail` pour chaque `aInviter`, et renvoie les compteurs ;
  - `copierLienInvitation` renvoie une URL qui commence par `urlSite()` et contient `/espace-membre/activer?jeton=`.

  Run et attendre l'ÉCHEC, puis implémenter. Run et attendre le SUCCÈS.

- [ ] **Step 2 : écran d'import.**
  - Étape 1 :
    - champ fichier (`accept=".csv,text/csv"`) ;
    - lien « Télécharger le modèle » vers `/modele-import-membres.csv` ;
    - aide : « Dans Excel : Fichier → Enregistrer sous → CSV UTF-8 (délimité par des virgules). ».

    Le fichier est lu côté serveur (`await (fd.get("fichier") as File).text()`).
  - Étape 2 (aperçu) :
    - compteurs : nouveaux, fiches rattachées, comptes liés, déjà membres, erreurs ;
    - tableau des erreurs (ligne, message) ;
    - tableau repliable des lignes valides avec leur statut ;
    - bouton « Importer N membres et programmer les invitations » ;
    - avertissement : « Les invitations partent par lots de 150 par jour : environ {ceil(N/150)} jours pour tout le monde. ».

    Le CSV est renvoyé dans un champ caché, puis réanalysé à la confirmation.
  - Étape 3 : message de résultat et lien vers la liste filtrée `compte=en_file`.
  - L'écran est réservé au superadmin (`exigerRole("superadmin")` dans la page). Le lien « Importer » ne s'affiche que pour lui.

- [ ] **Step 3 : suivi.**
  - La liste `/admin/membres` affiche le badge de statut du compte :
    - À inviter (gris) ;
    - En file (sable) ;
    - Invité le JJ/MM (eau) ;
    - Échec (rouge, avec l'erreur dans `title`) ;
    - Activé (vert).
  - Fiche d'un membre, encadré Compte :
    - email du compte ;
    - « Renvoyer l'invitation » (nouveau jeton, mis en file en tête : `creeLe` = maintenant moins un an, pour passer au prochain cron) ;
    - « Copier le lien » (`navigator.clipboard.writeText`, avec le message « Lien copié : valable 30 jours, ne le partagez qu'avec ce membre. ») ;
    - « Désactiver le compte » (réutilise `changerActivation`).
  - Bouton « Inviter tous les membres pas encore invités » en haut de la liste : il met en file une invitation pour chaque compte membre sans invitation, ce qui couvre le rattrapage.

- [ ] **Step 4 : vérification visuelle.** Importer un CSV de 3 lignes `e2e-…@ademig.test` en dev (en prod, ces emails ne partent pas : domaine `.test`). Vérifier l'aperçu et la liste, puis nettoyer. Prendre des captures.

- [ ] **Step 5 : commit.** `git commit -m "Admin : import CSV des membres en deux temps et suivi des invitations (renvoyer, copier le lien)"`

---

### Task 12 : e2e, nettoyage et documentation

**Files:**
- Create: `e2e/espace-membre.spec.ts`
- Modify: `e2e/nettoyage.ts` (supprimer aussi les `emails_file` dont le destinataire est en `@ademig.test` ; les invitations partent en cascade avec `user`), `README.md` (section « Espace membre » : variables, cron, import), `src/app/robots.ts` (déjà fait à la tâche 8 : le vérifier)

- [ ] **Step 1 : parcours e2e.**
  - **Préparation, par la base** (même style que `e2e/preparation.ts`) :
    - un `user` `e2e-membre@ademig.test` (membre, inactif) ;
    - une fiche `e2e-membre` ;
    - `creerInvitation`, dont on garde le jeton.
  - **Parcours :**
    1. ouvrir `/espace-membre/activer?jeton=…` et définir un mot de passe → arrivée sur `/espace-membre` avec « Compte activé » ;
    2. modifier la présentation et le LinkedIn, puis choisir « Membres seulement » → « Profil enregistré. » ;
    3. ouvrir `/espace-membre/annuaire`, chercher « e2e » → la carte s'affiche avec le lien LinkedIn ;
    4. rouvrir le lien d'activation → « Ce lien a déjà servi » ;
    5. ouvrir `/admin` → redirection vers `/espace-membre` ;
    6. se déconnecter, puis ouvrir `/espace-membre` → redirection vers `/connexion?retour=…`.
  - Lancer `E2E_AUTORISE=1 npx playwright test e2e/espace-membre.spec.ts`. Résultat attendu : SUCCÈS. Puis toute la suite e2e : `E2E_AUTORISE=1 npm run test:e2e`.

- [ ] **Step 2 : contrôles complets.** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`. Tout doit passer.

- [ ] **Step 3 : commit.** `git commit -m "E2E de l'espace membre ; nettoyage des emails de test ; documentation"`

---

## Livraison (après la revue finale)

1. Pousser la branche `espace-membre-lot1`, puis ouvrir la PR avec `gh`. Description terminée par « 🤖 Generated with [Claude Code](https://claude.com/claude-code) ». Checklist pour la preview :
   - activation ;
   - profil avec photo ;
   - annuaire ;
   - import d'un CSV de test ;
   - « Copier le lien ».
2. Variables Vercel : `CRON_SECRET` (à générer : `openssl rand -hex 32`) en Production et en Preview, avec `vercel env add`. `GMAIL_USER` et `GMAIL_APP_PASSWORD` : dès que l'utilisateur les fournit. Sans elles, l'import fonctionne et « Copier le lien » aussi, mais la file reste en attente : le dire clairement dans la PR.
3. Attendre `gh pr checks --watch`, puis fusionner (`gh pr merge --merge`), comme l'utilisateur l'a autorisé. Vérifier ensuite en prod que `/connexion` répond et que le cron apparaît dans le projet Vercel.
