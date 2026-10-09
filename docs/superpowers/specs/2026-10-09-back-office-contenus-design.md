# Back office ADEMIG — Sous-projet 2 : Gestion des contenus

Date : 09/10/2026 · Statut : validé, à planifier

## 1. Contexte et objectif

Le sous-projet 1 (fondations) est en production : base Neon + Drizzle, Better Auth (rôles `superadmin` et `editeur`), coquille `/admin`, médiathèque Vercel Blob et `SelecteurMedia`, site public lu depuis Postgres avec `unstable_cache` et des tags. Voir `docs/superpowers/specs/2026-10-08-back-office-fondations-design.md`.

Ce sous-projet permet au bureau de gérer tout le contenu du site depuis `/admin`, sans toucher au code : actualités, événements, membres, bureau (mandats, postes, commissions), partenaires et réglages (coordonnées, réseaux, textes clés de l'accueil et de L'Amicale), avec brouillon / publié, aperçu et éditeur de texte riche.

### Critères de réussite

- Un éditeur peut créer, modifier, publier, dépublier et supprimer chaque type de contenu, et le site public se met à jour sans redéploiement.
- Un brouillon n'est jamais visible sur le site public, sauf en aperçu par une personne connectée à l'admin.
- Un nouveau bureau peut être préparé hors ligne puis activé d'un coup.
- Tout HTML enregistré est nettoyé côté serveur.
- Les reports du sous-projet 1 listés en section 9 sont traités.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Droits | L'éditeur gère tous les contenus (y compris bureau et réglages) : créer, modifier, publier, supprimer. Le super-admin garde en plus la gestion des comptes. |
| Construction des formulaires | Un formulaire sur mesure par type de contenu, `<form>` + Server Action + `useActionState` + Zod, avec des composants de champ partagés (pas de moteur CRUD générique) |
| Éditeur riche | Tiptap, limité aux balises acceptées par `nettoyerHtml` |
| Aperçu | Draft Mode de Next, réservé à une session admin, sur la vraie page publique |
| Textes du site | Liste fermée de textes clés éditables dans Réglages, avec le texte actuel comme valeur par défaut |
| Mandats | Préparer un mandat inactif, puis l'activer d'un coup ; les anciens mandats restent consultables dans l'admin seulement |
| Ordre des éléments | Boutons ↑ / ↓ (clavier et mobile), pas de glisser-déposer |
| Suppression | Définitive, après confirmation |
| Concurrence | Contrôle optimiste sur `maj_le` |
| Base de données | Aucune migration prévue : le schéma du sous-projet 1 couvre tout |

## 3. Architecture

Avant d'écrire le code, lire les guides Next 16 concernés dans `node_modules/next/dist/docs/` (draft-mode, forms, server-actions, how-revalidation-works) et suivre leurs conventions.

### 3.1 Routes de l'admin

La page générique `src/app/admin/(espace)/[rubrique]/page.tsx` (« Bientôt disponible ») est supprimée au profit de :

- `/admin/actualites`, `/admin/actualites/nouveau`, `/admin/actualites/[id]`
- `/admin/evenements`, `/admin/evenements/nouveau`, `/admin/evenements/[id]`
- `/admin/membres`, `/admin/membres/nouveau`, `/admin/membres/[id]`
- `/admin/partenaires` (liste ordonnée), `/admin/partenaires/nouveau`, `/admin/partenaires/[id]`
- `/admin/bureau` (liste des mandats + « Nouveau mandat »), `/admin/bureau/[mandatId]` (postes et commissions sur un même écran, bouton « Activer ce mandat »)
- `/admin/reglages` : onglets Coordonnées, Réseaux sociaux, Textes du site

Chaque page commence par `exigerRole("editeur")`.

### 3.2 Couches du code

```
src/
  db/
    operations/<contenu>.ts      # écritures pures (db, …), transactions, contrôle maj_le — testées sur PGlite
    requetes/admin/<contenu>.ts  # lectures de l'admin : sans cache, brouillons compris, pagination
  lib/
    validation/<contenu>.ts      # schémas Zod ; le HTML passe par nettoyerHtml dans le schéma
    admin/<contenu>.ts           # Server Actions : action(role) → validation → opération → revalidateTag → revalidatePath
    admin/slug.ts                # slugifier()
    admin/apercu.ts              # garde de l'aperçu (Draft Mode + session)
    content/textes.ts            # liste des textes éditables et valeurs par défaut
  components/admin/champs/
    editeur-riche.tsx            # Tiptap
    champ-slug.tsx
    liste-editable.tsx           # ListeEditable<T> générique
    champ-media.tsx              # une image
    galerie-photos.tsx           # plusieurs images ordonnées
    barre-publication.tsx        # statut, Enregistrer, Publier/Dépublier, Aperçu, Supprimer
  app/api/apercu/route.ts        # activation du Draft Mode
```

