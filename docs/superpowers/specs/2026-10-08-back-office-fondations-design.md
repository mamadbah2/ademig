# Back office ADEMIG — Sous-projet 1 : Fondations

Date : 08/10/2026 · Statut : en revue

## 1. Contexte et objectif

Le site officiel de l'ADEMIG (Next.js 16, App Router, Tailwind 4) affiche aujourd'hui un contenu écrit en dur dans `src/lib/content/*.ts` et `src/lib/site.ts`. L'objectif du back office est de permettre au bureau de l'amicale de gérer tout ce contenu sans toucher au code, puis d'ajouter des fonctions de vie associative.

Le back office complet est découpé en quatre sous-projets, chacun avec sa propre spec, son plan et son implémentation :

1. **Fondations** (ce document) : base de données, authentification et rôles, coquille `/admin`, médiathèque, migration du contenu actuel vers la base.
2. **Gestion des contenus** : CRUD des actualités, événements, membres, bureau et commissions (mandats), partenaires, réglages du site ; brouillon / publié et aperçu ; éditeur de texte riche.
3. **Interactions** : formulaire de contact et boîte de réception, demandes d'adhésion, tableau de bord, SEO par contenu, journal d'activité.
4. **Espace membre et vie de l'amicale** : fiches modifiées par les membres avec validation, cotisations, inscriptions aux événements, newsletter, exports et imports.

### Critères de réussite du sous-projet 1

- Un super-admin peut se connecter, créer des comptes éditeurs et super-admins, et les gérer.
- Un utilisateur connecté peut envoyer, décrire, rechercher et supprimer (si inutilisées) des images dans la médiathèque.
- Le site public lit tout son contenu depuis Postgres et affiche exactement le même contenu qu'avant la migration.
- Aucune page `/admin` n'est accessible sans session, et aucune action n'est exécutable sans le rôle requis.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Approche | Back office sur mesure, intégré à l'application Next.js |
| Hébergement | Vercel |
| Base de données | Neon Postgres via la Marketplace Vercel |
| ORM | Drizzle ORM + drizzle-kit (migrations SQL versionnées) |
| Authentification | Better Auth, email + mot de passe, pas d'inscription publique |
| Rôles | `superadmin`, `editeur` |
| Stockage des images | Vercel Blob (envoi direct depuis le navigateur) |
| Emails transactionnels | Resend via la Marketplace Vercel |
| Validation | Zod, côté serveur pour chaque action |
| Style de l'admin | Sobre, aux couleurs ADEMIG (couleurs, polices, logo), sans GSAP ni Lenis, composants maison |

## 3. Architecture

### 3.1 Organisation des routes

- Les pages publiques sont déplacées dans le groupe de routes `src/app/(site)/`. Les URL ne changent pas. Le layout `(site)/layout.tsx` contient le header, le footer, `Animations` (GSAP, Lenis) et `Chargement`.
- Le layout racine `src/app/layout.tsx` ne garde que `<html>`, `<body>`, les polices, `globals.css` et les métadonnées communes.
- L'admin vit dans `src/app/admin/`, avec son propre layout (menu latéral, tiroir sur mobile). Toutes ses pages sont en `noindex`. `/admin` est exclu de `sitemap.ts` et interdit dans `robots.ts`.
- `src/proxy.ts` (le middleware renommé dans Next 16) redirige vers `/admin/connexion` toute requête `/admin/*` sans cookie de session. Ce n'est qu'une commodité : l'autorisation réelle se fait dans chaque page et chaque Server Action.
- Une route `src/app/api/auth/[...all]/route.ts` expose Better Auth. Une route `src/app/api/media/upload/route.ts` délivre les jetons d'envoi Blob.

Avant d'écrire le code, il faut lire les guides Next 16 concernés dans `node_modules/next/dist/docs/` (authentication, data-security, forms, server-actions, how-revalidation-works, proxy) et suivre leurs conventions.

### 3.2 Couches du code

