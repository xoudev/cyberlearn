# CyberLearn - Fonctionnalités implémentées

> Dernière mise à jour : septembre 2026
>
> Les tableaux de routes sont relevés sur l'arborescence réelle des
> `page.tsx` et `route.ts`, pas de mémoire.

---

## Site utilisateur (`apps/web`)

### Pages & Routes

| Route | Description |
|---|---|
| `/` | Landing page publique avec terminal interactif |
| `/catalogue` | Catalogue public des parcours et des leçons |
| `/login` | Connexion (e-mail + mot de passe, OAuth GitHub) |
| `/register` | Création de compte |
| `/forgot-password` · `/reset-password` | Récupération du mot de passe |
| `/mfa` | Défi TOTP quand un facteur vérifié existe |
| `/contact` | Formulaire de contact / signalement |
| `/u/[username]` | Profil public d'un utilisateur |
| `/verify` · `/verify/[publicId]` | Vérification publique d'un certificat |
| `/download` | Page de téléchargement de l'app mobile |
| `/banned` | Page d'un compte suspendu, avec dépôt d'appel |
| `/legal` · `/legal/terms` · `/privacy` | Mentions, CGU, politique de confidentialité |
| `/account/delete/confirm` · `/success` · `/error` | Confirmation de suppression de compte (RGPD) |
| `/dev/components` | Galerie des composants, hors production |

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
| `/dashboard` | Tableau de bord, construit autour des parcours |
| `/lessons` · `/lessons/[slug]` | Catalogue et leçon (MDX, quiz, Q&A, notes) |
| `/paths` · `/paths/[slug]` | Catalogue des parcours et progression |
| `/paths/[slug]/exam` | Examen final à tirage aléatoire et temps limité |
| `/challenges` · `/challenges/[slug]` | Défis (sandbox Python, indices, flag) |
| `/revisions` · `/review` | Révisions espacées SM-2 |
| `/notes` | Bloc-notes, dossiers et partages reçus |
| `/badges` · `/certificates` | Collection de badges, attestations obtenues |
| `/leaderboard` | Classement global, et entre amis sur option |
| `/locker` | Casier des cosmétiques débloqués |
| `/forum` · `/forum/[category]` | Forum par catégories |
| `/forum/[category]/[topic]` · `/nouveau` | Sujet et ouverture d'un sujet |
| `/my-class` | Ma classe — vue élève ou vue enseignant |
| `/my-class/lessons/new` · `/[id]/edit` | Leçon écrite par un enseignant pour ses classes |
| `/my-class/paths/new` · `/[id]/edit` | Parcours composé par un enseignant |
| `/support` · `/support/[id]` | Aide & demandes, et fil d'une demande |
| `/wrapped` | Récap annuel, ouvert du 1er décembre au 7 janvier |
| `/changelog` | Notes de version |
| `/profile` · `/profile/edit` | Profil et édition |
| `/settings` | Réglages : `account`, `profile`, `preferences`, `notifications`, `privacy`, `moderation`, `data` |

#### API Routes

| Route | Description |
|---|---|
| `/api/cron/review-reminders` | Cron - rappels de révision SM-2 (quotidien) |
| `/api/cron/streak-reset` | Cron - reset du streak à minuit |
| `/api/cron/season-rollover` | Cron - clôture de saison, promotions et relégations |
| `/api/cron/keep-alive` | Cron - maintien en vie des free tiers ([détail](infra/keep-alive.md)) |
| `/api/certificates/[id]/download` | Téléchargement du certificat PDF |
| `/api/auth/send-email` | Hook d'envoi des mails d'authentification Supabase |
| `/auth/callback` | Échange PKCE après OAuth, contrôle MFA, synchronisation du profil |
| `/auth/confirm` | Confirmation par jeton implicite, maintenue pour les builds mobiles installés |
| `/api/search` | Recherche globale (parcours, leçons, notes) |
| `/api/me/export` | Export des données personnelles (RGPD Art. 20) |
| `/api/me/delete/request` · `/confirm` | Suppression de compte en deux temps (Art. 17) |
| `/api/mobile/send-otp` | Code de connexion pour l'app native |
| `/api/mobile/progress` | Complétion d'une leçon, par le même flux que le web |
| `/api/mobile/leaderboard` | Classement et échelle de pod |
| `/api/mobile/my-class` | Travail donné à l'élève |
| `/api/mobile/loadout` | Cosmétiques équipés |
| `/api/mobile/password` | Changement de mot de passe |

