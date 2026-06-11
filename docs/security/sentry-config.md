# Sentry configuration - Cyber Learn (apps/web)

SDK : `@sentry/nextjs` v9.x
Init : PR 3 (`feat/sentry-init-csp-polish`)

---

## Fichiers de configuration

| Fichier | Runtime | Rôle |
|---------|---------|------|
| `apps/web/sentry.client.config.ts` | Browser | Init SDK + Replay |
| `apps/web/sentry.server.config.ts` | Node.js | Init SDK serveur |
| `apps/web/sentry.edge.config.ts` | Edge | Init SDK middleware |
| `apps/web/lib/sentry/scrub-event.ts` | All | PII scrubbing + breadcrumb filter |
| `apps/web/next.config.ts` | Build | `withSentryConfig` wrapper |

---

## Events reportés

Sentry capture :
- Exceptions non gérées (client + serveur)
- Erreurs React via `global-error.tsx`
- 10% des transactions en production (`tracesSampleRate: 0.1`)
- Replay déclenché sur erreur seulement (`replaysOnErrorSampleRate: 1.0`)

Sentry ne capture PAS :
- Events en dev local (DSN absent → `enabled: false`)
- Requêtes/réponses réseau (pas d'URLs dans `networkDetailAllowUrls`)
- Replays de session normale (`replaysSessionSampleRate: 0.0`)

---

## Comment fonctionne scrubEvent()

Chaque event passe par `scrubEvent()` dans `beforeSend` avant envoi.

### Étapes de scrubbing (dans l'ordre)

1. **URL de la requête** - paramètres `token`, `code`, `email`, `key` → `[REDACTED]`
2. **Headers** - clé `authorization`, `cookie`, `set-cookie`, `password`, `token` → `[REDACTED]`
3. **Cookies** - remplacés en bloc par `"[REDACTED]"`
4. **Message** - regex email (`[\w.+-]+@[\w-]+\.[\w.-]+`) → `[EMAIL]`
5. **Message** - regex token base64url 32+ chars → `[TOKEN]`
6. **Exception values** - même regex que message
7. **Extra** - scrubObject récursif (clés PII → REDACTED, valeurs string → scrubString)
8. **Tags** - scrubObject récursif
9. **user.email** → supprimé
10. **user.ip_address** → supprimé
11. **user.id** UUID (36 chars) → supprimé ; HMAC pseudonym (64 hex chars) → préservé

### Modifier les patterns PII

Éditer `apps/web/lib/sentry/scrub-event.ts` :
- `EMAIL_REGEX` - pattern de détection d'emails
- `TOKEN_REGEX` - pattern de détection de tokens
- Tableau de clés redactées dans `scrubObject` → modifier le regex `/^(email|password|token|...)/i`
- Paramètres URL → modifier le tableau `["token", "code", "email", "key"]`

Après modification, relancer les tests : `pnpm test --filter @cyberlearn/web`.

---

## Breadcrumbs filtrés

Routes droppées par `filterBreadcrumb()` :
- `/api/me/delete` et sous-routes (`/confirm`, `/request`)
- `/api/me/export`

Catégories filtrées : `navigation`, `fetch`, `xhr`.
Autres catégories (ui.click, console, etc.) ne sont pas filtrées.

Pour ajouter une route sensible, éditer le regex dans `filterBreadcrumb()` :
```ts
/\/api\/me\/(delete|export|NOUVELLE_ROUTE)/
```

---

## Variables d'environnement

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client + Server | DSN public - init conditionnelle si absent |
| `SENTRY_AUTH_TOKEN` | Build only | Upload source maps vers Sentry |
| `SENTRY_ORG` | Build only | Slug organisation (`cyberlearn`) |
| `SENTRY_PROJECT` | Build only | Slug projet (`javascript-nextjs`) |
| `NEXT_PUBLIC_SENTRY_CSP_REPORT_URI` | Runtime | Endpoint CSP violation reporting |

### Rotation de SENTRY_AUTH_TOKEN

1. Aller sur sentry.io → Settings → Auth Tokens
2. Créer un nouveau token avec scope `project:releases` + `org:read`
3. Mettre à jour dans Vercel (Production + Preview environments)
4. Invalider l'ancien token dans Sentry
5. Vérifier le prochain déploiement Vercel - les source maps doivent s'uploader

---

## Quotas et limites

Plan Sentry Free :
- **5 000 errors/mois** - suffisant pour les premiers mois, surveiller après launch
- **50 replays/mois** - activé sur erreur seulement, donc quotient rare
- **1 M transactions/mois** - à 10% de sampling, cela représente 10M requêtes

Surveillance : configurer une alerte Sentry si le quota atteint 80%.

---

## CSP et Sentry

Le header `Content-Security-Policy` dans `middleware.ts` autorise :
- `connect-src https://*.ingest.sentry.io` - envoi des events
- `report-uri ${NEXT_PUBLIC_SENTRY_CSP_REPORT_URI}` - violations CSP vers Sentry

`worker-src blob:` (déjà présent) couvre le worker Sentry Replay.

---

## apps/admin - statut

Fait : Sentry est initialisé sur `apps/admin` selon le même pattern
(`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
+ `withSentryConfig` dans `next.config.ts`), avec le même helper `scrubEvent`.
