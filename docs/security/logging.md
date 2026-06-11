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
// ❌ Risque - err peut contenir { request: { to: "user@example.com" } }
console.error("[foo] Resend failed:", err);

// ✅ Sûr - message string standardisé seulement
console.error("[foo] Resend failed:", err instanceof Error ? err.message : String(err));
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

## Migration future - structured logger

Toutes les occurrences `console.*` en production sont fonctionnelles
mais non structurées. Post-launch, migrer vers un structured logger
(Pino, Bunyan, ou équivalent) pour :

- Logs JSON structurés (niveau, timestamp, requestId)
- Filtrage automatique des champs PII via `redact` config
- Intégration provider externe (Datadog, Axiom, Vector)
- Traçabilité request-scoped (middleware → handler → service)

Voir docs/backlog/post-v1.md - tâche "Migration logger structuré".
Décision de l'outil exact à faire en temps voulu.