---

### Fonctionnalités détaillées

#### Authentification & Onboarding
- Supabase Auth : e-mail + mot de passe (12 à 128 caractères), GitHub OAuth,
  adresse à vérifier avant la première session, facteur TOTP optionnel
  (obligatoire côté console) — détail dans [authentication.md](authentication.md)
- Flux d'onboarding multi-étapes (profil → avatar → test de placement)
- Avatar : 8 glyphes (skull, ghost, matrix, circuit, bug, key, shield, wire),
  8 SVG intégrés, ou une image téléversée (bucket privé + URL signée,
  [ADR-003](adr/ADR-003-avatar-upload-private-bucket.md))
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
- **Badges** (10 types de critères, 4 raretés)
  - Critères : leçon complétée, parcours terminé, seuil XP, jours de série,
    maîtrise d'une catégorie, quiz parfait, leçon précise, niveau atteint,
    badge obtenu, custom
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
- 15 types : REVIEW_REMINDER, BADGE_EARNED, LEVEL_UP, PATH_COMPLETED,
  CERTIFICATE_ISSUED, ANNOUNCEMENT, TICKET_UPDATE, CLASS_ENROLLED,
  LESSON_ASSIGNED, PATH_ASSIGNED, NOTE_SHARED, MODERATION_ALERT, FORUM_REPLY,
  FRIEND_REQUEST, FRIEND_ACCEPTED
- Badge de comptage non-lu dans la navbar
- Marquer une ou toutes les notifications comme lues

#### Contact & Support
- Formulaire à 8 thèmes (BUG, QUESTION, FEATURE_REQUEST, SECURITY,
  CONTENT_ERROR, ESTABLISHMENT_REQUEST, BAN_APPEAL, OTHER)
- Fil de conversation des deux côtés, statuts, réponse par mail
- Une demande RESOLVED ou CLOSED n'accepte plus de message, de part ni d'autre

#### Classes, établissements et enseignants
- Structure : établissement → promotion → classe, gérée dans la console
- Un enseignant écrit ses propres leçons et compose ses parcours, visibles de ses
  seules classes ; il dispose de l'éditeur MDX de la console
- Travail donné à une classe avec échéance et consignes, notifié par mail
- Corrigés et ressources distribués à la classe
- Tableau de bord d'avancement côté enseignant, page « Ma classe » côté élève

#### Forum, notes et amis
- Forum par catégories, sujets épinglés ou fermés, modération intégrée
- Bloc-notes par leçon, dossiers, et partage entre comptes passé par la modération
- Amis : demandes, acceptation, droits accordés (notes partagées, profil privé
  ouvert aux amis), classement entre amis sur activation explicite

#### Modération et sanctions
- Filtrage à la publication : un contenu signalé est masqué avant relecture
- File de relecture côté console : restaurer ou supprimer
- L'auteur est notifié de la décision, et la retrouve dans ses réglages
- Bannissement avec motif, durée, échéance et dépôt d'appel