```
src/
  db/
    schema.ts          # tables Drizzle (contenu + auth Better Auth)
    index.ts           # client Drizzle (driver Neon serverless)
    seed.ts            # import du contenu actuel
  lib/
    auth.ts            # configuration Better Auth (serveur)
    auth-client.ts     # client Better Auth (navigateur)
    session.ts         # getSession(), exigerRole(role)
    content/*.ts       # get*() : lecture en base + mise en cache, types inchangés
    admin/
      comptes.ts       # Server Actions des comptes
      media.ts         # Server Actions de la médiathèque
    validation/*.ts    # schémas Zod
    html.ts            # nettoyage du HTML
  components/admin/*   # composants de l'interface admin
scripts/
  creer-admin.ts       # création du premier super-admin
```

### 3.3 Lecture du contenu par le site public

- Les fonctions `getActualites()`, `getActualite(slug)`, `getEvenements()`, `getEvenement(slug)`, `getMembres()`, `getMembre(slug)` et leurs équivalents pour l'organisation, les partenaires et les réglages gardent leur signature et renvoient les mêmes types (`src/lib/content/types.ts`).
- Elles lisent la base et sont mises en cache avec `unstable_cache` et des tags : `actualites`, `evenements`, `membres`, `bureau`, `partenaires`, `reglages`, `media`.
- On n'active **pas** `cacheComponents` : avec cette option, Next 16 garde les pages quittées dans le DOM (`<Activity>`), ce qui risque de casser les animations GSAP du site. La migration vers `"use cache"` pourra se faire plus tard, séparément.
- Chaque Server Action d'écriture appelle `revalidateTag(tag, { expire: 0 })` pour les tags qu'elle concerne. Le site se met à jour sans redéploiement.
- Le site public n'affiche que les contenus `publie` et les membres et partenaires `visible`.
- Changements de types acceptés : `corps` (actualités, événements) et `bio` (membres) deviennent des chaînes HTML au lieu de tableaux de paragraphes. Les pages publiques concernées sont adaptées pour afficher ce HTML nettoyé. `fonction` d'un membre est calculée à partir du mandat actif.

## 4. Modèle de données

Principes : les listes toujours modifiées avec leur parent sont en `jsonb` ; les éléments partagés (images, membres) ont leur table. Toutes les tables de contenu ont un `id` (uuid) et, sauf mention contraire, `cree_le` et `maj_le` ; les tables de Better Auth gardent leurs `id` texte.

### 4.1 Authentification (Better Auth)

- `user` : tables standard de Better Auth, avec les champs supplémentaires `role` (`superadmin` | `editeur`) et `actif` (booléen).
- `session`, `account`, `verification` : tables standard de Better Auth.

### 4.2 Médias

- `media` : `url` (unique), `pathname` (vide pour les fichiers de `/public`), `alt` (obligatoire), `credit`, `width`, `height`, `mime`, `taille` (octets), `cree_par` (→ `user`).

### 4.3 Contenus

- `actualites` : `slug` (unique), `titre`, `date`, `resume`, `corps` (HTML nettoyé), `sources` (jsonb `{label, url}[]`), `videos` (jsonb `{id, titre}[]`), `statut` (`brouillon` | `publie`), `publie_le`.
- `actualite_photos` : `actualite_id`, `media_id`, `ordre`. La photo d'ordre 0 sert de vignette.
- `evenements` : `slug` (unique), `titre`, `debut`, `fin`, `lieu_nom`, `lieu_ville`, `theme`, `resume`, `corps` (HTML), `videos` (jsonb), `affiche_id` (→ `media`), `partenaires` (text[] de noms libres), `statut`, `publie_le`.
- `evenement_photos` : `evenement_id`, `media_id`, `ordre`.
- `membres` : `slug` (unique), `nom`, `titre`, `specialite`, `promotion`, `numero`, `organisation`, `ville`, `resume`, `bio` (HTML), `parcours` (jsonb `Etape[]`), `competences` (text[]), `realisations` (jsonb), `liens` (jsonb), `photo_id` (→ `media`), `visible`.
- `mandats` : `libelle`, `date_election`, `actif`. Un index unique partiel garantit un seul mandat actif.
- `postes_bureau` : `mandat_id`, `membre_id`, `fonction`, `ordre`, `executif` (booléen : membre du bureau exécutif affiché en tête de la page Bureau). Remplace le champ `fonction` des fiches et la constante `ordreBureau`.
- `commissions` : `mandat_id`, `nom`, `mission`, `ordre`.
- `commission_membres` : `commission_id`, `membre_id`, `ordre`.
- `partenaires` : `nom`, `description`, `categorie` (enum `Institution` | `Entreprise` | `Événement`), `url`, `logo_id` (→ `media`), `ordre`, `visible`.
- `reglages` : une seule ligne ; colonnes jsonb `contact` (même forme que l'actuel `site.contact` : email, phone, press, address), `reseaux` (`{label, url}[]`), `textes` (textes éditables de l'accueil et de L'Amicale, vide jusqu'au sous-projet 2), validées par Zod. Le nom, la devise et l'URL du site restent dans `site.ts`. L'en-tête, le pied de page, la page Contact et le JSON-LD lisent désormais ces réglages.

