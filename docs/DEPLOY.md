# Déploiement - CyberLearn (web + admin)

## Prérequis

- Repo pushé sur GitHub (`git@github.com:xoudev/cyberlearn-revamp.git`)
- Accès au dashboard Supabase (pour les URLs de callback)
- Clés API : Resend (obligatoire), Upstash, Sentry (optionnelles)

---

## 1. Push le code

```sh
git add -A
git commit -m "feat: ..."
git push origin main
```

---

## 2. Créer les projets sur Vercel

Le repo porte **deux** apps Next.js, donc **deux** projets Vercel sur le même
dépôt : `cyberlearn-web` (cyberlearn.fr) et `cyberlearn-admin`
(admin.cyberlearn.fr).

1. Va sur **vercel.com/new**
2. **Import Git Repository** → sélectionne `xoudev/cyberlearn-revamp`
3. Répète l'import pour le second projet

---

## 3. Configurer chaque projet (CRITIQUE - monorepo)

| Champ | Projet web | Projet admin |
|-------|------------|--------------|
| Framework Preset | Next.js | Next.js |
| Root Directory | *(laisser vide - racine du repo)* | *(laisser vide)* |
| Build Command | `pnpm turbo run build --filter=@cyberlearn/web` | `pnpm turbo run build --filter=@cyberlearn/admin` |
| Output Directory | `apps/web/.next` | `apps/admin/.next` |
| Install Command | `pnpm install` | `pnpm install` |

> Turbo gère automatiquement l'ordre de build : `packages/lib` est compilé avant `apps/web` grâce à `"dependsOn": ["^build"]` dans `turbo.json`.

Chaque app porte son propre `vercel.json` (région `cdg1`). Celui de `apps/web`
déclare aussi les crons — voir « Crons » plus bas.

---

## 4. Variables d'environnement

La liste qui fait foi est `apps/web/lib/env.ts` et `apps/admin/lib/env.ts` :
elles sont validées par Zod au build **et** au démarrage, et l'app refuse de
démarrer si une variable obligatoire manque. `.env.example` les commente une par
une. Le tableau ci-dessous dit seulement laquelle va dans quel projet Vercel.

Obligatoire = l'app ne démarre pas sans.

| Variable | Web | Admin | Obligatoire | Où la trouver |
|---|:-:|:-:|:-:|---|
| `DATABASE_URL` | ✅ | ✅ | ✅ | Supabase → Settings → Database → URI (Transaction mode / PgBouncer) |
| `DIRECT_URL` | ✅ | ✅ | ✅ | Supabase → Settings → Database → URI (Direct) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | ✅ | ✅ | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | ✅ | ✅ | Supabase → Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ✅ | ✅ | Supabase → Settings → API → service_role (⚠️ secret) |
| `SUPABASE_HOOK_SECRET` | ✅ | — | ✅ | Supabase → Auth Hooks → secret du hook « Send email » (≥ 16 car.) |
| `NEXT_PUBLIC_SITE_URL` | ✅ | ✅ | ✅ | ex. `https://cyberlearn.fr` |
| `NEXT_PUBLIC_ADMIN_URL` | ✅ | ✅ | ✅ | ex. `https://admin.cyberlearn.fr` ; le site s'en sert pour laisser la console encadrer l'aperçu de l'éditeur de leçons (`/preview/<jeton>`). Absente, ou laissée à `http://localhost:3001`, le site prend `admin.` devant son propre hôte |
| `NEXT_PUBLIC_CANONICAL_URL` | ✅ | — | — | Hôte canonique pour les métadonnées ; défaut `https://cyberlearn.fr` |
| `RESEND_API_KEY` | ✅ | ✅ | ✅ | resend.com/api-keys (préfixe `re_`) |
| `RESEND_FROM_EMAIL` | ✅ | ✅ | ✅ | ex. `noreply@cyberlearn.fr` (domaine vérifié dans Resend) |
| `IP_SALT` | ✅ | ✅ | ✅ | `openssl rand -hex 32` (≥ 32 car.) |
| `CRON_SECRET` | ✅ | — | — | `openssl rand -hex 32` ; requis dès qu'un cron tourne |
| `UPSTASH_REDIS_REST_URL` | ✅ | ✅ | — | upstash.com → Your DB → REST API ; sans elle le rate limiting est fail-open |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | ✅ | — | idem |
| `NEXT_PUBLIC_ANDROID_PLAY_URL` | ✅ | — | — | Lien Play Store, pour la page `/download` |
| `NEXT_PUBLIC_ANDROID_APK_URL` | ✅ | — | — | Lien APK direct |
| `NEXT_PUBLIC_IOS_APP_STORE_URL` | ✅ | — | — | Lien App Store |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | ✅ | — | — | dash.cloudflare.com → Turnstile (vérification serveur pas encore branchée) |
| `TURNSTILE_SECRET_KEY` | ✅ | — | — | idem (⚠️ secret) |
| `NEXT_PUBLIC_SENTRY_DSN` | ✅ | ✅ | — | sentry.io → Settings → Client Keys ; absente = Sentry désactivé |
| `SENTRY_DSN` | ✅ | ✅ | — | Même DSN, côté serveur |
| `SENTRY_AUTH_TOKEN` | ✅ | ✅ | — | Upload des source maps au build |
| `SENTRY_ORG` / `SENTRY_PROJECT` | ✅ | ✅ | — | Slugs, pour l'upload et la liste d'issues de la console |
| `SENTRY_ISSUES_TOKEN` | — | ✅ | — | Jeton **utilisateur** avec `event:read`, pour la carte Sentry du dashboard admin |
| `NEXT_PUBLIC_SENTRY_CSP_REPORT_URI` | ✅ | ✅ | — | Endpoint de report des violations CSP |