#### Saisons, quêtes et cosmétiques
- Ligues et pods, promotions et relégations à la clôture d'une saison (cron)
- Quêtes hebdomadaires, avec réclamation de la récompense
- Casier de cosmétiques débloqués au niveau, chacun dessiné comme lui-même
- **Wrapped** : récap annuel en story plein écran (une barre par slide, tape à
  droite pour avancer, maintien pour mettre en pause), ouvert du 1er décembre au
  7 janvier, avec carte finale exportable

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
| `/` | Redirige vers `/dashboard` |
| `/login` | Connexion admin |
| `/dashboard` | Stats globales, recherche, et issues Sentry non résolues |
| `/lessons` | Liste des leçons |
| `/lessons/new` | Créer une leçon (éditeur MDX + preview) |
| `/lessons/[id]/edit` | Éditer une leçon |
| `/lessons/import` | Import MDX en masse (frontmatter YAML + corps, 30 fichiers max, 500 Ko par fichier) |
| `/challenges` | Liste des challenges |
| `/challenges/new` | Créer un challenge |
| `/challenges/[id]/edit` | Éditer un challenge + gestion des hints |
| `/paths` | Liste des parcours |
| `/paths/new` | Créer un parcours |
| `/paths/[id]/edit` | Éditer un parcours (sélection et réordonnancement des leçons) |
| `/paths/[id]/quiz` | Composer l'examen final d'un parcours |
| `/badges` | Liste des badges |
| `/badges/new` | Créer un badge (10 types de critères) |
| `/badges/[id]/edit` | Éditer un badge |
| `/mfa` · `/mfa/setup` | Défi et enrôlement TOTP, obligatoires ici |
| `/users` | Liste des comptes (recherche, filtres, rôle) |
| `/users/[id]` | Un compte : rôle, bannissement, remise à zéro, suppression |
| `/classes` · `/classes/new` · `/classes/[id]` | Classes, création, composition |
| `/classes/structure` | Établissements et promotions |
| `/moderation` | File de relecture des contenus signalés |
| `/tickets` · `/tickets/[id]` | Demandes et fil de conversation |
| `/audit` | Journal d'audit (qui a fait quoi, quand) |
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
- 10 types de critères avec formulaire dynamique
- 4 raretés (COMMON, RARE, EPIC, LEGENDARY)
- Activation/désactivation sans suppression si déjà attribué
- RefCode format : `CL-BDG-NNN`

#### Gestion des utilisateurs
- Liste paginée avec recherche et filtres
- Rôle STUDENT / TEACHER / ADMIN
- Bannissement avec motif, échéance, levée et appel
- Remise à zéro d'une progression, sans toucher au compte
- Suppression complète du compte et de ce qu'il possède, avec e-mail à la clé

#### Modération
- File de relecture des contenus bloqués à la publication
- Restaurer ou supprimer, décision notifiée à l'auteur
- Une décision peut porter une sanction

#### Classes et établissements
- Établissements et promotions, création et édition
- Classes : composition, enseignants, membres, invitations par e-mail
- Un élève s'ajoute par adresse ou par @pseudo ; une adresse inconnue devient
  une invitation, un @pseudo inconnu est refusé (un pseudo ne se réserve pas
  en s'inscrivant)

#### Tickets de support
- Liste avec filtres par statut et thème
- Mise à jour du statut (OPEN → IN_PROGRESS → RESOLVED → CLOSED)
- Fil de conversation avec le demandeur ; une demande RESOLVED ou CLOSED
  n'accepte plus de message, de part ni d'autre

#### Audit
- Log de toutes les mutations admin (qui, quoi, quand, sur quelle ressource)
- IP pseudonymisée (hash SHA-256 + sel)

---

## Packages partagés

### `packages/db` - Couche données
- **Prisma 6** : 60 modèles, 23 enums
- 27 repositories : badge, ban, certificate, challenge, class, cosmetic, forum,
  friendship, leaderboard, league, lesson, moderation, note, note-folder,
  note-share, notification, path, qa, quest, quiz, rating, search, stats,
  streak, ticket, user, wrapped
- Migrations versionnées, RLS incluse : toute migration qui crée une table
  active la RLS et pose ses policies dans le même fichier
- Row Level Security sur toutes les tables du schéma `public`, vérifiée par un
  gate CI fail-closed (aucune table exposée, >= 56 policies)
- Seeds séparés : `db:seed`, `db:seed-paths`, `db:seed-quizzes`,
  `db:seed-cosmetics`, `db:seed-season`
- Les sources ne sont jamais compilées à côté d'elles-mêmes (`noEmit` +
  garde `.gitignore`) : un `.js` émis passerait devant son `.ts` à la
  résolution et les tests liraient le dernier build

### `packages/lib` - Logique métier
- `xp.ts` - Calcul XP/niveau · `sm2.ts` - SuperMemo-2 · `pseudonymize.ts` - HMAC
- `gamification/` - `badge-evaluator.ts` (les 10 critères, fonction pure),
  `streak-state.ts`, `day.ts`, `week.ts`, `league.ts`, `quest.ts`, `tier.ts`,
  `wrapped.ts`, `wrapped-window.ts` (la fenêtre du 1er décembre au 7 janvier)
- `moderation/` - `moderate.ts`, `lexicon.ts`, `normalise.ts`, `ban.ts`,
  `notice.ts`