Les tables du journal d'activité, des messages, des adhésions et des cotisations ne font pas partie de ce sous-projet.

### 4.4 Seed

`npm run db:seed` importe, de façon idempotente (par `slug` ou par `src`) :
- toutes les images référencées dans `src/lib/content/*.ts` comme lignes `media` pointant vers `/public` (largeur, hauteur, alt et crédit repris) ;
- les actualités et les événements au statut `publie`, avec le corps converti de `string[]` en paragraphes `<p>` échappés ;
- les membres (`visible = true`), avec la bio convertie de la même façon ;
- le mandat « Bureau 2024 » (élu le 22/09/2024, actif), ses postes d'après `fonction` et `ordreBureau`, et les commissions ;
- les partenaires dans l'ordre actuel ;
- les réglages à partir de `site.ts`.

Une fois le seed validé, les tableaux de données en dur sont retirés de `src/lib/content/*.ts` ; ils restent consultables dans l'historique Git et dans une copie utilisée par le seed (`src/db/donnees-initiales/`).

## 5. Comptes et sécurité

- **Premier super-admin** : `npm run admin:creer -- --email … --nom …` crée le compte et affiche un mot de passe temporaire, à changer dans « Mon compte ». Aucune page d'inscription n'existe.
- **Invitation** : le super-admin saisit nom, email et rôle ; la personne reçoit par email (Resend) un lien « Définissez votre mot de passe » valable 24 h.
- **Gestion des comptes** (super-admin) : liste, changement de rôle, désactivation et réactivation (ce qui révoque les sessions), renvoi de l'invitation. Un super-admin ne peut ni se rétrograder ni se désactiver, et le dernier super-admin actif ne peut pas être rétrogradé ou désactivé.
- **Mot de passe** : 12 caractères minimum ; pages « Mot de passe oublié » et « Réinitialiser » ; page « Mon compte » pour modifier son nom et son mot de passe.
- **Session** : cookie `httpOnly`, `secure` et `sameSite=lax`, durée de 7 jours ; limite de tentatives de connexion de Better Auth activée ; un compte inactif ne peut pas se connecter.
- **Autorisation** : chaque page admin et chaque Server Action commence par `exigerRole("editeur")` ou `exigerRole("superadmin")` (le super-admin a tous les droits de l'éditeur). Sans session, on redirige vers la connexion. Avec un rôle insuffisant, une page affiche « Accès refusé » et une action renvoie `{ ok: false, message: "Accès refusé" }` (`forbidden()` est encore expérimental dans Next 16, on ne l'utilise pas).
- **HTML** : tout HTML enregistré est nettoyé côté serveur avec une liste blanche de balises et d'attributs (paragraphes, titres h2–h3, gras, italique, listes, liens `http(s)`/`mailto`, citations).

## 6. Médiathèque

