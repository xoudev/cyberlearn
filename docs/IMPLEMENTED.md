# CyberLearn - Fonctionnalités implémentées

> Dernière mise à jour : mai 2026

---

## Site utilisateur (`apps/web`)

### Pages & Routes

| Route | Description |
|---|---|
| `/` | Landing page publique avec terminal interactif |
| `/login` | Connexion Supabase (Magic Link + OAuth GitHub) |
| `/auth/callback` | Callback OAuth |
| `/contact` | Formulaire de contact / signalement |
| `/u/[username]` | Profil public d'un utilisateur |
| `/verify/[publicId]` | Vérification publique d'un certificat |

#### Onboarding (nouvel utilisateur)

| Route | Description |
|---|---|
| `/onboarding` | Étape 1 - Infos (username, displayName, bio) |
| `/onboarding/avatar` | Étape 2 - Choix d'avatar (glyphe ou upload) |
| `/onboarding/placement-test` | Étape 3 - Introduction au test de placement |
| `/onboarding/placement-test/questions` | Test adaptatif (DEV / CYBERSEC / RÉSEAU) |
| `/onboarding/placement-test/result` | Résultats + génération des waivers |

#### App protégée (utilisateur connecté)

| Route | Description |
|---|---|
| `/dashboard` | Tableau de bord principal |
| `/lessons` | Catalogue de leçons avec filtres |
| `/lessons/[slug]` | Leçon individuelle (MDX, quiz, Q&A) |
| `/challenges` | Catalogue de challenges |
| `/challenges/[slug]` | Page challenge (sandbox Python, hints, flag) |
| `/paths` | Catalogue des parcours |
| `/paths/[slug]` | Détail d'un parcours + progression |
| `/badges` | Collection de badges de l'utilisateur |
| `/leaderboard` | Classement Top 100 |
| `/review` | Révisions (Spaced Repetition SM-2) |
| `/profile` | Profil de l'utilisateur connecté |
| `/profile/edit` | Édition du profil et des préférences |

#### API Routes

| Route | Description |
|---|---|
| `/api/cron/review-reminders` | Job cron - notifications de révisions SM-2 (quotidien) |
| `/api/cron/streak-reset` | Job cron - reset du streak à minuit |
| `/api/certificates/[id]/download` | Téléchargement du certificat PDF |

---

### Fonctionnalités détaillées

#### Authentification & Onboarding
- Connexion via Supabase Auth (Magic Link + GitHub OAuth)
- Flux d'onboarding multi-étapes (profil → avatar → test de placement)
- 8 glyphes d'avatar disponibles (skull, ghost, matrix, circuit, bug, key, shield, wire)
- Test de placement adaptatif (~20–30 questions) évaluant les connaissances en DEV, CYBERSEC et RÉSEAU
- Génération de **waivers** après le test : accès direct aux leçons avancées si score suffisant

#### Dashboard
- Barre XP avec animation et niveau actuel
- Streak de jours consécutifs
- Leçons en cours et à reprendre
- Révisions SM-2 dues (badge de comptage)
- Derniers badges obtenus
- Parcours recommandés (basés sur le score de placement)

#### Leçons
- Contenu rendu en MDX (remark-gfm, rehype-highlight, rehype-sanitize)
- Navigation par sections avec stepper
- Quiz optionnel intégré
- Q&A par leçon (questions, réponses, votes, marquer comme acceptée)
- Notation 1–5 étoiles avec recalcul des moyennes en temps réel
- Complétion avec attribution d'XP, évaluation des badges, création du ReviewSchedule SM-2
- Gestion des prérequis (chaîne de leçons)

#### Challenges
- **4 types** : CTF (soumission de flag), SCRIPT (sandbox Python WASM), PUZZLE (honor system), LAB
- Sandbox Python dans le navigateur via Pyodide (Web Worker, timeout 10s)
- **Éditeur de code avec coloration syntaxique** Python (tokenizer embarqué - keywords, builtins, strings, commentaires, nombres, décorateurs, opérateurs)
- Hints révélables progressivement (coût en XP configurable)
- Compteur de tentatives et limite configurable
- Prérequis entre challenges
- Navigation précédent / suivant entre challenges
- First blood (premier utilisateur à compléter)

