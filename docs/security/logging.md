# Logging convention - Cyber Learn

## Règle générale

Toute donnée personnelle (PII) est **interdite** dans les logs serveur
en clair. Les trois catégories interdites : adresses email, noms/displayNames,
adresses IP.

## Conformité RGPD

Cette convention est dérivée de :

- **Art. 5 (minimisation)** : ne logger que ce qui est strictement
  nécessaire pour le debug.
- **Art. 32 (sécurité du traitement)** : les logs serveur sont
  considérés comme un traitement de données → sécurité technique
  équivalente aux données métier requise.
- **Art. 17 (droit à l'effacement)** : après anonymisation utilisateur,
  ses logs historiques (audit_logs) doivent rester non-rattachables.
  → c'est le rôle de `pseudonymize()` via HMAC-SHA256.

## Ce qui peut être loggué

| Donnée | OK ? | Règle |
|--------|------|-------|
| UUID interne (`userId`) | ✅ | UUID non guessable, non affiché à l'utilisateur |
| ID de certificat / lesson / token | ✅ | Identifiant opaque |
| Message d'erreur string (`err.message`) | ✅ | String seulement - jamais l'objet `err` complet |
| IP pseudonymisée (`pseudonymize(ip)`) | ✅ | HMAC-SHA256 + `IP_SALT` |
| Email | ❌ | Jamais - ni clair ni partiel |
| Nom / displayName | ❌ | Jamais |
| IP brute | ❌ | Toujours pseudonymiser avant stockage |
| Objet `err` complet | ⚠️ | Risque SDK tiers - utiliser `err.message` uniquement |

## Pattern Resend / SDK tiers

Les erreurs de SDK externe (Resend, Supabase Admin) **ne doivent pas**
être loggées comme objet complet : les propriétés internes peuvent
sérialiser les paramètres de la requête originale.

```ts
import { errorMessage, logger } from "@cyberlearn/lib/logger";

// ❌ Risque - err peut contenir { request: { to: "user@example.com" } }
logger.error({ scope: "foo", err }, "Resend failed");

// ✅ Sûr - le message seul, via errorMessage()
logger.error({ scope: "foo", err: errorMessage(err) }, "Resend failed");
```

## Pattern dev-only

Les logs de debug non-production doivent être explicitement guardés :

```ts
if (process.env.NODE_ENV !== "production") {
  console.warn("[Component] debug info:", ...);
}
```

## auditLog.create - champs PII

Règles applicables à chaque entrée `auditLog` :

| Champ | Valeur autorisée |
|-------|-----------------|
| `actorId` | UUID Prisma (FK) ou `null` (si supprimé) |
| `actorHashedId` | `pseudonymize(userId)` - HMAC-SHA256 |
| `ipAddress` | `pseudonymize(rawIp)` obligatoire |
| `userAgent` | `.slice(0, 500)` - tronqué |
| `metadata` | Pas d'email, pas de nom, IPs pseudonymisées |

## Sentry / monitoring externe

RÉSOLU par PR 3 (`feat/sentry-init-csp-polish`). Config appliquée :

- `beforeSend` → `scrubEvent()` sur 100% des events (emails, tokens, cookies, headers)
- `Sentry.replayIntegration({ maskAllInputs: true })` - saisie masquée dans les replays
- `beforeBreadcrumb` → `filterBreadcrumb()` - routes `/api/me/(delete|export)` droppées
- Tags : aucun tag PII ; `user.email` et `user.ip_address` supprimés dans `scrubEvent`
- UUIDs utilisateur dans `user.id` supprimés ; HMAC pseudonyms (64 hex) préservés

Implémentation : `apps/web/lib/sentry/scrub-event.ts`
Tests : `apps/web/lib/sentry/__tests__/scrub-event.test.ts`
Référence détaillée : `docs/security/sentry-config.md`

Sentry sur `apps/admin` : en place (même pattern + `scrubEvent` partagé - voir
docs/security/sentry-config.md, section « apps/admin - statut »).

## Logger structuré : Pino

Le code serveur journalise via `logger` de `@cyberlearn/lib/logger`
(`packages/lib/src/logger.ts`) : une ligne JSON par événement sur stdout,
avec niveau, horodatage ISO et un champ `scope` qui remplace l'ancien
préfixe `[scope]`. Le message reste une chaîne constante ; les valeurs
variables vont dans l'objet, jamais interpolées dans le message.

- `redact` masque `email`, `to`, `ip`, `password`, `token` et `displayName`
  (au premier niveau et un niveau en dessous). C'est un filet, pas une
  autorisation : la règle reste de ne pas les passer.
- Pas de transport ni de pretty-printer : les transports de Pino tournent
  dans un worker que le bundler de Next n'embarque pas.
- Niveau : `LOG_LEVEL` s'il est défini, sinon `info` en production, `debug`
  en dev, `silent` sous Vitest.

Restent volontairement sur `console` :

- le middleware (runtime Edge, où Pino ne tourne pas) ;
- les composants client (avertissements de props en dev seulement) ;
- les scripts CLI (`content-check.mjs`, scripts de seed).

Reste à faire, hors périmètre de la migration : un `requestId` propagé du
middleware aux handlers, et un drain vers un fournisseur externe.