- **Envoi** : depuis le navigateur, directement vers Vercel Blob (`@vercel/blob/client`), ce qui contourne la limite de 4,5 Mo des fonctions. La route `api/media/upload` vérifie la session et n'autorise que les types JPEG, PNG, WebP, AVIF et SVG, avec 10 Mo maximum.
- **Préparation dans le navigateur** : les images matricielles sont redimensionnées à 2000 px de côté au maximum et converties en WebP (qualité 0,82) ; les SVG sont envoyés tels quels. Le navigateur mesure la largeur et la hauteur finales.
- **Enregistrement** : après l'envoi, une Server Action crée la ligne `media` (alt obligatoire, crédit facultatif).
- **Écran** : grille de vignettes, recherche par alt et crédit, panneau de détail (aperçu, dimensions, poids, modifier alt et crédit, copier l'URL, liste des contenus qui l'utilisent).
- **Suppression** : refusée tant que le média est référencé (photos, affiche, photo de membre, logo) ; sinon la ligne et le fichier Blob sont supprimés. Les fichiers de `/public` ne sont jamais supprimés du disque.
- **Sélecteur réutilisable** : composant `<SelecteurMedia>` (choix simple ou multiple, envoi depuis le sélecteur) prêt pour les formulaires du sous-projet 2.
- `next.config.ts` : le domaine Vercel Blob est ajouté à `images.remotePatterns`.

## 7. Interface admin

- **Menu** : Tableau de bord, Actualités, Événements, Membres, Bureau, Partenaires, Médiathèque, Réglages, Comptes (visible seulement pour le super-admin). En bas : Mon compte, Voir le site, Déconnexion.
- **Livré dans ce sous-projet** : connexion, mot de passe oublié, réinitialisation, mon compte, comptes, médiathèque. Les autres rubriques affichent « Bientôt disponible ».
- **Composants maison** : bouton, champ, zone de texte, liste déroulante, tableau, badge de statut, boîte de dialogue de confirmation, notification de confirmation, état vide. Couleurs et polices tirées de `globals.css` (Lilita One pour les titres, Lato pour le texte).
- **Accessibilité** : navigation au clavier, focus visible, libellés liés aux champs, contraste AA ; utilisable dès 360 px de large.

## 8. Gestion des erreurs

- Les Server Actions renvoient `{ ok: true, … }` ou `{ ok: false, erreurs: Record<champ, string[]>, message? }`, affichées avec `useActionState`. Une erreur de saisie ne lève jamais d'exception.
- `src/app/admin/error.tsx` affiche un message clair et un bouton « Réessayer » ; le détail technique n'est que dans les journaux serveur.
- Slug déjà pris : erreur sur le champ. Un slug publié n'est jamais régénéré automatiquement.
- Envoi d'image en échec : erreur affichée sur la vignette, avec un bouton pour réessayer.
- Base indisponible côté site public : les pages en cache continuent d'être servies, sinon la page d'erreur du site s'affiche.

## 9. Environnements et configuration

- Neon : branche `main` pour la production, branche `dev` pour le développement local et les previews Vercel.
- Variables (gérées par `vercel env`) : `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY`, `EMAIL_EXPEDITEUR`.
- Scripts npm : `db:generate`, `db:migrate`, `db:seed`, `admin:creer`, `test`, `test:e2e`.
- L'expéditeur des emails dépend du domaine définitif, qui n'est pas encore confirmé. En attendant, on utilise l'expéditeur de test de Resend en développement.

## 10. Tests

- **Vitest (unitaires)** : schémas Zod, nettoyage du HTML, `exigerRole`, conversion des lignes de la base en types `Actualite`, `Evenement`, `Member`, `Partenaire`.
- **Vitest + PGlite (intégration)** : les migrations s'appliquent sur une base vide ; le seed est idempotent ; après le seed, chaque `get*()` renvoie des données équivalentes aux données initiales (comparaison champ par champ, `corps` et `bio` comparés après conversion) ; les règles des comptes (dernier super-admin, compte inactif) sont respectées.
- **Playwright (bout en bout)** : connexion et déconnexion ; redirection de `/admin` sans session ; un éditeur reçoit un refus sur la page Comptes ; envoi d'une image dans la médiathèque puis modification de son alt.
- **Non-régression** : `npm run build` réussit et les pages publiques affichent le même contenu qu'avant (contrôle visuel des pages principales).

## 11. Hors périmètre

CRUD des contenus, éditeur riche, brouillons et aperçu, réglages éditables (sous-projet 2) ; contact, adhésions, tableau de bord, SEO par contenu, journal d'activité (sous-projet 3) ; espace membre, cotisations, inscriptions, newsletter, exports (sous-projet 4) ; mise en production et domaine définitif.