- `mdx/` - `sanitize.ts` (allowlist), `toc.ts`, `split-sections.ts`
- `search/` - `rank.ts`, `fold.ts` · `social/friendship.ts` ·
  `quiz/quiz.ts` · `placement/scoring.ts` · `terminal/scenarios.ts`
- `auth/guards.ts` - `requireUser()` / `requireAdmin()`

### `packages/types` - Types partagés
- Schémas Zod pour toutes les validations (Server Actions, Route Handlers)
- Types TypeScript inférés

### `packages/ui` - Design tokens & composants UI
- `tokens.css` - couleurs, espacements, polices, thèmes clair et sombre
- Composants : XPBar, LevelBadge, RarityBadge, BadgeMedallion, LessonCard,
  PathProgress, NotificationBell, MdxEditorPanel, Select

### `packages/email` - Templates e-mail
- Neuf templates React Email : magic-link, ticket-reply, work-assigned,
  class-enrolled, class-invitation, ban-notice, moderation-notice,
  account-deleted, account-deletion-confirm
- `theme.ts` porte les tokens et le vocabulaire de styles partagé, `shell.tsx`
  le `<head>` commun : un template n'ajoute que ce qui lui est propre, et il
  n'y a de `border-radius` nulle part — le site est carré
- `subject.ts` - un envoi, un sujet : deux mails du même type ne portent jamais
  la même chaîne, sinon le client de messagerie les empile
- Envoi via Resend

### `packages/config` - Configuration partagée
- ESLint, TypeScript (strict + noUncheckedIndexedAccess), Biome

---

## Modèle de données - résumé des enums

| Enum | Valeurs |
|---|---|
| `UserRole` | STUDENT, TEACHER, ADMIN |
| `Category` | DEV, CYBERSEC, NETWORK |
| `Difficulty` | BEGINNER, INTERMEDIATE, ADVANCED, EXPERT |
| `ContentStatus` | DRAFT, PUBLISHED, ARCHIVED |
| `ContentAudience` | CATALOGUE, CLASS |
| `PathTrack` | SKILL, CAREER |
| `ChallengeType` | CTF, PUZZLE, LAB, SCRIPT |
| `ProgressStatus` | NOT_STARTED, IN_PROGRESS, COMPLETED |
| `BadgeRarity` | COMMON, RARE, EPIC, LEGENDARY |
| `BadgeCriterionType` | LESSON_COMPLETED, PATH_COMPLETED, XP_THRESHOLD, STREAK_DAYS, CATEGORY_MASTERY, PERFECT_QUIZ, LESSON_SPECIFIC, LEVEL, BADGE_EARNED, CUSTOM |
| `XpSource` | LESSON, BADGE, QUEST, CHALLENGE, REVIEW |
| `QuestType` | LESSON_COMPLETED, PERFECT_QUIZ, STREAK_DAYS, FORUM_POST, WEEKLY_BONUS |
| `SeasonStatus` | ACTIVE, CLOSING, CLOSED |
| `LeagueDivision` | BRONZE, ARGENT, OR, PLATINE, DIAMANT |
| `LeaderboardVisibility` | HIDDEN, ANONYMOUS, PUBLIC |
| `CosmeticType` | TERMINAL_THEME, HEXAGON_STYLE, PROFILE_FRAME, ACCENT_COLOR |
| `WrappedPeriod` | MONTH, SEASON |
| `FriendshipStatus` | PENDING, ACCEPTED |
| `ModerationVerdict` | ALLOW, REVIEW, BLOCK |
| `ModerationOutcome` | PENDING, UPHELD, OVERTURNED |
| `NotificationType` | REVIEW_REMINDER, BADGE_EARNED, LEVEL_UP, PATH_COMPLETED, CERTIFICATE_ISSUED, ANNOUNCEMENT, TICKET_UPDATE, CLASS_ENROLLED, LESSON_ASSIGNED, PATH_ASSIGNED, NOTE_SHARED, MODERATION_ALERT, FORUM_REPLY, FRIEND_REQUEST, FRIEND_ACCEPTED |
| `TicketTheme` | BUG, QUESTION, FEATURE_REQUEST, SECURITY, CONTENT_ERROR, ESTABLISHMENT_REQUEST, BAN_APPEAL, OTHER |
| `TicketStatus` | OPEN, IN_PROGRESS, RESOLVED, CLOSED |

Les 23 enums du schéma, relevés sur `packages/db/prisma/schema.prisma`.
