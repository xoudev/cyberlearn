<div align="center">

# CyberLearn

**Plateforme d'apprentissage interactif - Développement · Cybersécurité · Réseaux & Systèmes**

Apprendre en pratiquant : leçons interactives, sandboxes de code dans le navigateur,
parcours certifiants - pensé pour la communauté francophone.

[![CI](https://github.com/xoudev/cyberlearn-revamp/actions/workflows/ci.yml/badge.svg)](https://github.com/xoudev/cyberlearn-revamp/actions/workflows/ci.yml)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black)
![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178C6)
![Prisma 6](https://img.shields.io/badge/Prisma-6-2D3748)
![Tailwind v4](https://img.shields.io/badge/Tailwind-v4-38BDF8)
![pnpm 9](https://img.shields.io/badge/pnpm-9-F69220)

*Projet étudiant solo. Construit pour apprendre, pas pour lever des fonds.*

</div>

---

## Fonctionnalités

- **Leçons interactives MDX** - quiz inline, terminal simulé, diagrammes, vidéos,
  et **sandboxes de code exécutées dans le navigateur** (Python via Pyodide,
  JavaScript, C, assembleur) dans des Web Workers durcis (réseau et storage bloqués).
- **Parcours certifiants** - examens finaux à tirage aléatoire et temps limité,
  **certificats PDF vérifiables publiquement** (QR code, page `/verify`).
- **Catalogue** - 16 parcours de 12 leçons, soit **192 leçons** MDX versionnées
  dans `content/`, chacune avec son quiz final de certification.
- **Gamification** - XP, niveaux, streaks quotidiens, badges à 10 types de critères
  (attribution temps réel + rattrapage rétroactif), classement public.
- **Test de positionnement** à l'onboarding - dispense automatique des prérequis
  déjà maîtrisés.
- **Révisions espacées** - planification SM-2 par leçon.
- **Q&A par leçon**, notifications realtime, profils publics, avatars.
- **Classes & établissements** - un enseignant compose ses leçons et ses parcours,
  les assigne à sa classe avec une échéance, distribue des corrigés, et suit
  l'avancement ; l'élève reçoit le travail par mail et le retrouve sur sa page.
- **Forum** par catégories, **bloc-notes** avec partage entre comptes, **amis**
  (demandes, droits accordés, classement entre amis sur option).
- **Modération** - filtrage à la publication, file de relecture côté console,
  décisions notifiées à l'auteur, bannissements avec motif, échéance et appel.
- **Aide & demandes** - tickets avec fil de conversation des deux côtés, statuts,
  et réponse par mail.
- **Saisonnalité** - ligues et saisons, quêtes hebdomadaires, casier de
  cosmétiques, et **Wrapped** : un récap annuel en story plein écran, ouvert du
  1er décembre au 7 janvier.
- **Application mobile** (Expo / React Native) sur la même base de données, via
  une API dédiée `/api/mobile/*`.
- **Dashboard admin isolé** (sous-domaine dédié, rôle ADMIN + TOTP) - CRUD leçons /
  parcours / badges / quiz / défis, import MDX en masse, gestion des comptes et
  des classes, file de modération, tickets, remise à zéro d'une progression,
  audit log complet.

## Stack

| Domaine | Choix |
|---|---|
| Framework | Next.js 15 (App Router, RSC, Server Actions) |
| Langage | TypeScript 5 strict - zéro `any` |
| Monorepo | Turborepo + pnpm 9 workspaces (`catalog:`) |
| Base de données | Supabase Postgres + Prisma 6 (RLS versionnée dans les migrations) |
| Auth | Supabase Auth - e-mail + mot de passe, GitHub OAuth, TOTP optionnel (obligatoire côté admin) ; rôle injecté dans le JWT par Edge Function |
| UI | Tailwind CSS v4 (CSS-first) + shadcn/ui + design system maison |
| Validation | Zod sur toutes les entrées (Server Actions, Route Handlers, formulaires) |
| State / data | TanStack Query v5 |
| Email | Resend + React Email |
| Tests | Vitest (unit + intégration) · tests RLS/IDOR sur stack Supabase éphémère · rendu des mails vérifié sur le HTML produit |
| Observabilité | Sentry (PII scrubbing), rate limiting Upstash Redis |

## Architecture

```
cyberlearn/
├── apps/
│   ├── web/            # App publique - cyberlearn.fr (port 3000)
│   ├── admin/          # Dashboard admin - admin.cyberlearn.fr (port 3001)
│   ├── mobile/         # App native Expo / React Native (Android)
│   └── marketing/      # Rendus Remotion pour la fiche Play Store
├── packages/
│   ├── db/             # Schéma Prisma, migrations (RLS incluse), repositories, clients Supabase
│   ├── lib/            # Logique métier partagée (XP, SM-2, évaluateur de badges, scoring, guards)
│   ├── ui/             # Composants de marque (XPBar, LevelBadge, BadgeMedallion…) + tokens
│   ├── types/          # Schémas Zod et types partagés
│   ├── email/          # Templates React Email
│   └── config/         # Configs ESLint / TSConfig / Biome partagées
├── content/            # Leçons MDX et quiz, versionnés
├── supabase/           # Edge Functions (hook JWT) + migrations storage
├── scripts/            # Outillage (runtimes sandbox vendorés, vérification d'intégrité)
└── docs/               # Runbooks, ADR, hardening, RGPD, infra
```

Principes : **server-first** (RSC par défaut), **repository pattern** (aucun appel
Prisma dans les composants), code en anglais - le français est réservé aux textes UI.

## Sécurité

- **RLS Postgres sur toutes les tables**, versionnée dans la chaîne de migrations
  Prisma - un gate CI fail-closed (« Assert RLS coverage ») échoue si une table
  publique n'a pas la RLS ou si le compte de policies régresse.
- **Tests d'intégration RLS / anti-IDOR** rejoués à chaque PR sur une stack
  Supabase éphémère, plus une vérification de la signature du hook JWT.
- **CSP stricte nonce-based + HSTS** via middleware custom ([ADR-002](docs/adr/ADR-002-custom-security-headers-middleware.md)).
- **Sandboxes durcies** - runtimes vendorés à hashes vérifiés en CI, workers sans
  accès réseau ni storage.
- **RGPD** - suppression de compte (Art. 17, confirmation par email), export des
  données (Art. 20), [registre des traitements](docs/rgpd/registre-traitements.md),
  scrubbing PII dans Sentry (emails, IP hachées).
- **Admin cloisonné** - sous-domaine séparé, RBAC, audit log sur toutes les
  mutations, `noindex`.

Le détail vit dans [docs/hardening/](docs/hardening/), [docs/security/](docs/security/)
et [docs/rgpd/](docs/rgpd/).

## Démarrage

### Prérequis

| Outil | Version |
|---|---|
| Node.js | 22.x LTS |
| pnpm | 9.x (`npm i -g pnpm@9`) |
| Git | récent (hooks Husky) |

### Installation

```bash
git clone git@github.com:xoudev/cyberlearn-revamp.git cyberlearn
cd cyberlearn
pnpm install

cp .env.example .env.local        # puis renseigner les valeurs (commentées dans le fichier)

pnpm --filter @cyberlearn/db db:generate   # client Prisma
pnpm --filter @cyberlearn/db db:migrate    # migrations (schéma + RLS)
pnpm --filter @cyberlearn/db db:seed       # données de dev
```

### Développement

```bash
pnpm dev                                   # web :3000 + admin :3001
pnpm --filter @cyberlearn/web dev          # web seule
pnpm --filter @cyberlearn/admin dev        # admin seule
```

## Commandes

| Commande | Description |
|---|---|
| `pnpm build` | Build production (toutes les apps et packages) |
| `pnpm lint` / `pnpm lint:fix` | ESLint strict sur tous les packages |
| `pnpm format` / `pnpm format:check` | Formatage Biome |
| `pnpm typecheck` | `tsc --noEmit` partout |
| `pnpm test` / `pnpm test:coverage` | Tests Vitest |
| `pnpm --filter @cyberlearn/db db:studio` | Prisma Studio |
| `pnpm --filter @cyberlearn/db db:migrate:prod` | `prisma migrate deploy` (voir [docs/DEPLOY.md](docs/DEPLOY.md)) |
| `pnpm clean` | Purge des artefacts de build |

## Qualité & CI

Chaque PR passe douze jobs GitHub Actions :

1. **Format check** - Biome
2. **Lint** - ESLint + typescript-eslint strict
3. **Typecheck** - TypeScript strict
4. **Tests** - Vitest sur tous les packages
5. **Build** - build production complet
6. **Runtime integrity** - hashes des runtimes sandbox vendorés
7. **Lesson diagrams** - les diagrammes des leçons compilent
8. **Lesson markers** - les marqueurs de contenu sont bien formés
9. **Auth hook signature** - tests Deno de l'Edge Function JWT
10. **Integration (RLS/IDOR)** - chaîne de migrations + RLS + tests d'accès sur
    stack Supabase éphémère
11. **Gitleaks** - aucun secret dans l'historique
12. **Semgrep** - analyse statique de sécurité

Conventions : [Conventional Commits](https://www.conventionalcommits.org)
(commitlint), hooks pre-commit lint-staged, décisions archivées en
[ADR](docs/adr/).

## Coûts & Roadmap

**v1 : 100 % gratuit pour les utilisateurs, ~0,58 €/mois d'infra** (domaine) -
Vercel Hobby, Supabase Free, Upstash, Resend, Sentry free tiers. Détail, pièges
des free tiers et plan d'évolution : [docs/infra/cost-roadmap.md](docs/infra/cost-roadmap.md).

| Phase | Statut | Contenu |
|---|---|---|
| **v1** | En cours | Free tier complet - leçons interactives, gamification, certificats, sandboxes |
| **v1.5** | Backlog | WebVM (CheerpX) : vrai Linux dans le navigateur pour les leçons DevOps/Réseaux - [détail](docs/backlog/terminal-v2-webvm.md) |
| **v2** | Backlog | Migration VPS self-hosted (Docker, Caddy, Postgres, monitoring Grafana/Loki) - vitrine DevOps |

## Documentation

| Document | Contenu |
|---|---|
| [docs/DEPLOY.md](docs/DEPLOY.md) | Déploiement Vercel + runbook migrations & RLS |
| [docs/LESSON_AUTHORING_GUIDE.md](docs/LESSON_AUTHORING_GUIDE.md) | Écrire une leçon MDX (composants, import admin) |
| [docs/adr/](docs/adr/) | Architecture Decision Records |
| [docs/hardening/](docs/hardening/) | Incidents et durcissements connus |
| [docs/rgpd/](docs/rgpd/) | Audit RGPD, registre des traitements |
| [docs/backlog/](docs/backlog/) | Post-v1 et features différées |
| [docs/authentication.md](docs/authentication.md) | Flux de connexion, MFA, migration des comptes |
| [docs/IMPLEMENTED.md](docs/IMPLEMENTED.md) | Inventaire des routes et des fonctionnalités |
| [docs/MOBILE_PARITY.md](docs/MOBILE_PARITY.md) | Ce que l'app mobile a, ce qui lui est dû, ce qui est web-only |
| [docs/security/](docs/security/) | Journalisation, configuration Sentry |
| [docs/infra/](docs/infra/) | Coûts, maintien en vie des free tiers |
| [content/README.md](content/README.md) | Le catalogue : les 16 parcours, l'import MDX |
| [docs/dev/commit-conventions.md](docs/dev/commit-conventions.md) | Ce que `commitlint` accepte |

## Contributions & licence

Projet solo en construction - les contributions externes ne sont pas acceptées
en v1. Le code est public à titre de vitrine ; tous droits réservés.