#### Parcours (Learning Paths)
- Progression par leçons ordonnées
- Complétion automatique détectée dès la dernière leçon obligatoire
- Génération automatique d'un **certificat PDF** signé (SHA-256) à la complétion
- URL de vérification publique (`/verify/[publicId]`)
- Téléchargement du PDF via l'API

#### Gamification
- **XP & Niveaux** (1–100)
  - Formule : niveau N requiert `N × 100` XP depuis le palier précédent (`50 × N × (N-1)` cumulatif)
  - Level-up déclenche une notification
- **Streak** : jours consécutifs d'activité, reset par cron la nuit
- **Badges** (8 types de critères, 4 raretés)
  - Critères : leçons complétées, parcours terminé, seuil XP, streak, maîtrise de catégorie, leçon spécifique, quiz parfait, custom
  - Raretés : COMMON, RARE, EPIC, LEGENDARY
  - Évaluaton automatique à chaque leçon / challenge complété
- **Leaderboard** : Top 100 utilisateurs par XP total

#### Révisions (Spaced Repetition SM-2)
- Algorithme SuperMemo-2 : `easeFactor`, `intervalDays`, `repetitions`, `nextReviewAt`
- ReviewSchedule créé à chaque complétion de leçon
- Page `/review` : liste les leçons dont `nextReviewAt ≤ now`
- Cron quotidien pour les rappels par notification

#### Profil & Préférences
- Page de profil publique ou privée (toggle)
- Statistiques : niveau, XP, streak, badges, certificats
- Édition : displayName, bio, avatar
- Préférences : thème (dark/light/system), locale, e-mails de notification, rappels de révision

#### Notifications
- 7 types : REVIEW_REMINDER, BADGE_EARNED, LEVEL_UP, PATH_COMPLETED, CERTIFICATE_ISSUED, ANNOUNCEMENT, TICKET_UPDATE
- Badge de comptage non-lu dans la navbar
- Marquer une ou toutes les notifications comme lues

#### Contact & Support
- Formulaire avec 6 thèmes (BUG, QUESTION, FEATURE_REQUEST, SECURITY, CONTENT_ERROR, OTHER)
- Création de ticket et synchronisation Jira

#### Certificats
- Génération PDF côté serveur avec `@react-pdf/renderer`
- Hash SHA-256 stocké pour détection de falsification
- Révocable par l'admin (revokedAt + revokedReason)
- Téléchargement direct via API

---

## Admin (`apps/admin`)

### Pages & Routes

| Route | Description |
|---|---|
| `/login` | Connexion admin |
| `/dashboard` | Stats globales (utilisateurs, leçons, challenges, badges, tickets) |
| `/lessons` | Liste des leçons |
| `/lessons/new` | Créer une leçon (éditeur MDX + preview) |
| `/lessons/[id]/edit` | Éditer une leçon |
| `/lessons/import` | Import en masse (CSV/JSON) |
| `/challenges` | Liste des challenges |
| `/challenges/new` | Créer un challenge |
| `/challenges/[id]/edit` | Éditer un challenge + gestion des hints |
| `/paths` | Liste des parcours |
| `/paths/new` | Créer un parcours |
| `/paths/[id]/edit` | Éditer un parcours (sélection et réordonnancement des leçons) |
| `/badges` | Liste des badges |
| `/badges/new` | Créer un badge (8 types de critères) |
| `/badges/[id]/edit` | Éditer un badge |
| `/users` | Liste des utilisateurs (recherche, filtres, toggle de rôle) |
| `/tickets` | Liste des tickets de support |
| `/audit` | Logs d'audit (qui a fait quoi, quand) |
| `/settings` | Configuration de l'application |

---

### Fonctionnalités détaillées

#### Gestion des leçons
- Création et édition avec éditeur MDX + preview en temps réel
- Gestion du statut : DRAFT → PUBLISHED → ARCHIVED
- Suppression (uniquement si DRAFT)
- Import en masse

