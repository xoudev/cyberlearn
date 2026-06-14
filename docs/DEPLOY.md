# Déploiement Vercel - CyberLearn Web

## Prérequis

- Repo pushé sur GitHub (`git@github.com:xoudev/cyberlearn-revamp.git`)
- Accès au dashboard Supabase (pour les URLs de callback)
- Clés API : Resend, Upstash, Cloudflare Turnstile, Jira

---

## 1. Push le code

```sh
git add -A
git commit -m "feat: ..."
git push origin main
```

---

## 2. Créer le projet sur Vercel

1. Va sur **vercel.com/new**
2. **Import Git Repository** → sélectionne `xoudev/cyberlearn-revamp`

---

## 3. Configurer le projet (CRITIQUE - monorepo)

| Champ | Valeur |
|-------|--------|
| Framework Preset | Next.js |
| Root Directory | *(laisser vide - racine du repo)* |
| Build Command | `pnpm turbo run build --filter=@cyberlearn/web` |
| Output Directory | `apps/web/.next` |
| Install Command | `pnpm install` |

> Turbo gère automatiquement l'ordre de build : `packages/lib` est compilé avant `apps/web` grâce à `"dependsOn": ["^build"]` dans `turbo.json`.

---

## 4. Variables d'environnement

À renseigner dans **Vercel → Settings → Environment Variables** :

### Base de données (Supabase)
```
DATABASE_URL          # Supabase → Settings → Database → URI (Transaction mode / PgBouncer)
DIRECT_URL            # Supabase → Settings → Database → URI (Direct)
```

### Supabase Auth
```
NEXT_PUBLIC_SUPABASE_URL         # Supabase → Settings → API → Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    # Supabase → Settings → API → anon/public key
SUPABASE_SERVICE_ROLE_KEY        # Supabase → Settings → API → service_role key (⚠️ secret)
```

### URLs de l'app
```
NEXT_PUBLIC_SITE_URL    # ex: https://cyberlearn.fr (ou https://xxx.vercel.app)
NEXT_PUBLIC_ADMIN_URL   # ex: https://admin.cyberlearn.fr
```

### Email (Resend)
```
RESEND_API_KEY       # resend.com/api-keys
RESEND_FROM_EMAIL    # ex: noreply@cyberlearn.fr (domaine vérifié dans Resend)
```

### Jira
```
JIRA_BASE_URL       # ex: https://xxx.atlassian.net
JIRA_API_EMAIL      # email du compte Atlassian
JIRA_API_TOKEN      # id.atlassian.com → Security → API tokens
JIRA_PROJECT_KEY    # ex: CYBL
```

### Rate limiting (Upstash Redis)
```
UPSTASH_REDIS_REST_URL    # upstash.com → Your DB → REST API
UPSTASH_REDIS_REST_TOKEN  # upstash.com → Your DB → REST API
```

### Captcha (Cloudflare Turnstile)
```
NEXT_PUBLIC_TURNSTILE_SITE_KEY   # dash.cloudflare.com → Turnstile
TURNSTILE_SECRET_KEY             # dash.cloudflare.com → Turnstile (⚠️ secret)
```

### Sécurité
```
IP_HASH_SALT   # openssl rand -hex 32
CRON_SECRET    # openssl rand -hex 32
```

### Monitoring (optionnel)
```
SENTRY_DSN          # sentry.io → Settings → Client Keys
SENTRY_AUTH_TOKEN   # sentry.io → Settings → Auth Tokens
```

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

Sans ça, le Magic Link et le GitHub OAuth ne fonctionneront pas en prod.

### Domaine custom (optionnel)

Dans **Vercel → Settings → Domains**, ajoute ton domaine et configure les DNS chez ton registrar.
Pense à mettre à jour `NEXT_PUBLIC_SITE_URL` avec le vrai domaine.

---

## Base de données - migrations & RLS

Le schéma **et** les policies RLS s'appliquent par la même commande :

```sh
pnpm --filter @cyberlearn/db db:migrate:prod   # prisma migrate deploy (via DIRECT_URL)
```

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

## Déploiements suivants

Chaque push sur `main` déclenche automatiquement un nouveau déploiement Vercel.
Les PRs créent des **preview deployments** avec leur propre URL.

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
