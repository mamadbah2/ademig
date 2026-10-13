# ADEMIG — Espace membre, cotisations et trésorerie

Date : 13/10/2026 · Statut : validé en conversation, spec à relire

## 1. Contexte et objectif

Le site public et le back office (sous-projets 1 et 2) sont en production : Neon + Drizzle, Better Auth (rôles `superadmin`, `editeur`), `/admin`, médiathèque Vercel Blob, fiches `membres`, réglages éditables. Voir `docs/superpowers/specs/2026-10-08-back-office-fondations-design.md` et `2026-10-09-back-office-contenus-design.md`.

Le bureau veut que le site devienne aussi la plateforme de gestion de l'amicale. L'administration du site ne change pas. Les quelque 500 membres reçoivent un compte et accèdent à un espace membre : profil, cotisation mensuelle, dons libres, annuaire privé, carte de membre. Le trésorier suit les encaissements depuis l'admin.

Ce document remplace la ligne « Sous-projet 4 : espace membre, cotisations… » de la feuille de route.

### Critères de réussite

- Un admin importe la liste des membres (CSV) et les invitations partent automatiquement, sans dépasser le quota Gmail.
- Un membre active son compte avec le lien reçu, met à jour son profil (photo, présentation, LinkedIn) et choisit la visibilité de sa fiche.
- Un membre paie 1, 3, 6 ou 12 mois de cotisation, ou tout son retard, par Wave ou Orange Money via NabooPay, et son statut se met à jour sans intervention humaine.
- Un membre peut faire un don libre à tout moment.
- Une cotisation n'est jamais marquée payée sans confirmation de NabooPay (webhook signé ou lecture serveur), et un mois n'est jamais payé deux fois.
- Le trésorier voit qui est à jour, enregistre les paiements hors ligne et exporte les données.

## 2. Décisions

