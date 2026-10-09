This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Administration (back office)

Le contenu du site est en base Postgres (Neon) et se gère sur `/admin`.

### Installation locale

1. `vercel link` puis `vercel env pull .env.local`. Il n'existe pour l'instant qu'une seule base Neon (celle créée par l'intégration Vercel) : le développement local l'utilise directement. Avant la mise en ligne, créer une branche Neon `dev` et pointer `DATABASE_URL` de `.env.local` dessus.
2. Dans `.env.local`, renseigner `BETTER_AUTH_URL` avec l'adresse du serveur local (voir `.env.example`), par exemple `http://localhost:3000`. Si le port 3000 est occupé, lancer `npx next dev -p 3100` et mettre `BETTER_AUTH_URL=http://localhost:3100` (les tests Playwright utilisent aussi le port 3100).
3. `npm run db:migrate` puis `npm run db:seed` (le seed n'écrase jamais une donnée existante).
4. `npm run admin:creer -- --email vous@exemple.sn --nom "Prénom Nom"` : crée un super-admin et affiche un mot de passe temporaire, à changer dans « Mon compte ».
5. `npm run dev` (ou `npx next dev -p 3100`), puis `/admin` sur ce serveur.

### Emails (Resend)

Resend n'est pas encore configuré (l'intégration de la Marketplace demande un domaine dont l'ADEMIG soit propriétaire). Sans `RESEND_API_KEY` :

- hors production, les liens d'invitation et de réinitialisation sont affichés dans le terminal du serveur de développement ;
- en production, l'envoi d'une invitation est refusé avec un message clair.

Pour l'activer : installer l'intégration Resend avec le domaine vérifié, puis renseigner `RESEND_API_KEY` et `EMAIL_EXPEDITEUR`.

### Commandes

| Commande | Rôle |
|---|---|
| `npm run db:generate` | Génère une migration après une modification de `src/db/schema.ts` |
| `npm run db:migrate` | Applique les migrations à la base de `DATABASE_URL` |
| `npm run db:seed` | Importe le contenu initial (`src/db/donnees-initiales/`) |
| `npm run admin:creer` | Crée un super-admin |
| `npm test` | Tests unitaires et d'intégration (PGlite, sans réseau) |
| `E2E_AUTORISE=1 npm run test:e2e` | Tests de bout en bout (port 3100, base de `DATABASE_URL`) ; refusés sans `E2E_AUTORISE=1` |

> Les tests e2e créent un super-administrateur (`*@ademig.test`, mot de passe aléatoire par lancement) dans la base de `DATABASE_URL`, puis le suppriment. À lancer uniquement contre une base de développement, jamais contre celle de la production.

### Mise en production

Le projet Vercel « ademig » est relié au dépôt GitHub : un push sur la branche de production déclenche le déploiement. Neon et Blob sont en région `fra1`.

Avant le premier déploiement :

- appliquer les migrations et le seed sur la base de production (`DATABASE_URL` de production), puis créer le premier super-admin ;
- à faire : définir `BETTER_AUTH_SECRET` pour l'environnement Preview dans Vercel (il l'est pour Production et Development ; la CLI ne permet pas de le faire pour Preview) ;
- vérifier un domaine dans Resend et renseigner `RESEND_API_KEY` et `EMAIL_EXPEDITEUR`.
