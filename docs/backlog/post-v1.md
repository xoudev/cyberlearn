# Backlog post-v1 (à traiter le jour de la monétisation ou évolution)

## RGPD et conformité

### Si monétisation (vente, abonnement, dons via plateforme tierce)

- **Bascule LCEN Art. 6 III 1°** : publier l'identité complète de l'éditeur
  (nom, adresse, statut juridique, SIREN si applicable) dans /legal
- **Création des CGV** (Conditions Générales de Vente) : page /terms-sale
  ou similaire ; à ajouter au footer
- **Mention du droit de rétractation** (14 jours pour les particuliers, sauf
  exceptions services numériques)
- **Mention de la médiation à la consommation** (Art. L612-1 Code de la
  consommation)
- **Mention des modalités de paiement et de TVA**
- **Conditions de remboursement et de SAV**
- **Bascule éditeur "professionnel"** : impacte aussi les mentions
  publicitaires et les obligations B2C

### Si ajout d'analytics ou tracking

- **Refonte du cookie consent** en opt-in granulaire (essentiels /
  analytics / marketing)
- **Bandeau cookies conforme CNIL** (refus aussi visible qu'acceptation)
- **Mise à jour /privacy section 8** avec les cookies ajoutés
- **Mise à jour du registre des traitements**

### Droits utilisateur (PR 2.4 — partiellement résolu)

- ~~Endpoint /api/me/export~~ : résolu PR 2.4.A
- ~~Endpoint /api/me/delete~~ : résolu PR 2.4.B
- ~~Page UI /settings/data~~ : résolu PR 2.4.B.3
- Job de suppression automatique des comptes inactifs (24 mois)
- Job de purge automatique des logs (12 mois auth, 6 mois apps)
- Job d'anonymisation des certificats lors d'une suppression de compte

### Sentry et observability — RÉSOLU par PR 3 (feat/sentry-init-csp-polish)

- ~~Init Sentry avec config RGPD-safe~~ : résolu, voir docs/security/sentry-config.md

**Tâches post-launch restantes :**

- **Init Sentry sur apps/admin** — même pattern que apps/web, PR dédiée à créer
- **Audit Sentry events 30j post-launch** — vérifier qu'aucun PII ne leak malgré le scrubbing
  (inspecter les events Sentry dans le dashboard, chercher patterns email/UUID dans messages)

---

## Landing page (apps/web/app/page.tsx)

### Liens placeholder dans le footer landing

Les liens suivants pointent actuellement vers href="#" (mocks de
design phase 2) et seront à wirer quand les features
correspondantes seront implémentées :

- Parcours → /paths (PR future)
- Tarifs → /pricing (uniquement si monétisation, PR future)
- Entreprises → /business (uniquement si offre B2B, PR future)
- Communauté → /community (uniquement si feature communauté
  implémentée — Q&A par leçon est déjà rattachée au contenu
  pédagogique, hors forum global)

### Données figées / fake sur la landing

Les statistiques affichées sur la landing page (compteurs leçons,
users, badges, etc.) sont actuellement hardcodées dans le composant.
À connecter aux vraies sources lors d'une PR landing dédiée :

- Compteur leçons → query DB (Lesson WHERE status = PUBLISHED).count()
- Compteur users actifs → query DB (User WHERE lastConnectionAt > now() - 30d).count()
- Identifier les autres compteurs et les wirer

Approche recommandée : SSR avec revalidation (ex: revalidate: 3600
toutes les heures) pour éviter le coût d'une requête à chaque visite.

### Convention .gitignore /docs

Tracé pour cleanup futur : décider si on garde la convention actuelle
(/docs gitignored avec git add -f sélectif) ou si on bascule sur
une convention par sous-dossier (genre docs/private/* gitignored,
reste tracké par défaut). Hérité de PR 1.4.



### Migration vers structured logger (Pino / Bunyan / etc.)

Toutes les occurrences `console.*` en production sont fonctionnelles
mais non structurées. Post-launch, migrer vers un structured logger
(Pino, Bunyan, ou équivalent) pour :
- Logs JSON structurés (niveau, timestamp, requestId)
- Filtrage automatique des champs PII via `redact` config
- Intégration provider externe (Datadog, Axiom, Vector)
- Traçabilité request-scoped (middleware → handler → service)

Périmètre : ~15 call-sites `console.*` en production dans apps/web/.
Convention cible déjà dans docs/security/logging.md.
Pas bloquant pour le launch — les call-sites actuels sont SAFE.
Décision de l'outil exact à faire en temps voulu.

### Design des emails — PR design dédiée plus tard

Le template account-deletion-confirm.tsx est fonctionnel mais le design
ne suit pas l'identité visuelle Cyber Learn.

Faut un effort transverse pour repolish TOUS les emails ensemble :
- Magic link
- Account deletion confirm
- Contact tickets
- (autres à venir)

Sinon incohérence entre emails. À faire en PR design email dédiée
post-launch ou avant launch si temps. Pas critique pour le run.

Reference : voir style Linear / Vercel pour emails dark mode +
terminal aesthetic.