| Sujet | Décision |
|---|---|
| Architecture | Tout dans le site actuel (même base, même Better Auth, nouvelles routes). Pas d'application séparée. |
| Rôles | `superadmin` et `editeur` inchangés ; ajout de `tresorier` (admin limité à la trésorerie) et de `membre` (pas d'accès à l'admin). L'accès à l'espace membre dépend du rattachement à une fiche, pas du rôle. |
| Création des comptes | Import CSV par un admin (nom, prénom, email ; téléphone, promotion, spécialité facultatifs), avec aperçu des erreurs et des doublons avant confirmation. Pas d'inscription publique. |
| Invitations | Jeton à usage unique, valable 30 jours, envoyé par Gmail SMTP (mot de passe d'application) via nodemailer. Resend reste possible : une variable choisit le fournisseur. |
| Quota Gmail | File d'envoi : 150 emails au plus par jour, une pause d'une seconde entre deux envois. |
| Début des cotisations | Le mois d'activation du compte de chaque membre. |
| Modèle de paiement | Le membre choisit le nombre de mois (pas de prélèvement automatique, impossible avec Wave ou Orange Money). Un paiement couvre d'abord les mois impayés les plus anciens. |
| Paiements hors ligne | Saisie manuelle par le trésorier (espèces, virement, Wave direct). Jamais supprimés : annulation tracée. |
| Agrégateur | NabooPay API v2 (Wave, Orange Money). Voir `.claude/skills/naboopay/`. |
| Frais | À la charge du membre (`fees_customer_side: true`), pour les cotisations et les dons. |
| Montant de la cotisation | Réglé dans l'admin, avec un historique et une date d'effet ; un mois est facturé au tarif en vigueur ce mois-là. Jamais affiché sur le site public. |
| Remboursements | Hors interface : faits dans le tableau de bord NabooPay, puis annulation tracée sur le site. |
| Reçus | Page HTML imprimable (PDF par le navigateur), pas de génération de PDF côté serveur. |

## 3. Comptes, rôles et activation (lot 1)

### 3.1 Rôles

`src/lib/roles.ts` reçoit `tresorier` et `membre`. La fonction `aLeRole` reste vraie pour le super-admin, quel que soit le rôle demandé. Les droits :

| Zone | superadmin | editeur | tresorier | membre |
|---|---|---|---|---|
| Contenus du site (`/admin/actualites`, …) | oui | oui | non | non |
| Comptes, import des membres, invitations | oui | non | non | non |
| Trésorerie (`/admin/tresorerie`) | oui | non | oui | non |
| Espace membre (`/espace-membre`) | si rattaché à une fiche | idem | idem | idem |

La navigation de l'admin n'affiche que les rubriques permises. Un compte `membre` qui ouvre `/admin` est redirigé vers `/espace-membre`.

### 3.2 Rattachement compte et fiche

La table `membres` gagne ces colonnes (migration additive) :

- `user_id` : unique, nullable, `references user.id on delete set null` ;
- `email_contact`, `telephone` : privés, jamais affichés publiquement ;
- `visibilite` : `publique` | `membres` | `masquee`. Elle remplace l'usage public de `visible` : la migration convertit `visible = true` en `publique` et `false` en `masquee`, et les pages publiques lisent `visibilite = 'publique'`. La colonne `visible` est supprimée seulement dans une migration ultérieure ;
- `active_le` : date d'activation du compte, qui sert de point de départ aux cotisations ;
- `numero_membre` : entier unique attribué à l'activation.

Les fiches importées sont créées en `membres`. Les 11 fiches du bureau existantes sont rattachées à leur compte par l'import (même email) ou par un bouton « Lier à un compte » dans l'admin.

### 3.3 Import CSV — `/admin/membres/importer` (superadmin)

1. Téléversement d'un fichier CSV encodé en UTF-8. Les séparateurs `,` et `;` sont acceptés, car Excel en français exporte en `;`. Taille maximale : 1 Mo.
2. Analyse sans écriture en base. L'aperçu classe chaque ligne : valide, email invalide, champ obligatoire manquant, doublon dans le fichier, email déjà en base. Dans ce dernier cas, la ligne est « à rattacher » si la fiche existe sans compte, et « ignorée » sinon.
3. Confirmation. En une transaction : création des fiches (slug unique tiré du nom) et des comptes `user` (rôle `membre`, `actif = false`, sans mot de passe), et création des invitations en statut `a_envoyer`.

Un modèle de CSV est téléchargeable sur la page.

### 3.4 Invitations et file d'envoi

La table `invitations` contient : `id`, `user_id`, `jeton_hash` (SHA-256), `expire_le` (30 jours), `utilisee_le`, `cree_le`.

La table `emails_file` contient : `id`, `destinataire`, `sujet`, `html`, `type` (`invitation` | `rappel` | `systeme`), `statut` (`a_envoyer` | `envoye` | `echec`), `tentatives`, `erreur`, `envoye_le`, `cree_le`.

- Le jeton en clair n'existe qu'au moment de construire l'email (ou le lien copiable) ; la base ne garde que le hash. « Renvoyer » et « Copier le lien » génèrent un nouveau jeton et invalident l'ancien.
- Le cron quotidien `/api/cron/quotidien` est protégé par `CRON_SECRET`. Il envoie au maximum `EMAILS_PAR_JOUR` emails (150 par défaut), par ordre de création, avec une pause d'une seconde entre deux envois. Un email en échec est retenté jusqu'à 3 fois.
- Les emails de mot de passe oublié de Better Auth passent par l'envoi direct, pas par la file : ils sont urgents et rares.
- Le module `src/lib/emails.ts` reçoit l'abstraction `envoyerEmail({ a, sujet, html })`, qui utilise Gmail si `GMAIL_USER` et `GMAIL_APP_PASSWORD` sont définies, Resend sinon. En développement, l'email s'affiche dans le terminal.
- L'écran de suivi, `/admin/membres` (colonne et filtre « Compte »), montre l'état de chaque compte : à inviter, invité le …, activé le …, échec (avec le message). Il propose les actions « Renvoyer », « Copier le lien » et « Désactiver ».

### 3.5 Activation — `/espace-membre/activer?jeton=…`

La page vérifie le jeton (hash, non expiré, non utilisé). Le membre choisit son mot de passe (12 caractères minimum, comme aujourd'hui). En une transaction :

- création du compte `credential` Better Auth (hash avec la fonction de Better Auth) ;
- passage de `actif` à `true` ;
- `active_le = now()` et attribution du numéro de membre ;
- marquage de l'invitation comme utilisée.

Puis la page connecte le membre et le redirige vers `/espace-membre`. Un jeton invalide ou expiré affiche « Lien expiré : demandez-en un nouveau au bureau », avec le lien de contact.

La connexion des membres se fait par `/connexion`, une page publique au design du site. `/admin/connexion` reste en place. Les deux pages redirigent selon le rôle.

## 4. Espace membre (lots 1 et 2)

Les routes sont dans `src/app/(membre)/espace-membre/`. Le proxy protège `/espace-membre/:path*` sauf `/espace-membre/activer`. La garde serveur `exigerMembre()` renvoie la session et la fiche rattachée ; sans fiche rattachée, la page affiche un message d'erreur et le lien de contact.

### 4.1 Accueil

- Carte de statut : « À jour jusqu'à <mois année> » ou « <N> mois de retard · <montant> FCFA ». Le second cas n'existe qu'à partir du lot 2 ; au lot 1, la carte invite à compléter le profil.
- Boutons « Cotiser » et « Faire un don » (lot 2).
- Les 5 derniers paiements (lot 2).

### 4.2 Profil

Le membre peut modifier :

- la photo (Blob, recadrée en carré côté client, 5 Mo maximum, JPEG, PNG ou WebP) ;
- la présentation (500 caractères maximum, texte brut) ;
- LinkedIn : uniquement `https://(www.)linkedin.com/in/<identifiant>` ;
- la promotion, la spécialité, l'entreprise, la ville et le téléphone ;
- la visibilité.

Il ne peut modifier ni le nom ni l'email : ce sont les admins qui les changent.

Une Server Action ne modifie que la fiche rattachée à la session. Elle ignore tout identifiant envoyé par le client et invalide le tag des membres pour mettre à jour l'annuaire public.

### 4.3 Annuaire privé — `/espace-membre/annuaire`

Il liste les fiches `membres` et `publique` des comptes actifs : photo, nom, promotion, spécialité, entreprise, ville, LinkedIn. On peut chercher par nom ou entreprise et filtrer par promotion et par spécialité, avec 24 fiches par page.

Le téléphone, l'email et le statut de cotisation n'apparaissent jamais dans l'annuaire.

### 4.4 Mot de passe

Le membre peut changer son mot de passe depuis son espace et le réinitialiser depuis `/connexion` (flux Better Auth existant).

## 5. Cotisations et dons (lot 2)

### 5.1 Données

- `tarifs_cotisation` : `id`, `montant` (entier, FCFA), `effet_le` (premier jour d'un mois), `cree_par`, `cree_le`. Le tarif d'un mois est la ligne dont `effet_le` est le plus récent sans dépasser ce mois.
- `paiements` : `id`, `reference` (8 caractères alphanumériques, unique, utilisée dans les URL de retour), `membre_id`, `type` (`cotisation` | `don`), `source` (`naboopay` | `manuel`), `montant` (ce que reçoit l'amicale, hors frais), `frais`, `nb_mois`, `statut` (`en_attente` | `paye` | `annule` | `echec`), `order_id` (unique, nullable), `moyen` (`wave` | `orange_money` | `especes` | `virement` | `autre`), `message`, `anonyme`, `paye_le`, `saisi_par`, `annule_par`, `annule_le`, `motif_annulation`, `cree_le`.
- `cotisation_mois` : `membre_id`, `mois` (date, premier jour du mois), `paiement_id`, `montant`. La clé primaire est `(membre_id, mois)`.
- `journal_paiements` : enregistre la réception de chaque webhook (`order_id`, statut reçu, résultat du traitement, date). Il ne contient pas le corps complet, qui renferme le téléphone du client.

### 5.2 Calcul

Les fonctions sont pures et testées :

- `moisDus(activeLe, aujourdhui)` : liste des mois depuis le mois d'activation jusqu'au mois en cours inclus.
- `etatCotisation(membre, moisPayes, tarifs, aujourdhui)` renvoie `{ aJourJusqua, moisEnRetard, montantRetard }`.
- `moisAAffecter(moisPayes, activeLe, n, aujourdhui)` renvoie les `n` premiers mois non payés à partir du mois d'activation. Ce sont d'abord les mois en retard, puis les mois futurs.
- `montantPour(mois[], tarifs)` additionne le tarif de chaque mois.

Le membre peut choisir 1, 3, 6 ou 12 mois, ou « régulariser » (le nombre de mois en retard, proposé seulement s'il y a du retard). Il ne peut pas payer plus de 24 mois à l'avance.

### 5.3 Parcours NabooPay

1. Server Action `demarrerPaiement({ type, nbMois | montant, message, anonyme })` :
   - elle calcule le montant côté serveur et ne fait jamais confiance au client ;
   - elle crée un `paiement` en statut `en_attente` ;
   - elle appelle `POST /api/v2/transactions` avec :
     - `method_of_payment: ["wave", "orange_money"]` ;
     - un seul produit (« Cotisation ADEMIG — N mois » ou « Don à l'ADEMIG », prix = montant, quantité 1) ;
     - `customer` (prénom, nom, téléphone s'il est connu) ;
     - `fees_customer_side: true` ;
     - `success_url` et `error_url` = `<site>/espace-membre/paiement/<reference>`.
   - elle enregistre l'`order_id` puis redirige vers `checkout_url`.

   En cas d'erreur NabooPay, le paiement passe en `echec`, le membre voit un message clair et l'erreur d'origine est journalisée. Un `403` lié au plafond mensuel donne le message « Paiement en ligne momentanément indisponible ».
2. Webhook `POST /api/naboopay/webhook` (route handler, runtime Node) :
   - il lit le corps brut et vérifie `X-Signature` (HMAC-SHA256 hexadécimal, `NABOOPAY_WEBHOOK_SECRET`, comparaison en temps constant). En cas d'échec, il renvoie 401 ;
   - il retrouve le paiement par `order_id`. S'il est inconnu, il renvoie 200 et journalise ;
   - il confirme par `GET /transactions/{order_id}`. Si le statut est `paid` ou `paid_and_blocked`, il appelle `confirmerPaiement` ;
   - il répond 200 rapidement.
3. `confirmerPaiement(paiementId, { frais, moyen, payeLe })` s'exécute en une transaction, avec un verrou de ligne sur le paiement :
   - si le paiement est déjà `paye`, la fonction ne fait rien (idempotence) ;
   - sinon, le paiement passe à `paye` ;
   - pour une cotisation, la fonction verrouille les mois du membre, affecte `nb_mois` mois avec `moisAAffecter` et insère les lignes de `cotisation_mois`. Si un autre paiement a pris certains mois entre-temps, celui-ci reçoit les mois suivants : l'argent est encaissé, il n'est jamais perdu. Le montant affecté à chaque mois est le tarif de ce mois ; la différence éventuelle avec le montant payé, en cas de changement de tarif entre la création et la confirmation, est conservée sur le paiement.
4. Page de retour `/espace-membre/paiement/<reference>` :
   - elle n'est visible que par le membre propriétaire du paiement ;
   - si le statut est `en_attente`, elle interroge NabooPay une fois et confirme le paiement si besoin ;
   - elle affiche « Merci, paiement reçu » avec les mois couverts, « En attente de confirmation » avec un rafraîchissement automatique toutes les 5 secondes pendant une minute, ou « Paiement non abouti » avec un bouton « Réessayer ».
5. Rattrapage par le cron quotidien. Pour chaque paiement `en_attente` de plus de 15 minutes :
   - lecture du statut chez NabooPay ;
   - si le statut est `paid`, confirmation du paiement ;
   - si le statut est `cancelled`, ou toujours `pending` après 48 h, le paiement passe à `echec`. Dans le second cas, la transaction est aussi annulée par `DELETE`.

### 5.4 Dons

Le montant est libre, de 500 à 5 000 000 FCFA. Le membre peut ajouter un message (300 caractères maximum) et cocher « anonyme ». Le parcours est le même que pour une cotisation, sans lignes de mois. Les dons sont réservés aux membres connectés dans ce lot.

### 5.5 Saisie manuelle et annulation (trésorier)

- « Enregistrer un paiement » depuis la fiche d'un membre : type, nombre de mois ou montant, moyen, date, note. Cela crée un paiement directement `paye` (`source = manuel`, `saisi_par`) et l'affectation des mois passe par la même fonction.
- « Annuler » sur un paiement `paye` : le motif est obligatoire. Le paiement passe à `annule` avec l'auteur et la date, et ses lignes de `cotisation_mois` sont supprimées. Il n'existe aucune suppression physique.

### 5.6 Historique et reçus

`/espace-membre/paiements` liste les paiements du membre (date, type, mois couverts, montant, moyen, statut). Chaque paiement `paye` a un reçu (`/espace-membre/paiements/<reference>/recu`) :

- une page imprimable au design sobre du logo ;
- contenu : numéro de reçu (= référence), membre, numéro de membre, objet, période couverte, montant, frais, moyen, date ;
- une feuille de style `@media print`.

## 6. Trésorerie, carte et rappels (lot 3)

### 6.1 `/admin/tresorerie` (tresorier, superadmin)

- **Indicateurs** : encaissé le mois en cours et l'année en cours, part des membres activés qui sont à jour, total des retards, dons de l'année. Graphique des 12 derniers mois avec `graphiques.tsx`.
- **Membres** : statut (à jour jusqu'à …, N mois de retard, jamais activé), filtres (statut, promotion) et recherche. La fiche d'un membre donne son historique, l'action de saisie manuelle et l'action d'annulation.
- **Paiements** : journal filtrable (période, type, source, statut), avec l'`order_id` et l'action « Revérifier auprès de NabooPay » sur un paiement en attente.
- **Exports CSV** (séparateur `;`, BOM UTF-8 pour Excel) : paiements d'une période, et état des cotisations par membre.
- **Réglages** : historique des tarifs et ajout d'un tarif avec sa date d'effet (premier jour d'un mois à venir ou du mois en cours), plus l'interrupteur des rappels.

### 6.2 Rappels

Le 5 du mois, le cron quotidien met en file un rappel pour chaque membre activé qui a au moins un mois de retard. Le rappel indique le nombre de mois et contient un lien vers « Cotiser ». Il part au plus une fois par mois et par membre, et le trésorier peut désactiver les rappels.

### 6.3 Carte de membre — `/espace-membre/carte`

La carte, au format portrait mobile, reprend les couleurs du logo et affiche la photo, le nom, la promotion, le numéro de membre et un QR code. Le QR code est généré côté serveur en SVG, avec une petite bibliothèque comme `qrcode`.

Il pointe vers `/verifier/<jeton>` (colonne `jeton_carte`, aléatoire de 16 caractères, régénérable). Cette page publique, en `noindex`, affiche seulement la photo, le nom et « Membre à jour ✓ » ou « Cotisation non à jour ». Elle n'affiche aucun montant. Si le jeton est inconnu, elle renvoie 404.

## 7. Configuration

Les variables d'environnement sont configurées sur Vercel en Production et en Preview, et leurs noms figurent dans `.env.example` sans valeur :

- `GMAIL_USER`, `GMAIL_APP_PASSWORD` : adresse Gmail dédiée à l'amicale, recommandée plutôt qu'un compte personnel ;
- `EMAILS_PAR_JOUR` (150 par défaut) ;
- `NABOOPAY_API_KEY` : portées `checkout` et `read` (pas de `payout`) ;
- `NABOOPAY_WEBHOOK_SECRET` ;
- `CRON_SECRET`.

Le cron Vercel est déclaré dans `vercel.json` : `/api/cron/quotidien`, une fois par jour, à 8 h UTC. La durée maximale de la route est de 300 s.

Le webhook NabooPay se déclare dans platform.naboopay.com, sous Paramètres → Intégration : `https://<domaine>/api/naboopay/webhook`.

Démarches côté ADEMIG (hors code, à lancer tout de suite) :

- compte marchand NabooPay au nom de l'amicale ;
- **vérification KYB**, car sans elle le compte est plafonné à 200 000 FCFA par mois ;
- adresse Gmail dédiée avec la validation en deux étapes et un mot de passe d'application.

## 8. Sécurité

- Chaque page et chaque Server Action vérifie la session, le rôle et, pour un membre, la propriété de la donnée. Le proxy n'est qu'une commodité.
- Les secrets ne sont jamais dans le dépôt, qui est public, ni dans le code client.
- Les jetons d'invitation et de carte sont générés par `crypto.randomBytes` ; les jetons d'invitation sont stockés hachés.
- Le webhook est vérifié sur le corps brut. Le montant est toujours recalculé côté serveur.
- Les pages `/espace-membre/*`, `/connexion` et `/verifier/*` sont en `noindex` et exclues du sitemap.
- Les CSV importés sont lus côté serveur, sans formule exécutée. À l'export, les cellules qui commencent par `=`, `+`, `-` ou `@` sont préfixées d'une apostrophe, contre l'injection de formules.

## 9. Tests

- **Vitest et PGlite** :
  - calculs de cotisation (mois dus, affectation, changement de tarif, changement d'année) ;
  - `confirmerPaiement` (idempotence, concurrence entre deux paiements, mois décalés) ;
  - annulation ;
  - analyse du CSV (séparateurs, doublons, BOM) ;
  - jetons d'invitation (expiration, réutilisation) ;
  - garde des rôles ;
  - vérification HMAC sur un corps brut ;
  - client NabooPay avec un `fetch` simulé (succès, 400, 403 plafond, 5xx) ;
  - file d'envoi (quota, tentatives).
- **E2E Playwright**, sur des données préfixées `e2e-` et nettoyées :
  - activation par un lien ;
  - modification du profil ;
  - annuaire ;
  - paiement avec NabooPay simulé : la variable `NABOOPAY_FAUX=1` remplace le client par un faux, et une route de test simule le webhook ; ces deux mécanismes sont refusés en production.
- **Aucun paiement réel en test automatique.** Un test manuel en prod avec un paiement de 100 FCFA, remboursé ensuite depuis le tableau de bord NabooPay, figure dans la checklist du lot 2.

## 10. Lots et livraison

Chaque lot suit le process habituel :

1. plan (`docs/superpowers/plans/2026-10-13-espace-membre-lotN.md`) relu par l'utilisateur ;
2. exécution par sous-agents ;
3. revue finale ;
4. PR, preview Vercel, fusion dans `main` par Claude si tout est vert (autorisé par l'utilisateur), ce qui met la prod à jour.

| Lot | Contenu | Prérequis externes |
|---|---|---|
| 1. Comptes et profil | Rôles, migration des fiches, import CSV, invitations et file Gmail, cron, activation, `/connexion`, espace membre (accueil, profil, mot de passe), annuaire privé | Adresse Gmail et mot de passe d'application |
| 2. Paiements | Tarifs, cotisations, dons, client NabooPay, webhook, page de retour, rattrapage, saisie manuelle et annulation, historique et reçus | Clé API et secret du webhook NabooPay |
| 3. Trésorerie | Tableau de bord, exports, rappels, carte et QR code, page de vérification | — |

Le lot 3 peut avancer en parallèle du lot 2 si la clé NabooPay tarde, en travaillant avec le faux client.

## 11. Hors périmètre (plus tard)

Dons de non-membres, offres d'emploi et de stages, inscriptions aux événements, newsletter et annonces internes, votes en assemblée générale, application mobile, prélèvement automatique, remboursements depuis l'interface, export comptable avancé.
