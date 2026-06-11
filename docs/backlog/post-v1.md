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

- ~~**Init Sentry sur apps/admin**~~ — **fait** (`sentry.{client,server,edge}.config.ts` + `withSentryConfig`, scrubEvent partagé)
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

**Résolu** (PR #66) : la règle large `/docs` est supprimée — elle ignorait
silencieusement tout nouveau fichier de doc. `docs/` est tracké par défaut ;
un commentaire de garde dans `.gitignore` documente le piège. Si un besoin de
notes privées revient, créer un sous-dossier dédié gitignoré explicitement.



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


### Audit Replay Sentry 30j post-launch

Avec maskAllText: false, les emails affichés en clair côté DOM
(page profil, etc.) peuvent apparaître dans les Replays Sentry.

À faire 30j post-launch :
- Visiter quelques Replays dans Sentry
- Confirmer qu'aucun PII (email) n'apparaît
- Si leak détecté : switch maskAllText: true (UI illisible mais
  zero PII risk)



## Infrastructure & coûts

### v1 (current — free tier max)
- Vercel Hobby (non-commercial)
- Supabase Free
- Resend Free (100 emails/jour)
- Upstash Free (10k cmd/jour)
- Sentry Free (5k events/mois)
- Coût : ~0.58€/mois (domaine seul)

### v1.5 — WebVM integration
- Add: Cloudflare R2 pour disk images (egress gratuit)
- Setup: pipeline build/deploy disks
- Coût additionnel : 0-5€/mois

### v2 — Migration VPS OVH (DevOps showcase)
**Objectif** : montée en compétence DevOps + portfolio CV.

**Stack cible** :
- VPS OVH Value (6.99€/mois) — 1 vCPU, 4GB RAM, 80GB SSD
- Docker + Docker Compose pour orchestration
- Caddy/Nginx reverse proxy + Let's Encrypt
- PostgreSQL self-hosted (avec backups vers R2)
- Redis self-hosted
- Glitchtip (Sentry self-hosted) ou keep Sentry Cloud
- Loki + Grafana pour logs
- Prometheus + Grafana pour metrics
- GitHub Actions → SSH deploy pipeline
- UFW firewall + fail2ban + SSH keys-only
- OVH VPS Backup add-on (1.59€/mois)

**Coût cible v2** : ~10-15€/mois.

### Si monétisation un jour
- Vercel Pro (20$/mois) ou VPS Option B
- Supabase Pro (25$/mois) si scale
- Stripe pour paiements
- Conformité légale française (auto-entrepreneur min)

### Alertes budget à configurer
- Upstash : 2$/mois
- Vercel : 5$/mois
- Resend : monitor manuel hebdo
- OVH (futur) : VPS Backup activé
## Modèle économique v1

**Position v1 : 100% gratuit pour les users + 100% free tier infra.**

- Pas de monétisation (cohérent avec ToS Vercel Hobby)
- Pas de paywall, pas de subscription, pas de certs payants
- Pas de tracking commercial (cohérent RGPD minimal)
- Coût pour Jordan : ~0.58€/mois (domaine OVH uniquement)

### Quand ré-évaluer

Re-considérer la monétisation **uniquement après** :
- 6+ mois de production
- 100+ users actifs récurrents (DAU > 20)
- Demandes spontanées d'users prêts à payer pour features avancées
- Limites free tier régulièrement atteintes

Avant ces signaux : pas de monétisation. Focus 100% sur le produit +
expérience pédagogique + traction.

### Si monétisation future

Triggers possibles :
- Certifications payantes (5-15€ par certif délivré)
- Subscription Pro (5-10€/mois pour features avancées)
- Sponsoring entreprises (placement leçons partenaires)
- Sponsoring particuliers ("offrir une certif")

→ Voir docs/infra/cost-roadmap.md pour les implications infra.




## Audit Zod sur toutes les Server Actions admin

Le security-review PR 5 a flagué 2 Server Actions sans Zod safeParse
(user-actions, ticket-actions). Bien que les autres CRUD admin
(lessons, badges, paths, challenges) utilisent déjà requireAdminAction(),
il faut vérifier que **chaque** Server Action admin valide ses inputs
avec Zod.

Action : grep "export async function" apps/admin/ + audit manuel ligne
par ligne. Cible : 100% des Server Actions admin avec safeParse au début.

Tracé pour PR post-launch dédiée "audit-zod-admin".