---

## 5. Deploy

Clique **Deploy**. Le premier build prend ~3-4 min.

---

## 6. Après le premier déploiement

### Supabase - URLs de callback (obligatoire)

Dans **Supabase → Authentication → URL Configuration** :

```
Site URL:       https://ton-app.vercel.app
Redirect URLs:  https://ton-app.vercel.app/auth/callback
```

Sans ça, la confirmation d'inscription, la réinitialisation de mot de passe et
le GitHub OAuth ne fonctionneront pas en prod. Le détail des réglages Supabase
(providers, MFA, allow-list de redirections) est dans
[docs/authentication.md](authentication.md).

### Domaine custom (optionnel)

Dans **Vercel → Settings → Domains**, ajoute ton domaine et configure les DNS chez ton registrar.
Pense à mettre à jour `NEXT_PUBLIC_SITE_URL` avec le vrai domaine.

---

## Base de données - migrations & RLS

Le schéma **et** les policies RLS s'appliquent par la même commande :

```sh
pnpm --filter @cyberlearn/db db:migrate:prod   # prisma migrate deploy (via DIRECT_URL)
```

**Elle tourne déjà toute seule.** Le workflow `.github/workflows/migrate.yml`
l'exécute sur chaque push sur `main` qui touche
`packages/db/prisma/migrations/**`, depuis l'environnement GitHub `production`
(approbation manuelle possible sous Settings → Environments). Il utilise le
secret `DIRECT_URL` — la connexion directe, port 5432, pas le pooler — et
affiche `prisma migrate status` à la fin. Concurrence sérialisée, run en file
jamais annulé.

La commande ci-dessus reste là pour une application manuelle : rattrapage après
un run en échec, ou `workflow_dispatch` indisponible. Ne pas la lancer pendant
qu'un run est en cours.

Depuis la migration `20260610200000_rls_baseline`, les 56 policies + le helper
`current_user_role()` font partie de la chaîne de migrations Prisma : plus
**aucune** étape psql manuelle après le deploy. Règle pour la suite : toute
migration qui crée une table active la RLS et pose ses policies **dans le même
fichier de migration** (pattern `DROP POLICY IF EXISTS` + `CREATE POLICY`).

### Vérification après deploy (Supabase Studio → SQL Editor)