Les opérations d'écriture des contenus suivent le modèle de `src/db/operations/media.ts` et `comptes.ts`. Les Server Actions passent toutes par `action()` (`src/lib/admin/action.ts`) et renvoient le type `Resultat`.

### 3.3 Aperçu (Draft Mode)

- `GET /api/apercu?type=<actualite|evenement|membre>&id=<uuid>` : vérifie la session admin (sinon 401), cherche le contenu par `id` (sinon 404), appelle `draftMode().enable()` puis redirige vers le chemin construit à partir du slug lu en base (`/actualites/<slug>`, `/evenements/<slug>`, `/membres/<slug>`). L'URL de destination ne vient jamais des paramètres, ce qui évite toute redirection ouverte.
- Les pages publiques de détail (`actualites/[slug]`, `evenements/[slug]`, `membres/[slug]`) appellent un getter qui n'inclut les brouillons et les membres masqués que si **`draftMode().isEnabled` et une session admin valide** sont réunis. Le cookie de Draft Mode seul ne suffit pas. Dans ce cas la lecture se fait sans cache.
- Le layout `(site)` affiche, quand le Draft Mode est actif, un bandeau « Aperçu — contenu non publié » avec un bouton « Quitter l'aperçu » (Server Action qui appelle `draftMode().disable()` et revient sur la page).
- Les pages de liste publiques n'affichent jamais de brouillons, même en aperçu.

### 3.4 Textes éditables du site

