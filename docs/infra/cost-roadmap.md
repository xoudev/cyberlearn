# Roadmap des coûts d'infrastructure

> Document de référence : modèle économique, coûts par phase, alertes
> à configurer.

## Position v1 (current)

**100% gratuit pour les users + 100% free tier infra.**

Cohérent avec :
- ToS Vercel Hobby (interdit l'usage commercial)
- Approche product-led : valider l'usage avant monétisation
- Projet portfolio étudiant solo

Coût mensuel : ~0.58€/mois (domaine OVH, payé pour 3 ans).

### Stack v1 — Free tier détaillé

| Service | Plan | Limite Free | Risque dépassement |
|---|---|---|---|
| Vercel | Hobby | 100GB BW + 100GB-h compute, non-commercial | Moyen (voir piège ToS) |
| Supabase | Free | 500MB DB + 1GB storage + 5GB BW + 50k MAU | Faible v1 |
| Resend | Free | 100 emails/jour | Faible |
| Upstash Redis | Free | 10k commands/jour | **Élevé à surveiller** |
| Sentry | Developer | 5k errors/mois + 50 replays/mois | Faible (Spike Protection) |
| Cloudflare Turnstile | Free | 1M req/mois | Aucun |
| Jira | Free | 10 users | Aucun |
| cron-job.org | Free | 50 crons | Aucun |

## Pièges et alertes

### Piège 1 — Vercel Hobby = pas de commercial

Dans les ToS Vercel : usage non-commercial only. Si Cyber Learn devient
monétisé (subs, certifs payants, sponsoring, ads), upgrade Pro
obligatoire (20$/mois). Tant que v1 = 100% gratuit users, OK.

### Piège 2 — Supabase Free pause après 7j d'inactivité

Mitigation : cron keep-alive externe (cron-job.org) toutes les 6h qui
ping Postgres + Redis. Voir docs/infra/keep-alive.md.

### Piège 3 — Upstash quota 10k commands/jour

Le plus serré des quotas. Rate limiting + session checks peuvent vite
saturer.
- Setup obligatoire : alerte budget Upstash à 2$/mois
- Pay-as-you-go automatique au-delà (~0.20$/100k commands)

### Piège 4 — Sentry 5k events/mois

Spike Protection activé par défaut. Pas de facture surprise sur Free.
Mais en cas de bug critique en prod, quota explosé rapidement.

### Piège 5 — Resend 100 emails/jour

Si coup de marketing avec 100+ inscriptions en 1h, les emails 101+
échouent silencieusement. Monitorer le dashboard Resend.

## Alertes à configurer immédiatement

- [ ] Vercel : alerte usage à 5$/mois
- [ ] Upstash : alerte budget à 2$/mois
- [ ] Resend : check manuel hebdo du dashboard
- [ ] Supabase : monitor quota dashboard
- [ ] 2FA activée sur tous les comptes (Vercel, Supabase, GitHub, OVH, Sentry, Upstash, Resend)

## Phase v1.5 — WebVM integration

**Objectif** : remplacer SimulatedTerminal par un vrai Linux dans le
browser via CheerpX. Voir docs/backlog/terminal-v2-webvm.md.

### Coûts additionnels v1.5

| Service | Coût |
|---|---|
| Cloudflare R2 (disk images CDN) | 0-5€/mois |
| Egress R2 | **Gratuit** (vs ~45€/mois Vercel Blob/S3) |

**Total v1.5 : ~0.58-5€/mois.**

## Phase v2 — Migration VPS OVH (DevOps showcase)

**Objectif** : montée en compétence DevOps + portfolio CV.

### Stack cible

- VPS OVH Value (6.99€/mois) — 1 vCPU, 4GB RAM, 80GB SSD, région Gravelines
- Docker + Docker Compose
- Caddy reverse proxy + Let's Encrypt SSL
- PostgreSQL self-hosted avec backups vers R2/B2
- Redis self-hosted
- Glitchtip (Sentry self-hosted) OU Sentry Cloud maintenu
- Loki + Grafana (logs)
- Prometheus + Grafana (metrics)
- GitHub Actions vers SSH deploy pipeline
- UFW firewall + fail2ban + SSH keys-only
- OVH VPS Backup add-on (1.59€/mois)

### Coût v2 (estimation)

| Modèle | Coût mensuel |
|---|---|
| Option A — VPS + Supabase managed | ~8-13€/mois |
| Option B — VPS + tout self-hosted | ~7-12€/mois |

**Plan recommandé pour CV** : Option B (mode hardcore showcase).

## Triggers de monétisation (re-évaluer)

Re-considérer la monétisation **uniquement après** :

- 6+ mois de production
- 100+ users actifs récurrents (DAU > 20)
- Demandes spontanées d'users prêts à payer
- Limites free tier régulièrement atteintes

Avant ces signaux : focus 100% produit + traction.

### Options de monétisation (si triggers atteints)

- Certifications payantes (5-15€ par certif)
- Subscription Pro (5-10€/mois pour features avancées)
- Sponsoring entreprises (placement leçons partenaires)
- Sponsoring particuliers ("offrir une certif")

### Coûts opérationnels en mode monétisé

- Vercel Pro (20$/mois) ou VPS Option B
- Supabase Pro (25$/mois) si scale
- Stripe (gratuit + 1.4% + 0.25€/transaction)
- Conformité légale FR (auto-entrepreneur min)
- TVA si CA > seuils auto-entrepreneur (~36.8k€)

Estimation : ~70-100€/mois services + ~10€ Stripe pour 50 ventes/mois.