```sql
-- 1. Aucune table public exposée (hors _prisma_migrations, table interne Prisma)
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND NOT rowsecurity
  AND tablename NOT IN ('_prisma_migrations');
-- attendu : 0 ligne

-- 2. Compte de policies (>= 56, la baseline)
SELECT count(*) FROM pg_policies WHERE schemaname = 'public';
```

Le Security Advisor (**Database → Advisors**) doit rester muet sur
`rls_disabled_in_public`. Le job CI « Integration » prouve la même chose sur
base fraîche à chaque PR (step « Assert RLS coverage »).

### Si la migration échoue (P3018)

La baseline est transactionnelle (`BEGIN`/`COMMIT` explicites) : en cas d'échec
(ex. `lock_timeout` derrière une requête longue), rollback complet, aucun état
intermédiaire - la RLS existante reste en place. Débloquer puis rejouer :

```sh
pnpm --filter @cyberlearn/db exec prisma migrate resolve --rolled-back 20260610200000_rls_baseline
pnpm --filter @cyberlearn/db db:migrate:prod
```

NB : la baseline est idempotente et s'exécute « pour de vrai » sur la prod
existante (qui portait déjà les policies posées à la main) - elle re-pose le
même état, en une transaction.

---

## Ce qui part tout seul sur un merge

Trois choses suivent `main`, par trois chemins différents. Elles ont toutes été
ajoutées après un incident où le dépôt et la production avaient divergé sans
que rien ne le signale.

| Quoi | Déclencheur | Par |
|---|---|---|
| Le code des deux apps | push sur `main` | Intégration git de Vercel |
| Les migrations Prisma | push sur `main` touchant `packages/db/prisma/migrations/**` | `.github/workflows/migrate.yml` |
| Les Edge Functions Supabase | push sur `main` touchant `supabase/functions/**` ou `supabase/config.toml` | `.github/workflows/deploy-functions.yml` |

Les migrations **courent** contre le build Vercel, elles ne le bloquent pas :
les deux partent du même push, `migrate deploy` prend des secondes et un build
Next.js des minutes, donc en pratique le schéma est prêt avant le code — mais
c'est une propriété de timing, pas une garantie. Le commentaire en tête de
`migrate.yml` explique ce qu'il faudrait pour vraiment séquencer.

Le déploiement des functions vérifie ensuite que le hook
`custom-access-token` est bien listé **et** que `verify_jwt` est resté à
`false` : GoTrue signe son appel en webhook Standard Webhooks, pas avec un JWT
utilisateur, donc exiger un JWT rejetterait chaque connexion. Le réglage vit
dans `supabase/config.toml`.

Les PRs créent des **preview deployments** avec leur propre URL. Elles ne
déclenchent ni migration ni déploiement de function.

## Crons

`apps/web/vercel.json` déclare trois crons Vercel :

| Chemin | Cadence |
|---|---|
| `/api/cron/streak-reset` | `0 0 * * *` |
| `/api/cron/review-reminders` | `0 8 * * *` |
| `/api/cron/season-rollover` | `0 1 * * *` |

Un quatrième, `/api/cron/keep-alive`, est appelé depuis l'extérieur toutes les
6 h pour empêcher Supabase Free de mettre la base en pause — voir
[docs/infra/keep-alive.md](infra/keep-alive.md).

Tous lisent `Authorization: Bearer $CRON_SECRET`.

---

## Scripts lancés à la main

Certains scripts de `packages/db` ne partent ni sur un merge ni par un cron :
on les lance à la main, depuis un poste qui a la `DATABASE_URL` de la
production. Ils sont en mode d'essai par défaut (ils comptent et n'écrivent
rien), n'écrivent qu'avec `--apply`, et une deuxième passe lancée aussitôt
après ne change rien.

| Commande | Ce qu'elle fait |
|---|---|
| `db:backfill-badge-xp` | Crédite l'XP des badges gagnés avant que les badges en rapportent |
| `db:backfill-daily-streaks` | Reconstruit les jours d'activité et la plus longue série depuis les leçons terminées |
| `db:backfill-review-cards` | Convertit l'ancienne file de révisions (SM-2), gardée dans `review_schedules_legacy`, en cartes du rappel du jour ; à lancer avant la version qui supprime cette table, voir ci-dessous |