`src/lib/content/textes.ts` déclare la liste fermée des textes éditables : pour chaque clé, un libellé, un groupe (Accueil, L'Amicale), une longueur maximale, s'il s'agit d'une ligne ou d'un paragraphe, et une valeur par défaut égale au texte actuel du code. Clés prévues :

- Accueil : accroche (titre principal), introduction, les trois textes de la devise (Réfléchir, Proposer, Agir), les titres et textes des chiffres clés.
- L'Amicale : introduction de l'en-tête, les titres et textes des quatre missions.

La liste exacte des clés est arrêtée dans le plan, en relevant chaque texte dans `src/app/(site)/page.tsx` et `src/app/(site)/amicale/page.tsx`. Les textes sont en texte brut (pas de HTML). Les pages lisent `textes[clé]`, ou la valeur par défaut si la clé est absente ou vide. Les clés inconnues sont refusées par la validation. La mise en page, les icônes et les images restent dans le code.

### 3.5 Dépendances

Ajout de Tiptap : `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`. Chargé uniquement dans l'admin (`next/dynamic`, `ssr: false`).

## 4. Données et règles de publication

### 4.1 Règles communes

- **Concurrence** : le formulaire renvoie `maj_le` dans un champ caché ; l'écriture fait `UPDATE … WHERE id = ? AND maj_le = ?`. Si aucune ligne n'est modifiée, l'action renvoie « Ce contenu a été modifié entre-temps. Rechargez la page pour voir la dernière version. » (aucune donnée écrasée).
- **Slug** : `slugifier()` produit minuscules, sans accents, mots séparés par des tirets, sans tiret en tête ni en fin. Proposé automatiquement à partir du titre tant que le champ n'a pas été modifié à la main. Unique : un slug déjà pris donne une erreur sur le champ.
- **Listes de l'admin** : recherche texte, filtre par statut (quand il existe), 25 éléments par page, état porté par l'URL (`?q=&statut=&page=`). Tri par date décroissante pour les actualités, par début décroissant pour les événements, par nom pour les membres.
- **Après une création**, redirection vers `/[id]` de l'élément créé. **Après un enregistrement**, notification « Enregistré ».

### 4.2 Actualités et événements

- **Enregistrer** garde le statut. **Publier** passe à `publie` et renseigne `publie_le` s'il est vide. **Dépublier** repasse à `brouillon` et garde `publie_le`.
- La validation est la même pour un brouillon et un contenu publié (les champs obligatoires le sont déjà en base).
- **Slug verrouillé** dès que `publie_le` est renseigné : le changer demande de cliquer sur « Modifier le lien », qui affiche « L'ancien lien ne fonctionnera plus ». Les redirections d'anciens liens relèvent du sous-projet 3.
- **Actualité** : titre, slug, date, résumé, corps (éditeur riche), sources (`ListeEditable` de `{label, url}`), vidéos (`{id YouTube, titre}`), photos (`GaleriePhotos`).
- **Événement** : titre, slug, début et fin (`datetime-local`, heure de Dakar, UTC+0 ; fin facultative et postérieure au début), lieu (nom, ville), thème, résumé, corps, partenaires (noms libres, suggestions tirées de la table `partenaires` par `<datalist>`), vidéos, affiche (`ChampMedia`), photos.
- **Photos** : réécriture en transaction (suppression des lignes de liaison puis insertion avec l'ordre). La photo d'ordre 0 sert de vignette.
- **Suppression** : supprime le contenu et ses liaisons photos ; les médias restent dans la médiathèque.

### 4.3 Membres

- Champs : nom, slug, titre, spécialité, promotion, numéro, organisation, ville, résumé, bio (éditeur riche), parcours (`ListeEditable` d'étapes), compétences (liste de mots), réalisations, liens (LinkedIn, email, site), photo (`ChampMedia`), `visible`.
- `visible` tient lieu de publication. L'aperçu fonctionne aussi pour un membre masqué.
- Le slug est modifiable à tout moment ; si le membre est visible, le changement affiche le même avertissement que pour un contenu publié.
- La fonction affichée sur le site reste calculée à partir du mandat actif (pas de champ `fonction` dans le formulaire).
- **Suppression refusée** si le membre a un poste ou siège dans une commission de **n'importe quel mandat** (l'historique est préservé). Le message propose de le masquer.

### 4.4 Bureau

- **Nouveau mandat** : libellé, date d'élection, case « Reprendre les commissions du mandat actif » (noms, missions et ordre, sans les membres). Le mandat est créé inactif.
- **Écran d'un mandat** :
  - Postes : membre (liste des membres), fonction, case « bureau exécutif », ordre ↑ / ↓. Un membre n'occupe qu'un poste par mandat (index unique existant).
  - Commissions : nom, mission, ordre ↑ / ↓, membres ordonnés.
  - Modifier le libellé et la date d'élection.
- **Activer** : dans une transaction, désactive le mandat actif puis active celui-ci. Refusé si le mandat n'a aucun poste. L'index unique partiel garantit qu'un seul mandat est actif.
- **Supprimer** : refusé pour le mandat actif ; autorisé après confirmation pour un mandat inactif (postes et commissions supprimés en cascade).
- La page publique Bureau n'affiche que le mandat actif (inchangé).

### 4.5 Partenaires

Nom (unique), description, catégorie (`Institution`, `Entreprise`, `Événement`), URL (`http(s)`), logo (`ChampMedia`), `visible`, ordre ↑ / ↓ depuis la liste. Un nouveau partenaire est placé en dernier.

### 4.6 Réglages

- **Coordonnées** : email (valide, obligatoire), téléphone (facultatif), contact presse (nom, téléphone), adresse (rue, boîte postale, ville, pays).
- **Réseaux sociaux** : `ListeEditable` de `{label, url https}`.
- **Textes du site** : un champ par clé de `textes.ts`, groupé par page, avec le texte par défaut en indication et un bouton « Rétablir le texte d'origine » (vide la clé).
- Une seule ligne `reglages` (id = 1), mise à jour avec le contrôle `maj_le`.

### 4.7 Invalidation du cache

Chaque Server Action d'écriture appelle `revalidateTag(tag, { expire: 0 })` :

| Écriture | Tags |
|---|---|
| Actualités | `actualites` |
| Événements | `evenements` |
| Membres | `membres`, `bureau` |
| Mandats, postes, commissions | `bureau`, `membres` |
| Partenaires | `partenaires` |
| Réglages | `reglages` |

Elle appelle aussi `revalidatePath` sur les pages de l'admin concernées. Le sitemap s'appuie sur les mêmes getters.

## 5. Composants

### 5.1 `EditeurRiche` (Tiptap)

- Barre d'outils : Paragraphe, Titre 2, Titre 3, Gras, Italique, Liste à puces, Liste numérotée, Citation, Lien, Annuler, Rétablir. Les autres extensions de StarterKit (code, bloc de code, titres 1 et 4–6, trait horizontal…) sont désactivées.
- Lien : saisi dans une petite boîte de dialogue ; seuls `http(s)` et `mailto` sont acceptés.
- Le collage depuis Word ou Google Docs est réduit au schéma de l'éditeur ; le nettoyage serveur (`nettoyerHtml`) reste la seule garantie.
- Le HTML est recopié à chaque modification dans un `<input type="hidden">` du formulaire.
- Accessibilité : zone d'édition libellée (`aria-labelledby`), boutons avec `aria-pressed` utilisables au clavier, erreurs reliées par `aria-describedby`.
- Chargement différé avec un squelette.

### 5.2 `ListeEditable<T>`

Composant client générique : liste d'éléments, chacun rendu par une fonction fournie par le formulaire, avec Ajouter, Retirer, ↑ / ↓. La valeur part en JSON dans un champ caché ; le schéma Zod côté serveur la parse et la valide. Utilisé pour les sources, vidéos, étapes de parcours, réalisations, réseaux, compétences.

### 5.3 `ChampMedia` et `GaleriePhotos`

Surcouches de `SelecteurMedia` : vignette et texte alternatif de chaque image choisie, Retirer, ↑ / ↓ (galerie). Les identifiants partent dans des champs cachés (`photos` en JSON, `afficheId`, `photoId`, `logoId`).

### 5.4 `SelecteurMedia` : corrections

- Le `<dialog>` est rendu dans un portail vers `document.body` : ses champs (recherche, envoi) ne font plus partie du formulaire hôte et ne le soumettent plus.
- Chaque recherche reçoit un numéro ; seule la réponse de la dernière recherche est prise en compte.

### 5.5 `BarrePublication`

Badge de statut, Enregistrer, Publier ou Dépublier, Aperçu (ouvre `/api/apercu` dans un nouvel onglet ; désactivé tant que le contenu n'a pas été créé), Supprimer (boîte de confirmation existante). Un avertissement `beforeunload` s'affiche si le formulaire a été modifié sans être enregistré.

## 6. Gestion des erreurs

- Même contrat que le sous-projet 1 : `{ ok: true, … }` ou `{ ok: false, erreurs: Record<champ, string[]>, message? }`. Les erreurs sont affichées sous les champs, avec un résumé en haut du formulaire. Une erreur de saisie ne lève jamais d'exception.
- Erreurs attendues traduites par `resultatDErreur` en messages clairs : slug ou nom en double, conflit de concurrence, suppression refusée (membre dans un mandat, mandat actif), activation d'un mandat sans poste, contenu introuvable.
- Un identifiant invalide (pas un uuid) donne « introuvable » sans requête.
- Une image référencée par un contenu reste non supprimable dans la médiathèque (contrôle existant).

## 7. Tests

- **Vitest (unitaires)** : schémas Zod de chaque contenu (HTML malveillant nettoyé, JSON imbriqué invalide, URL non `http(s)`, fin d'événement avant le début, clé de texte inconnue) ; `slugifier` ; fusion des textes avec leurs valeurs par défaut ; garde de l'aperçu (Draft Mode sans session → pas de brouillon).
- **Vitest + PGlite (opérations)** : créer, modifier, publier, dépublier (`publie_le` conservé) ; conflit `maj_le` ; slug en double ; réécriture ordonnée des photos ; activation d'un mandat (bascule, refus si vide) et reprise des commissions ; refus de suppression d'un membre présent dans un mandat et du mandat actif ; ordre des partenaires ; les getters publics ignorent brouillons et membres masqués.
- **Autorisation** : chaque nouvelle Server Action refuse l'appel sans session (même méthode que le test d'autorisation existant).
- **Playwright (bout en bout)** : créer une actualité en brouillon avec du gras et un lien → absente de `/actualites` → aperçu avec bandeau puis sortie → publier → visible sur le site → dépublier → supprimer ; masquer puis réafficher un partenaire ; modifier un texte des réglages puis le rétablir.
- **Base partagée avec la production** : les tests e2e ne créent que des contenus dont le slug ou le nom commence par `e2e-`, les suppriment dans `e2e/nettoyage.ts` (même en cas d'échec), ne touchent jamais au mandat actif ni aux contenus réels, et rétablissent tout réglage modifié. L'activation d'un mandat n'est testée que sur PGlite.
- **Non-régression** : `npm run build` réussit ; les pages publiques affichent le même contenu (les textes éditables non renseignés gardent leur valeur actuelle).

## 8. Découpage en lots

Chaque lot est livrable et fusionnable seul :

1. **Socle et actualités** : composants de champ, corrections de `SelecteurMedia`, Tiptap, Draft Mode et bandeau d'aperçu, CRUD complet des actualités.
2. **Événements et partenaires.**
3. **Membres et bureau** (mandats, postes, commissions).
4. **Réglages et textes du site.**

## 9. Reports du sous-projet 1 traités ici

- Tout HTML enregistré passe par `nettoyerHtml` (dans les schémas Zod).
- `SelecteurMedia` rend ses champs hors du formulaire hôte (portail).
- Résultats de recherche hors d'ordre dans le sélecteur.
- `revalidateTag(tag, { expire: 0 })` à chaque écriture.

Les reports « avant vrais utilisateurs » (limiteur Better Auth en base, `trustedOrigins` du domaine de production, restriction au store Blob, garde `E2E_AUTORISE`) restent hors de ce sous-projet.

## 10. Hors périmètre

Redirections des anciens slugs, SEO par contenu, journal d'activité, tableau de bord, contact et adhésions (sous-projet 3) ; espace membre, cotisations, inscriptions, newsletter, exports (sous-projet 4) ; publication programmée, historique des versions, glisser-déposer, historique public des bureaux.