#### Gestion des challenges
- Création/édition de challenges (CTF, SCRIPT, PUZZLE, LAB)
- Champs spécifiques : flag (CTF/SCRIPT), starter code Python (SCRIPT)
- Gestion des hints : ajout, édition, réordonnancement, coût en XP
- Activation/désactivation

#### Gestion des parcours
- Création/édition avec sélection et ordonnancement des leçons
- Association d'un badge de complétion
- Gestion des templates de certificat PDF

#### Gestion des badges
- 8 types de critères avec formulaire dynamique
- 4 raretés (COMMON, RARE, EPIC, LEGENDARY)
- Activation/désactivation sans suppression si déjà attribué
- RefCode format : `CL-BDG-NNN`

#### Gestion des utilisateurs
- Liste paginée avec recherche et filtres
- Toggle de rôle STUDENT ↔ ADMIN
- Bannissement (soft delete)

#### Tickets de support
- Liste avec filtres par statut et thème
- Mise à jour du statut (OPEN → IN_PROGRESS → RESOLVED → CLOSED)
- Synchronisation Jira

#### Audit
- Log de toutes les mutations admin (qui, quoi, quand, sur quelle ressource)
- IP pseudonymisée (hash SHA-256 + sel)

---

## Packages partagés

### `packages/db` - Couche données
- **Prisma 6** avec 17+ modèles
- 10 repositories (user, lesson, challenge, path, badge, certificate, notification, leaderboard, qa, rating)
- Migrations versionnées
- Row Level Security (RLS) Supabase sur toutes les tables
- Seed avec 8 challenges de démonstration (CTF, SCRIPT, PUZZLE, LAB)

### `packages/lib` - Logique métier
- `xp.ts` - Calcul XP/niveau
- `streak.ts` - Logique de streak
- `sm2.ts` - Algorithme SuperMemo-2
- `badge-evaluator.ts` - Évaluation des 8 critères de badge (fonction pure)
- `mdx/sanitize.ts` - Sanitization MDX avec allowlist
- `mdx/toc.ts` - Génération de table des matières
- `mdx/split-sections.ts` - Découpage MDX en sections
- `auth/guards.ts` - `requireUser()` / `requireAdmin()`

### `packages/types` - Types partagés
- Schémas Zod pour toutes les validations (Server Actions, Route Handlers)
- Types TypeScript inférés

### `packages/ui` - Design tokens & composants UI
- Tokens CSS (couleurs, espacements, polices)
- Composants : XPBar, LevelBadge, RarityBadge, LessonCard, PathProgress, NotificationBell, CertificatePreview

### `packages/email` - Templates e-mail
- Templates React Email pour les notifications (révisions, badges, etc.)
- Envoi via Resend

### `packages/config` - Configuration partagée
- ESLint, TypeScript (strict + noUncheckedIndexedAccess), Biome

---

## Modèle de données - résumé des enums

| Enum | Valeurs |
|---|---|
| `UserRole` | STUDENT, ADMIN |
| `Category` | DEV, CYBERSEC, NETWORK |
| `Difficulty` | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| `ContentStatus` | DRAFT, PUBLISHED, ARCHIVED |
| `ChallengeType` | CTF, PUZZLE, LAB, SCRIPT |
| `BadgeRarity` | COMMON, RARE, EPIC, LEGENDARY |
| `BadgeCriterionType` | LESSON_COMPLETED, PATH_COMPLETED, XP_THRESHOLD, STREAK_DAYS, CATEGORY_MASTERY, PERFECT_QUIZ, LESSON_SPECIFIC, CUSTOM |
| `NotificationType` | REVIEW_REMINDER, BADGE_EARNED, LEVEL_UP, PATH_COMPLETED, CERTIFICATE_ISSUED, ANNOUNCEMENT, TICKET_UPDATE |
| `TicketTheme` | BUG, QUESTION, FEATURE_REQUEST, SECURITY, CONTENT_ERROR, OTHER |
| `TicketStatus` | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| `ProgressStatus` | NOT_STARTED, IN_PROGRESS, COMPLETED |