### Conversion des révisions : `db:backfill-review-cards`

```sh
pnpm --filter @cyberlearn/db db:backfill-review-cards             # essai : les comptes, rien n'est écrit
pnpm --filter @cyberlearn/db db:backfill-review-cards --verbose   # les mêmes, par apprenant et par leçon
pnpm --filter @cyberlearn/db db:backfill-review-cards --apply     # écrit les cartes
```

**Quand :** l'ancienne file est retirée du site et de l'app (migration
`20261018120000_retire_review_schedules`). Plus rien n'y ajoute de ligne :
celles qui restent attendent leur conversion dans `review_schedules_legacy`,
la table renommée, lue par ce seul script et fermée à tout client. **Cette
table est supprimée dans une version ultérieure, une fois la conversion
passée en production** : lancer `--apply` avant de déployer cette version,
sans quoi les lignes non converties partent avec elle. Une passe lancée après
la première n'écrit rien.

Chaque ligne de `review_schedules_legacy` (un apprenant, une leçon) devient :

- rien si l'apprenant n'a plus la leçon terminée : sa progression a été remise
  à zéro depuis (tout le compte, ou la leçon depuis la console), et ni l'une
  ni l'autre ne touche plus l'ancienne file ;
- rien pour un bilan de module, un projet, une leçon de classe ou une leçon
  sans quiz, comme à la fin d'une leçon ;
- rien non plus si l'apprenant a déjà une carte pour la leçon, retirée ou non
  (leçon terminée depuis l'arrivée des cartes, ou passage précédent) ;
- avec les réponses au quiz enregistrées (depuis le 24 septembre 2026) : les
  cartes que la fin de leçon met en file, les questions ratées en boîte 1 et la
  dernière réussie en boîte 3. Une réponse à une question retirée de la leçon
  ne compte pas (les questions sont relues dans le MDX actuel) ;
- sans réponse enregistrée : une carte, la dernière question de la leçon, dans
  la boîte que l'intervalle SM-2 avait atteinte (1, 3, 7 puis 21 jours), pour
  que des mois de révisions ne repartent pas de zéro.

Une leçon en brouillon ou archivée au moment de la passe (dépubliée le temps
d'une correction, par exemple) est convertie comme si elle était publiée :
ses cartes restent cachées tant qu'elle ne l'est pas, comme l'étaient ses
lignes SM-2, et reviennent avec elle si elle est republiée. Sans cela,
l'historique de ses apprenants partirait avec l'ancienne file. Le compte rendu
dit combien de lignes sont dans ce cas.

Les leçons déjà dues (le jour même ou avant) sont réparties sur cinq jours à
partir du jour même, les plus en retard d'abord : personne ne reçoit tout son
retard dans la même séance. Les autres gardent la date que l'ancienne file
leur donnait. L'interrupteur de répétition espacée n'est pas lu : ses cartes
restent cachées tant qu'il est coupé, comme l'était l'ancienne file. Les lignes
SM-2 ne sont pas modifiées. Règles et tests :
`packages/db/src/backfill-review-cards.ts`.

Pour les versions de l'app installées avant les cartes, qui lisaient la file
elles-mêmes, `review_schedules` est désormais une vue vide, bâtie sur
`review_cards` : elle ne dépend pas de `review_schedules_legacy` et reste en
place quand cette table est supprimée. Elle accepte aussi, sans rien en
garder, les écritures du déploiement précédent : la migration part quelques
minutes avant le nouveau code (voir « Ce qui part tout seul sur un merge »),
et pendant ce temps l'ancien code écrit encore une ligne chaque fois qu'une
leçon est terminée pour la première fois. Refusée, cette écriture annulerait
la fin de leçon entière.

---

## Commandes utiles (Vercel CLI)

```sh
# Installer la CLI
pnpm add -g vercel

# Lier le projet localement
vercel link

# Récupérer les env vars en local
vercel env pull apps/web/.env.local

# Déployer manuellement en preview
vercel

# Déployer en production
vercel --prod
```
