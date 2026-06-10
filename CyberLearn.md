# 🛡️ Cyber Learn — Brief de développement pour Claude Code

> **À donner tel quel à Claude Code dans un dossier vide.** Ce document décrit l'intégralité du projet, les contraintes techniques, les exigences de sécurité, et la roadmap incrémentale. Lis-le **en entier** avant d'écrire la moindre ligne de code, puis travaille **phase par phase** en validant chaque livrable avant de passer à la suivante.

---

## 1. Contexte & Mission

**Cyber Learn** est une plateforme d'apprentissage interactif et gamifiée couvrant trois domaines : **développement logiciel**, **cybersécurité**, et **systèmes & réseaux**. Elle s'adresse à des étudiants, professionnels en reconversion, et autodidactes francophones.

### Caractéristiques clés à livrer

1. **Leçons interactives** : éditeur de code Monaco intégré, exécution sandbox (Pyodide pour Python, WebContainers pour JS/TS/Node), terminaux Linux simulés, quiz, et contenu rédigé en MDX.
2. **Gamification complète** : XP par leçon, système de niveaux (1 à 100, courbe exponentielle), badges (4 raretés), parcours pédagogiques structurés.
3. **Certifications imprimables** : PDF générés serveur-side après complétion d'un parcours, signés par hash SHA-256, avec QR code renvoyant vers une **page publique de vérification** (`/verify/{cert_public_id}`).
4. **Système de notifications** : in-app (realtime Supabase) + email transactionnel (Resend), avec **rappels de révision basés sur SM-2 simplifié** (algorithme spaced repetition type Anki).
5. **Formulaire de contact → Jira** : création automatique de tickets dans Jira via l'API REST, avec catégorisation par thème (Bug, Question, Feature, Sécurité, Autre).
6. **Dashboard admin séparé** : application Next.js distincte sur `admin.cyberlearn.app`, CRUD complet sur leçons, badges, parcours, utilisateurs, et consultation de l'audit log.
7. **Tout doit être dynamique** : aucune leçon, badge, parcours, ou règle d'XP ne doit être codée en dur. Tout est en base, modifiable depuis l'admin.

### Public cible

- Étudiants en cybersécurité, dev, réseau (école, BUT, BTS, autodidactes)
- Professionnels en reconversion ou en montée de compétence
- Communauté francophone en priorité (i18n prévue pour ajout EN ultérieur)

### Tonalité visuelle

Univers cyber/tech moderne, sombre par défaut (dark mode first), avec accents bleu→turquoise issus du logo. Pas de neon kitsch. Inspiration : Linear, Vercel dashboard, Hack The Box, TryHackMe.

---

## 2. Stack technique imposée

> **Aucune dérive autorisée sans justification écrite.** Tous les outils sont **gratuits** ou disposent d'un free tier suffisant pour démarrer.

| Couche | Technologie | Justification |
|---|---|---|
| Framework | **Next.js 15** (App Router, Server Components) | SSR, RSC, Server Actions, Edge runtime |
| Langage | **TypeScript 5.x** strict mode | Typage fort partout, zéro `any` toléré |
| Styling | **Tailwind CSS v4** + **shadcn/ui** | Design system cohérent, composants accessibles |
| Animations | **Framer Motion** + **Motion One** | Micro-interactions UX |
| BDD | **Supabase Postgres** (free tier) | Postgres managé + RLS native |
| ORM | **Prisma** | Migrations versionnées, type-safety |
| Auth | **Supabase Auth** (Magic Link + GitHub OAuth) | Pas de gestion de mots de passe = surface d'attaque réduite |
| Storage | **Supabase Storage** | Avatars, icônes badges, assets MDX |
| Realtime | **Supabase Realtime** | Notifications in-app live |
| Email | **Resend** + **React Email** | 3000 mails/mois gratuits, templates en JSX |
| PDF | **@react-pdf/renderer** | Génération côté serveur de certificats |
| Validation | **Zod** | Schémas de validation (entrées API, env, formulaires) |
| Forms | **React Hook Form** + Zod resolver | UX + validation |
| State serveur | **TanStack Query v5** | Cache, mutations, optimistic updates |
| MDX | **next-mdx-remote** + **rehype/remark plugins** | Contenu de leçons sécurisé |
| Code editor | **@monaco-editor/react** | VS Code dans le navigateur |
| Sandbox JS | **@webcontainer/api** | Node.js dans le navigateur |
| Sandbox Python | **Pyodide** (chargé en lazy depuis CDN épinglée) | Python WASM client-side |
| Terminal sim | **xterm.js** | Émulation terminal |
| Rate limiting | **@upstash/ratelimit** + Upstash Redis (free tier) | Limites par IP et user |
| Security headers | Middleware Next.js custom + **next-safe-middleware** | CSP, HSTS, etc. |
| Markdown sanitization | **rehype-sanitize** + schéma allowlist strict | Anti-XSS sur MDX |
| Cron jobs | **Vercel Cron** (free tier) | Notifications planifiées, révisions SM-2 |
| Monorepo | **Turborepo** | Cache de build, tasks parallèles |
| Package manager | **pnpm** | Workspaces, perf |
| i18n | **next-intl** | FR-first, scaffold pour EN |
| Testing | **Vitest** (unit) + **Playwright** (e2e) + **MSW** (API mocks) | Coverage critique sur la sécu et la gamification |
| Linting | **ESLint** + **Biome** + **TypeScript-ESLint** strict | Qualité de code |
| Git hooks | **Husky** + **lint-staged** + **Commitlint** | Gates qualité pré-commit |
| CI/CD | **GitHub Actions** + Vercel | SAST, lint, tests, build |
| SAST | **Semgrep** + **gitleaks** | Détection de secrets et patterns vulnérables |
| Hosting | **Vercel** (2 projets : web + admin) | Free tier, edge functions |
| Monitoring | **Sentry** (free tier) | Error tracking + performance |

### Versions épinglées (non négociables)

```
node: 22.x LTS
pnpm: 9.x
next: ^15.0.0
react: ^19.0.0
typescript: ^5.6.0
prisma: ^6.0.0
@supabase/supabase-js: ^2.45.0
```

---

## 3. Architecture monorepo

### Structure cible

```
cyberlearn/
├── apps/
│   ├── web/                      # Site public — cyberlearn.app
│   │   ├── app/
│   │   │   ├── (marketing)/      # Landing, pricing, about
│   │   │   ├── (auth)/           # Login, signup, callback
│   │   │   ├── (app)/            # App authentifiée
│   │   │   │   ├── dashboard/
│   │   │   │   ├── lessons/[slug]/
│   │   │   │   ├── paths/[slug]/
│   │   │   │   ├── profile/
│   │   │   │   ├── badges/
│   │   │   │   └── certificates/
│   │   │   ├── verify/[publicId]/  # Page publique de vérification cert
│   │   │   ├── api/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── lib/
│   │   ├── messages/             # next-intl (fr.json, en.json)
│   │   └── middleware.ts         # Auth + headers + rate limit
│   │
│   └── admin/                    # Dashboard admin — admin.cyberlearn.app
│       ├── app/
│       │   ├── (auth)/
│       │   ├── (admin)/
│       │   │   ├── dashboard/
│       │   │   ├── lessons/      # CRUD complet
│       │   │   ├── badges/
│       │   │   ├── paths/
│       │   │   ├── users/
│       │   │   ├── tickets/
│       │   │   ├── audit-log/
│       │   │   └── settings/
│       │   └── api/
│       └── middleware.ts         # Vérif rôle ADMIN obligatoire
│
├── packages/
│   ├── db/                       # Prisma schema + client + types
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── src/index.ts
│   │
│   ├── ui/                       # shadcn/ui partagés + composants custom
│   │   ├── components/
│   │   ├── hooks/
│   │   └── styles/
│   │
│   ├── types/                    # Types TS partagés (zod schemas)
│   ├── config/                   # Configs ESLint, TS, Tailwind partagées
│   ├── email/                    # Templates React Email
│   └── lib/                      # Utilitaires partagés (xp calc, sm2, etc.)
│
├── .github/workflows/            # CI: lint, test, sast, build
├── turbo.json
├── pnpm-workspace.yaml
├── .gitignore
├── .env.example                  # Documenté, JAMAIS de vraies valeurs
└── README.md
```

### Règles d'architecture

1. **Server-first** : tout ce qui peut être un Server Component **doit** l'être. Client Components uniquement quand interactivité requise (`"use client"` justifié).
2. **Server Actions** pour les mutations simples, **Route Handlers** (`app/api/`) uniquement pour les endpoints publics ou les webhooks.
3. **Aucun appel direct à Prisma depuis un Client Component**. Toujours via Server Action ou Route Handler.
4. **Aucune logique métier dans les composants UI**. Toute logique business va dans `packages/lib/` ou dans des services dédiés (`apps/web/lib/services/`).
5. **Pattern Repository** pour l'accès aux données : `packages/db/src/repositories/lesson.repository.ts` etc. Les services appellent les repositories, jamais Prisma directement.

---

## 4. Identité visuelle & Design System

### Palette de couleurs (ajustée pour accessibilité WCAG AA)

La charte fournie a des couleurs trop saturées pour du texte. Voici la palette **production** dérivée :

```css
/* tokens.css — design tokens */
:root {
  /* Brand — issus du logo */
  --brand-blue-roi: #0024FF;        /* CTA primaires uniquement, jamais sur texte */
  --brand-turquoise: #0AFFD4;        /* Accents, hover, glow */
  --brand-gradient: linear-gradient(135deg, #0024FF 0%, #0AFFD4 100%);

  /* Neutres dark mode (base) */
  --bg-base: #030219;                /* Fond principal — depuis charte */
  --bg-elevated: #0A0826;            /* Cards, modals */
  --bg-overlay: #110F33;             /* Hover states */
  --border-subtle: #1F1B47;
  --border-default: #2A2560;

  /* Texte */
  --text-primary: #F5F5FA;
  --text-secondary: #B8B5D1;
  --text-muted: #6B6890;
  --text-disabled: #3F3D5C;

  /* Sémantique */
  --success: #0AFFD4;                /* Réutilise le turquoise brand */
  --warning: #FFB020;
  --danger: #FF4D6D;
  --info: #4D8BFF;

  /* Raretés badges */
  --rarity-common: #B8B5D1;
  --rarity-rare: #4D8BFF;
  --rarity-epic: #B14DFF;
  --rarity-legendary: linear-gradient(135deg, #FFD700, #FF8C00);
}

[data-theme="light"] {
  --bg-base: #FFFFFF;
  --bg-elevated: #F8F9FC;
  --bg-overlay: #F0F2F8;
  --border-subtle: #E5E7F0;
  --border-default: #D1D5E0;
  --text-primary: #030219;
  --text-secondary: #4A4960;
  --text-muted: #8B8AA3;
  --text-disabled: #C8C7D6;
}
```

### Typographie

- **Titres** : `Geist Sans` (variable, via `next/font`)
- **Corps** : `Inter` (variable)
- **Code** : `JetBrains Mono` ou `Geist Mono`
- Échelle modulaire : 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60 / 72px
- Line-height : 1.5 pour le corps, 1.2 pour les titres

### Principes UX

1. **Dark mode par défaut**, switch light disponible (persisté en BDD pour les users authentifiés, en cookie sinon).
2. **Animations subtiles** : transitions 200-300ms, easing `cubic-bezier(0.16, 1, 0.3, 1)`. Respecter `prefers-reduced-motion`.
3. **Feedback immédiat** : toast (sonner) pour toute action utilisateur, optimistic updates partout où c'est pertinent.
4. **Accessibilité non négociable** :
   - Contraste WCAG AA minimum (AAA pour le texte courant)
   - Navigation clavier complète, focus rings visibles
   - ARIA labels sur tout élément interactif non-textuel
   - `lang="fr"` correct, structure de headings hiérarchique
5. **Mobile-first responsive** : breakpoints `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`.
6. **Skeleton loaders** plutôt que spinners.
7. **Empty states illustrés** systématiquement.

### Composants custom à créer (dans `packages/ui/`)

- `<XPBar />` — barre de progression XP avec animation de remplissage
- `<LevelBadge />` — badge circulaire avec niveau actuel
- `<RarityBadge />` — badge avec couleur selon rareté
- `<LessonCard />` — carte de leçon avec difficulté, durée, XP
- `<PathProgress />` — visualisation de parcours type "skill tree"
- `<CodeEditor />` — wrapper Monaco avec thème custom
- `<SimulatedTerminal />` — wrapper xterm.js avec commandes pré-définies
- `<QuizBlock />` — composant MDX pour quiz interactifs
- `<NotificationBell />` — cloche avec dropdown realtime
- `<CertificatePreview />` — aperçu du certificat avant impression

---

## 5. Modèle de données

### Schéma Prisma complet

> À placer dans `packages/db/prisma/schema.prisma`. Génère les migrations avec `pnpm db:migrate`.

```prisma
// packages/db/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["fullTextSearchPostgres"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================================
// USERS & AUTH
// ============================================================

enum UserRole {
  STUDENT
  ADMIN
}

model User {
  id           String   @id @db.Uuid // Lien direct avec auth.users de Supabase
  email        String   @unique
  username     String   @unique @db.VarChar(32)
  displayName  String   @db.VarChar(64)
  avatarUrl    String?
  bio          String?  @db.VarChar(280)
  role         UserRole @default(STUDENT)
  xpTotal      Int      @default(0)
  level        Int      @default(1)
  streakDays   Int      @default(0)
  lastActiveAt DateTime @default(now())
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  preferences      UserPreferences?
  lessonProgress   UserLessonProgress[]
  pathProgress     UserPathProgress[]
  badges           UserBadge[]
  certificates     Certificate[]
  notifications    Notification[]
  reviewSchedules  ReviewSchedule[]
  contactTickets   ContactTicket[]
  ratings          Rating[]
  questions        LessonQuestion[]
  answers          LessonAnswer[]
  auditLogs        AuditLog[]      @relation("ActorLogs")

  @@index([username])
  @@index([role])
  @@map("users")
}

model UserPreferences {
  userId              String  @id @db.Uuid
  theme               String  @default("dark") // "dark" | "light" | "system"
  locale              String  @default("fr")
  emailNotifications  Boolean @default(true)
  reviewReminders     Boolean @default(true)
  weeklyDigest        Boolean @default(true)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_preferences")
}

// ============================================================
// LESSONS & CONTENT
// ============================================================

enum Category {
  DEV
  CYBERSEC
  NETWORK
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

enum ContentStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model Lesson {
  id               String        @id @default(uuid()) @db.Uuid
  refCode          String        @unique // Format: CL-LSN-001-V01
  slug             String        @unique
  title            String        @db.VarChar(200)
  description      String        @db.VarChar(500)
  category         Category
  difficulty       Difficulty
  estimatedMinutes Int
  xpReward         Int
  contentMdx       String        @db.Text
  coverImageUrl    String?
  status           ContentStatus @default(DRAFT)
  version          Int           @default(1)
  authorId         String        @db.Uuid
  publishedAt      DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  pathLessons     PathLesson[]
  progress        UserLessonProgress[]
  reviewSchedules ReviewSchedule[]
  badgeRewards    LessonBadgeReward[]
  ratings         Rating[]
  questions       LessonQuestion[]
  prerequisites   LessonPrerequisite[] @relation("LessonPrerequisites")
  prerequisiteOf  LessonPrerequisite[] @relation("PrerequisiteOf")

  @@index([category, difficulty, status])
  @@index([slug])
  @@map("lessons")
}

model LessonPrerequisite {
  lessonId       String @db.Uuid
  prerequisiteId String @db.Uuid

  lesson       Lesson @relation("LessonPrerequisites", fields: [lessonId], references: [id], onDelete: Cascade)
  prerequisite Lesson @relation("PrerequisiteOf", fields: [prerequisiteId], references: [id], onDelete: Cascade)

  @@id([lessonId, prerequisiteId])
  @@map("lesson_prerequisites")
}

// ============================================================
// PATHS (PARCOURS)
// ============================================================

model Path {
  id                    String        @id @default(uuid()) @db.Uuid
  refCode               String        @unique // Format: CL-PATH-001-V01
  slug                  String        @unique
  title                 String        @db.VarChar(200)
  description           String        @db.VarChar(1000)
  category              Category
  difficulty            Difficulty
  estimatedHours        Int
  coverImageUrl         String?
  certificateTemplate   String?       // Référence template PDF
  certificateBadgeId    String?       @db.Uuid
  status                ContentStatus @default(DRAFT)
  version               Int           @default(1)
  publishedAt           DateTime?
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt

  lessons      PathLesson[]
  progress     UserPathProgress[]
  certificates Certificate[]
  ratings      Rating[]

  @@index([category, status])
  @@map("paths")
}

model PathLesson {
  pathId     String  @db.Uuid
  lessonId   String  @db.Uuid
  position   Int
  isRequired Boolean @default(true)

  path   Path   @relation(fields: [pathId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@id([pathId, lessonId])
  @@unique([pathId, position])
  @@map("path_lessons")
}

// ============================================================
// GAMIFICATION
// ============================================================

enum BadgeRarity {
  COMMON
  RARE
  EPIC
  LEGENDARY
}

enum BadgeCriterionType {
  LESSON_COMPLETED
  PATH_COMPLETED
  XP_THRESHOLD
  STREAK_DAYS
  CATEGORY_MASTERY
  PERFECT_QUIZ
  CUSTOM
}

model Badge {
  id            String      @id @default(uuid()) @db.Uuid
  refCode       String      @unique // Format: CL-BDG-001
  name          String      @unique @db.VarChar(100)
  description   String      @db.VarChar(500)
  iconUrl       String
  rarity        BadgeRarity
  criterionType BadgeCriterionType
  criterionData Json        // { lessonId: "...", count: 5, etc. }
  xpReward      Int         @default(0)
  isActive      Boolean     @default(true)
  createdAt     DateTime    @default(now())

  userBadges    UserBadge[]
  lessonRewards LessonBadgeReward[]

  @@map("badges")
}

model LessonBadgeReward {
  lessonId String @db.Uuid
  badgeId  String @db.Uuid

  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  badge  Badge  @relation(fields: [badgeId], references: [id], onDelete: Cascade)

  @@id([lessonId, badgeId])
  @@map("lesson_badge_rewards")
}

model UserBadge {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  badgeId   String   @db.Uuid
  earnedAt  DateTime @default(now())
  context   Json?    // Contexte d'obtention (lessonId, pathId...)

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  badge Badge @relation(fields: [badgeId], references: [id], onDelete: Cascade)

  @@unique([userId, badgeId])
  @@index([userId])
  @@map("user_badges")
}

// ============================================================
// RATINGS & Q&A (Social lié au contenu)
// ============================================================

// Rating : uniquement possible après COMPLETED (à enforcer côté service)
model Rating {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  lessonId  String?  @db.Uuid
  pathId    String?  @db.Uuid
  score     Int      @db.SmallInt // 1 à 5, validé par Zod côté service
  feedback  String?  @db.VarChar(500)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson? @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  path   Path?   @relation(fields: [pathId], references: [id], onDelete: Cascade)

  // Un user = un rating par leçon et un rating par parcours (update possible)
  @@unique([userId, lessonId])
  @@unique([userId, pathId])
  @@index([lessonId])
  @@index([pathId])
  @@map("ratings")
}

// Q&A contextualisé à une leçon (remplace un forum global)
model LessonQuestion {
  id         String   @id @default(uuid()) @db.Uuid
  lessonId   String   @db.Uuid
  userId     String   @db.Uuid
  title      String   @db.VarChar(200)
  content    String   @db.Text
  isResolved Boolean  @default(false)
  isHidden   Boolean  @default(false) // Soft-delete pour modération
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  lesson  Lesson         @relation(fields: [lessonId], references: [id], onDelete: Cascade)
  user    User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  answers LessonAnswer[]

  @@index([lessonId, isHidden])
  @@index([userId])
  @@map("lesson_questions")
}

model LessonAnswer {
  id         String   @id @default(uuid()) @db.Uuid
  questionId String   @db.Uuid
  userId     String   @db.Uuid
  content    String   @db.Text
  isAccepted Boolean  @default(false) // Marqué par l'auteur de la question
  isHidden   Boolean  @default(false) // Soft-delete pour modération
  upvotes    Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  question LessonQuestion @relation(fields: [questionId], references: [id], onDelete: Cascade)
  user     User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([questionId, isHidden])
  @@map("lesson_answers")
}

// ============================================================
// PROGRESS TRACKING
// ============================================================

enum ProgressStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
}

model UserLessonProgress {
  id               String         @id @default(uuid()) @db.Uuid
  userId           String         @db.Uuid
  lessonId         String         @db.Uuid
  status           ProgressStatus @default(IN_PROGRESS)
  attempts         Int            @default(0)
  bestScore        Int?           // 0-100
  timeSpentSeconds Int            @default(0)
  startedAt        DateTime       @default(now())
  completedAt      DateTime?
  lastAccessedAt   DateTime       @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
  @@index([userId, status])
  @@map("user_lesson_progress")
}

model UserPathProgress {
  id            String         @id @default(uuid()) @db.Uuid
  userId        String         @db.Uuid
  pathId        String         @db.Uuid
  status        ProgressStatus @default(IN_PROGRESS)
  startedAt     DateTime       @default(now())
  completedAt   DateTime?
  certificateId String?        @unique @db.Uuid

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  path        Path         @relation(fields: [pathId], references: [id], onDelete: Cascade)
  certificate Certificate? @relation(fields: [certificateId], references: [id])

  @@unique([userId, pathId])
  @@index([userId, status])
  @@map("user_path_progress")
}

// ============================================================
// CERTIFICATIONS
// ============================================================

model Certificate {
  id            String    @id @default(uuid()) @db.Uuid
  publicId      String    @unique @default(uuid()) @db.Uuid // Pour URL publique
  userId        String    @db.Uuid
  pathId        String    @db.Uuid
  issuedAt      DateTime  @default(now())
  expiresAt     DateTime? // Optionnel, si certif a une durée de validité
  sha256Hash    String    @unique // Hash du contenu pour vérification
  pdfStorageKey String    // Chemin dans Supabase Storage
  revokedAt     DateTime?
  revokedReason String?

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  path        Path              @relation(fields: [pathId], references: [id], onDelete: Cascade)
  pathProgress UserPathProgress?

  @@index([publicId])
  @@index([userId])
  @@map("certificates")
}

// ============================================================
// NOTIFICATIONS & SPACED REPETITION
// ============================================================

enum NotificationType {
  REVIEW_REMINDER
  BADGE_EARNED
  LEVEL_UP
  PATH_COMPLETED
  CERTIFICATE_ISSUED
  ANNOUNCEMENT
  TICKET_UPDATE
}

model Notification {
  id           String           @id @default(uuid()) @db.Uuid
  userId       String           @db.Uuid
  type         NotificationType
  title        String           @db.VarChar(200)
  body         String           @db.VarChar(1000)
  actionUrl    String?
  metadata     Json?
  scheduledFor DateTime         @default(now())
  sentAt       DateTime?
  readAt       DateTime?
  emailSent    Boolean          @default(false)
  createdAt    DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, readAt])
  @@index([scheduledFor, sentAt])
  @@map("notifications")
}

// SM-2 simplifié : ease factor + interval + repetitions
model ReviewSchedule {
  id             String   @id @default(uuid()) @db.Uuid
  userId         String   @db.Uuid
  lessonId       String   @db.Uuid
  easeFactor     Float    @default(2.5)
  intervalDays   Int      @default(1)
  repetitions    Int      @default(0)
  nextReviewAt   DateTime
  lastReviewedAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson Lesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
  @@index([nextReviewAt])
  @@map("review_schedules")
}

// ============================================================
// CONTACT & TICKETS (Jira sync)
// ============================================================

enum TicketTheme {
  BUG
  QUESTION
  FEATURE_REQUEST
  SECURITY
  CONTENT_ERROR
  OTHER
}

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

model ContactTicket {
  id            String       @id @default(uuid()) @db.Uuid
  userId        String?      @db.Uuid // Nullable pour invités
  email         String
  subject       String       @db.VarChar(200)
  theme         TicketTheme
  message       String       @db.Text
  jiraIssueKey  String?      @unique // ex: "CYBL-123"
  jiraIssueUrl  String?
  status        TicketStatus @default(OPEN)
  ipAddress     String?      // Hashé en SHA-256
  userAgent     String?      @db.VarChar(500)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([status])
  @@index([userId])
  @@map("contact_tickets")
}

// ============================================================
// AUDIT LOG (pour admin et conformité)
// ============================================================

model AuditLog {
  id         String   @id @default(uuid()) @db.Uuid
  actorId    String?  @db.Uuid
  action     String   @db.VarChar(100) // "lesson.create", "user.role.update", etc.
  targetType String   @db.VarChar(50)
  targetId   String?
  metadata   Json?
  ipAddress  String?  // Hashé
  userAgent  String?  @db.VarChar(500)
  createdAt  DateTime @default(now())

  actor User? @relation("ActorLogs", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([actorId, createdAt])
  @@index([targetType, targetId])
  @@index([action, createdAt])
  @@map("audit_logs")
}
```

### Politiques RLS (Row Level Security) Supabase

> **À activer sur TOUTES les tables.**
>
> **OBSOLÈTE (flow)** : le fichier `post_prisma_rls.sql` « à exécuter après
> chaque migrate » n'existe plus. Depuis la migration
> `packages/db/prisma/migrations/20260610200000_rls_baseline/`, les policies
> sont versionnées DANS la chaîne de migrations Prisma et appliquées par
> `prisma migrate deploy` — source canonique : ce fichier de migration, pas
> le snapshot historique ci-dessous (liste de tables incomplète).

```sql
-- Snapshot historique du brief (spec d'origine, conservé pour référence)

-- Activation RLS sur toutes les tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_path_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Helper : récupérer le rôle depuis le JWT
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT (auth.jwt() ->> 'user_role')::text;
$$;

-- USERS : lecture publique limitée (username, level, avatar), écriture self only
CREATE POLICY "users_select_public" ON public.users FOR SELECT
  USING (true);

CREATE POLICY "users_update_self" ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.users WHERE id = auth.uid()));

CREATE POLICY "users_admin_all" ON public.users FOR ALL
  USING (current_user_role() = 'ADMIN');

-- LESSONS : lecture publique des PUBLISHED, admin pour tout
CREATE POLICY "lessons_select_published" ON public.lessons FOR SELECT
  USING (status = 'PUBLISHED' OR current_user_role() = 'ADMIN');

CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL
  USING (current_user_role() = 'ADMIN');

-- USER_LESSON_PROGRESS : self only
CREATE POLICY "progress_self_select" ON public.user_lesson_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "progress_self_insert" ON public.user_lesson_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "progress_self_update" ON public.user_lesson_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- CERTIFICATES : lecture publique par publicId (pour vérification), écriture admin
CREATE POLICY "certificates_select_public" ON public.certificates FOR SELECT
  USING (true);

CREATE POLICY "certificates_admin_write" ON public.certificates FOR ALL
  USING (current_user_role() = 'ADMIN');

-- NOTIFICATIONS : self only
CREATE POLICY "notifications_self" ON public.notifications FOR ALL
  USING (auth.uid() = user_id);

-- AUDIT_LOGS : lecture admin only, écriture via service role uniquement
CREATE POLICY "audit_admin_select" ON public.audit_logs FOR SELECT
  USING (current_user_role() = 'ADMIN');

-- CONTACT_TICKETS : insert public, lecture self ou admin
CREATE POLICY "tickets_insert_public" ON public.contact_tickets FOR INSERT
  WITH CHECK (true);

CREATE POLICY "tickets_self_select" ON public.contact_tickets FOR SELECT
  USING (auth.uid() = user_id OR current_user_role() = 'ADMIN');

-- (Compléter pour TOUTES les tables — aucune table sans policy)
```

> **Le rôle `user_role` doit être injecté dans le JWT Supabase via un Auth Hook custom (Edge Function) qui lit `users.role` et l'ajoute aux claims.**

---

## 6. Sécurité — Exigences non négociables

### 6.1 Validation des entrées (OWASP A03)

- **Toute** entrée utilisateur passe par un schéma Zod avant traitement
- Schémas définis dans `packages/types/src/schemas/`
- Côté serveur **ET** côté client (les deux sont nécessaires : client pour UX, serveur pour sécu)
- `safeParse` toujours, jamais `parse` direct (gestion d'erreur explicite)

```typescript
// Exemple : packages/types/src/schemas/lesson.schema.ts
import { z } from "zod";

export const createLessonSchema = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug invalide").min(3).max(100),
  description: z.string().trim().min(10).max(500),
  category: z.enum(["DEV", "CYBERSEC", "NETWORK"]),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]),
  estimatedMinutes: z.number().int().positive().max(600),
  xpReward: z.number().int().nonnegative().max(10000),
  contentMdx: z.string().min(50).max(100_000),
});

export type CreateLessonInput = z.infer<typeof createLessonSchema>;
```

### 6.2 Gestion des secrets

- **Aucun** secret en dur dans le code. Période.
- `.env.local` (gitignored) pour le dev, **secrets Vercel** pour la prod
- Validation au démarrage avec Zod via `@t3-oss/env-nextjs`
- `.env.example` documente toutes les variables sans valeurs

```typescript
// apps/web/lib/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    RESEND_API_KEY: z.string().startsWith("re_"),
    JIRA_API_TOKEN: z.string().min(1),
    JIRA_BASE_URL: z.string().url(),
    JIRA_PROJECT_KEY: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    SENTRY_DSN: z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    // ...
  },
});
```

### 6.3 Authentification & sessions

- Magic Link via Supabase Auth comme méthode par défaut (zéro mot de passe)
- GitHub OAuth en second
- Cookies session : `httpOnly`, `secure`, `sameSite: lax`, `path: /`
- Pas de localStorage pour les tokens
- Middleware de refresh token automatique
- **Logout effectif côté serveur** (révocation Supabase)
- Auth hook Supabase pour injecter `user_role` dans le JWT

### 6.4 Autorisation

- Vérification de rôle dans le middleware admin (rejette tout non-ADMIN avec 404, pas 403, pour ne pas révéler l'existence de la route)
- RLS Postgres comme deuxième couche (defense in depth)
- Fonction helper `requireAdmin()` à appeler en haut de chaque Server Action admin

```typescript
// packages/lib/src/auth/guards.ts
import { createServerClient } from "@cyberlearn/db/supabase";
import { redirect } from "next/navigation";

export async function requireUser() {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  const role = user.app_metadata?.user_role;
  if (role !== "ADMIN") {
    // 404 plutôt que 403 pour ne pas révéler l'existence de la route
    notFound();
  }
  return user;
}
```

### 6.5 Protection contre les attaques OWASP Top 10

| OWASP | Mesure |
|---|---|
| **A01 Broken Access Control** | RLS Postgres + middleware + guards Server Actions + tests |
| **A02 Cryptographic Failures** | TLS only, pas de crypto custom, hash IP en SHA-256 pour audit log |
| **A03 Injection** | Prisma (paramétré), Zod validation, sanitization MDX via rehype-sanitize avec schéma allowlist strict |
| **A04 Insecure Design** | Threat modeling avant chaque feature critique (auth, certif, admin) |
| **A05 Security Misconfiguration** | Headers stricts, CSP, env validation, prod ≠ dev |
| **A06 Vulnerable Components** | `pnpm audit` en CI, Dependabot, Semgrep |
| **A07 Auth Failures** | Magic link, rate limit auth (5 tentatives/15min/IP), pas de userEnum |
| **A08 Software & Data Integrity** | SRI sur CDN externes, signature des certifs, audit log |
| **A09 Logging Failures** | Sentry + audit log + structured logs (Pino), JAMAIS de PII en clair |
| **A10 SSRF** | Pas de fetch user-controlled URLs, allowlist pour images externes via `next.config.js` |

### 6.6 Headers de sécurité (middleware Next.js)

```typescript
// apps/web/middleware.ts (extrait headers)
const securityHeaders = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval' https://cdn.jsdelivr.net", // jsdelivr pour Pyodide
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://*.supabase.co https://avatars.githubusercontent.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};
```

### 6.7 Rate limiting

- **Auth endpoints** : 5 req / 15 min / IP
- **API publiques** : 60 req / min / IP
- **Contact form** : 3 soumissions / heure / IP
- **API authentifiées** : 200 req / min / user
- Implémentation via `@upstash/ratelimit` avec Redis Upstash

### 6.8 Sandboxing du code utilisateur

- **Pyodide** : exécution dans un Web Worker isolé, timeout 10s, pas d'accès réseau, mémoire limitée
- **WebContainers** : iframe sandboxée avec `allow-scripts allow-same-origin` uniquement, jamais `allow-top-navigation`
- Pas de transmission du code utilisateur au serveur (tout client-side)
- Les "réponses attendues" stockées hashées en BDD, comparées via hash pour la validation

### 6.9 Sanitization MDX

- **JAMAIS** de raw HTML autorisé dans le MDX (pas de balises `<script>`, `<iframe>`, etc.)
- Schéma `rehype-sanitize` avec **allowlist** stricte des composants MDX custom autorisés
- Compilation MDX **server-side uniquement**, jamais en runtime côté client avec contenu user

### 6.10 Audit log

- Toute action admin loggée (qui, quoi, quand, sur quoi)
- IP hashée en SHA-256 + sel applicatif (RGPD : pseudonymisation)
- Conservation 1 an glissant
- Consultable depuis le dashboard admin avec filtres

---

## 7. Fonctionnalités détaillées

### 7.1 Authentification & Onboarding

- Page `/login` avec choix Magic Link / GitHub
- Page `/auth/callback` qui finalise la session et redirige
- Onboarding obligatoire au premier login : choix username, displayName, avatar
- Profile public sur `/u/{username}` (lecture publique : niveau, badges, certifs visibles)

**Placement Test (optionnel, en fin d'onboarding)** :

Quiz de 10-15 questions couvrant les 3 catégories (DEV, CYBERSEC, NETWORK) à 3 niveaux de difficulté. **Ce test ne distribue AUCUN XP et ne marque AUCUNE leçon comme `COMPLETED`.** Son rôle est strictement **indicatif et déblocant** :

1. **Recommandation de point d'entrée** : en fonction du score par catégorie, la plateforme recommande un parcours de départ (ex: "Tu sembles à l'aise avec le dev, commence directement par le parcours `CL-PATH-005-V01 — Cybersécurité intermédiaire`").
2. **Déblocage ciblé des prérequis** : les leçons de niveau `BEGINNER` et `INTERMEDIATE` des catégories où le user a prouvé sa maîtrise sont marquées comme "prérequis satisfaits" via une table dédiée `UserSkipWaiver` (à ajouter si besoin). Concrètement : le user peut accéder aux leçons avancées sans avoir fait les basiques, mais s'il les fait il gagne quand même l'XP normalement.
3. **Badge spécial "Quick Start"** : attribué si le user réussit le placement test, sans impact sur les métriques de progression.

> **Motivation de ce choix** : auto-valider des leçons non lues fausse les analytics (taux de complétion, engagement), pollue le spaced repetition (SM-2 programme des révisions de contenu jamais vu), et dévalue les certifications. Le mode "recommandation + déblocage" préserve l'UX "je ne perds pas mon temps" tout en gardant l'intégrité du système de progression.

### 7.2 Leçons interactives

**Structure d'une leçon MDX** (composants custom autorisés) :

```mdx
---
title: "Introduction aux injections SQL"
---

# Bienvenue

<Callout type="info">
  Cette leçon couvre les bases de SQLi.
</Callout>

## Théorie

Texte markdown classique...

<CodePlayground language="python" initialCode={`
def vulnerable_query(user_input):
    query = f"SELECT * FROM users WHERE name = '{user_input}'"
    return query
`} />

## Mise en pratique

<SimulatedTerminal
  scenario="sqli-basic"
  expectedCommands={["sqlmap -u ...", "--dbs"]}
/>

## Quiz

<Quiz>
  <Question id="q1" type="single">
    Quelle est la première règle pour prévenir SQLi ?
    <Choice correct>Utiliser des requêtes paramétrées</Choice>
    <Choice>Échapper les guillemets manuellement</Choice>
    <Choice>Filtrer les mots-clés SQL</Choice>
  </Question>
</Quiz>
```

**Composants MDX à implémenter** : `<Callout />`, `<CodePlayground />`, `<SimulatedTerminal />`, `<Quiz />`, `<Question />`, `<Choice />`, `<Diagram />`, `<Hint />`, `<Spoiler />`, `<KeyboardShortcut />`.

**Validation de complétion** : une leçon est marquée `COMPLETED` quand tous les quiz sont validés ET que les exercices sandbox passent (vérification client-side + report serveur via Server Action signée).

### 7.3 Système d'XP & niveaux

**Formule de niveau** : `xp_for_level(n) = floor(100 * (n ^ 1.5))`. À placer dans `packages/lib/src/gamification/levels.ts`.

```typescript
// packages/lib/src/gamification/levels.ts
const MAX_LEVEL = 100;

export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function levelFromXp(totalXp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && totalXp >= xpRequiredForLevel(level + 1)) {
    level++;
  }
  return level;
}

export function xpProgressInLevel(totalXp: number) {
  const currentLevel = levelFromXp(totalXp);
  const currentLevelXp = xpRequiredForLevel(currentLevel);
  const nextLevelXp = xpRequiredForLevel(currentLevel + 1);
  return {
    currentLevel,
    currentXp: totalXp - currentLevelXp,
    requiredXp: nextLevelXp - currentLevelXp,
    percentage: ((totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100,
  };
}
```

**Attribution d'XP** : via une Server Action `awardXp(userId, lessonId, amount)` qui met à jour `users.xpTotal`, recalcule le niveau, et déclenche les badges éligibles dans une **transaction Postgres** (atomicité critique).

### 7.4 Badges

- Définis en BDD avec `criterionType` + `criterionData` JSON
- Évaluation **après chaque action** susceptible de déclencher un badge (via service `BadgeEvaluator`)
- Notification envoyée automatiquement à l'obtention
- 4 raretés avec icônes différenciées
- Page `/badges` : grille de tous les badges (obtenus en couleur, non obtenus en silhouette grise)

### 7.5 Parcours & certifications

- Un parcours = liste ordonnée de leçons (certaines optionnelles)
- Progression calculée sur les leçons `isRequired = true`
- À 100% → génération du certificat :
  1. Calcul du contenu : nom, parcours, date, hash
  2. Génération PDF avec `@react-pdf/renderer`
  3. Hash SHA-256 du PDF stocké en BDD
  4. Upload Supabase Storage
  5. Création row `certificates`
  6. Notification user
- **Page de vérification publique** `/verify/{publicId}` : affiche les infos du certif + bouton "Télécharger PDF" + statut (valide / révoqué / expiré)
- QR code généré par `qrcode` (npm) intégré dans le PDF, pointant vers la page de vérification

### 7.6 Notifications

**Types** :
- `REVIEW_REMINDER` (planifiée par SM-2)
- `BADGE_EARNED`
- `LEVEL_UP`
- `PATH_COMPLETED`
- `CERTIFICATE_ISSUED`
- `ANNOUNCEMENT` (admin → tous)
- `TICKET_UPDATE`

**Canaux** :
- **In-app** : table `notifications` + Supabase Realtime → `<NotificationBell />` dans le header
- **Email** : Resend + templates React Email, opt-in/opt-out par type dans `UserPreferences`

**Spaced Repetition (SM-2 simplifié — sur micro-quiz)** :

> **Principe clé** : la révision ne demande **jamais** à l'utilisateur de refaire une leçon entière. Chaque leçon génère automatiquement un **micro-quiz de révision** de 3 à 5 questions (sélectionnées aléatoirement depuis le pool de questions de la leçon ou définies explicitement par l'auteur dans un bloc MDX `<ReviewQuiz>`). Objectif : **2 minutes max par révision**.

- Après chaque leçon complétée → création d'un `ReviewSchedule` avec `intervalDays = 1`
- Cron Vercel quotidien `/api/cron/review-reminders` :
  1. Sélectionne tous les `review_schedules` avec `nextReviewAt <= NOW()`
  2. Crée une notification `REVIEW_REMINDER` avec deep-link vers `/lessons/[slug]/review` (pas la leçon complète)
  3. Met à jour `lastReviewedAt`
- Quand l'utilisateur lance la révision, il voit uniquement le **micro-quiz**, pas le contenu pédagogique :
  - Réussite (score ≥ 80%) → `intervalDays = ceil(intervalDays * easeFactor)`, `repetitions++`, `easeFactor = min(2.5, easeFactor + 0.1)`
  - Échec (score < 80%) → `intervalDays = 1`, `repetitions = 0`, `easeFactor = max(1.3, easeFactor - 0.2)`, notification suggérant de **relire** la leçon
  - `nextReviewAt = NOW() + intervalDays days`
- Attribution d'XP sur révision : **XP réduit** (ex: 10% de l'XP initial de la leçon) pour récompenser sans encourager le farming

### 7.7 Formulaire de contact → Jira

**Page** : `/contact`
**Champs** : email, sujet, thème (select), message, captcha (Cloudflare Turnstile, free)

**Flow** :
1. Soumission via Server Action
2. Validation Zod + vérification Turnstile
3. Rate limit (3/h/IP)
4. Création row `contact_tickets`
5. Appel API Jira `POST /rest/api/3/issue` avec :
   ```json
   {
     "fields": {
       "project": { "key": "CYBL" },
       "summary": "[{theme}] {subject}",
       "description": "{adf format}",
       "issuetype": { "name": "Task" },
       "labels": ["cyberlearn", "{theme.lowercase}"]
     }
   }
   ```
6. Update du ticket avec `jiraIssueKey`
7. Email de confirmation à l'utilisateur via Resend
8. Toast de succès

**Variables d'env Jira nécessaires** :
```
JIRA_BASE_URL=https://votre-domaine.atlassian.net
JIRA_PROJECT_KEY=CYBL
JIRA_API_EMAIL=admin@cyberlearn.app
JIRA_API_TOKEN=xxx (depuis https://id.atlassian.com/manage-profile/security/api-tokens)
```

### 7.8 Social contextualisé (ratings, Q&A, first blood)

> **Principe directeur** : toute fonctionnalité sociale est **rattachée à un contenu pédagogique** (une leçon ou un parcours). Aucun forum global, aucun chat détaché. Cela garantit que l'entraide reste utile même avec peu d'activité, et réduit drastiquement la surface de modération.

#### 7.8.1 Ratings (notation 1-5 étoiles)

- **Éligibilité stricte** : un user peut noter une leçon ou un parcours **uniquement si** son `UserLessonProgress.status` ou `UserPathProgress.status` est `COMPLETED`. Vérification dans le service, **pas seulement** dans l'UI.
- Un rating = 1 score (1-5) + feedback optionnel (500 chars max, sanitizé)
- Un user peut **mettre à jour** son rating (pas en créer un second), contrainte `@@unique([userId, lessonId])`
- Moyenne dynamique affichée sur la page de la leçon, recalculée à chaque nouveau rating via une vue matérialisée Postgres ou un champ agrégé sur `Lesson` (`avgRating`, `ratingsCount`) mis à jour en transaction
- Admin peut masquer un rating abusif (champ `isHidden` si tu veux l'ajouter, sinon soft-delete)

#### 7.8.2 Q&A par leçon

- Sous chaque leçon : onglet "Questions" (compteur visible)
- Un user authentifié peut poser une question (titre + contenu markdown limité)
- Réponses multiples possibles, tri par nombre d'upvotes
- **L'auteur de la question** peut marquer une réponse comme `isAccepted` (une seule à la fois)
- Modération : admin peut `isHidden = true` sur question ou réponse (soft-delete préservé pour audit)
- Rate limiting : 5 questions / jour / user, 20 réponses / jour / user
- Sanitization du markdown avec la même pipeline allowlist que les leçons
- Notification à l'auteur de la question quand une réponse est postée
- Notification au répondant quand sa réponse est acceptée
- **Pas de fil global** : l'accès aux questions passe **toujours** par une leçon

#### 7.8.3 First Blood

- Sur la page d'une leçon, section "Premiers à finir" affichant les avatars des 3 premiers users ayant complété la leçon (tri `completedAt ASC` sur `UserLessonProgress` où `status = COMPLETED`)
- Purement cosmétique : pas de badge spécial lié à ça (sauf si tu veux en créer un via l'admin plus tard, auquel cas le `BadgeEvaluator` gère déjà le critère `CUSTOM`)
- Lien vers le profil public des users affichés
- Respecter les préférences de visibilité : si un user a désactivé `publicProfile`, l'afficher en anonyme (avatar + "Utilisateur anonyme")

### 7.9 Dashboard admin

App séparée dans `apps/admin/`. Sections :

1. **Overview** : stats globales (users, leçons publiées, certifs émis, tickets ouverts)
2. **Lessons** : DataTable avec filtres, CRUD, éditeur MDX intégré (voir section 7.9.1 ci-dessous), gestion versions
3. **Paths** : CRUD + drag & drop pour ordonner les leçons
4. **Badges** : CRUD avec preview du critère
5. **Users** : recherche, modification de rôle (avec confirmation + audit log), bannissement
6. **Tickets** : liste sync avec Jira (lecture seule), liens vers Jira
7. **Audit Log** : table filtrable et exportable CSV
8. **Settings** : config globale (textes légaux, FAQ, etc.)

#### 7.9.1 Éditeur de leçons MDX intégré

L'objectif est qu'un administrateur puisse **écrire et prévisualiser une leçon entière sans quitter le navigateur**, sans connaître la syntaxe MDX par cœur.

**Layout** : interface deux panneaux côte à côte (redimensionnables) :
- **Panneau gauche — Éditeur** : éditeur de code basé sur **CodeMirror 6** (plus léger que Monaco pour du texte pur, pas besoin de LSP ici). Fonctionnalités :
  - Coloration syntaxique MDX (Markdown + JSX)
  - Numéros de ligne, indentation automatique
  - Raccourcis clavier courants : `Ctrl+B` → `**gras**`, `Ctrl+I` → `*italique*`, `Ctrl+K` → `[texte](url)`
  - Barre d'outils au-dessus de l'éditeur avec boutons pour insérer les composants MDX custom (voir ci-dessous)

- **Panneau droit — Prévisualisation live** : rendu MDX en temps réel (debounce 300ms) via `next-mdx-remote/rsc` ou un composant client dédié. Affiche exactement ce que verra l'étudiant, **avec les composants interactifs fonctionnels** (`<Callout />`, `<Quiz />`, etc. — les sandboxes de code sont désactivées en preview pour performance).

**Palette de composants MDX** : une barre latérale ou un menu déroulant `+ Insérer` listant les composants disponibles avec un clic qui insère le snippet MDX correspondant à la position du curseur :

| Composant | Snippet inséré |
|---|---|
| Callout info | `<Callout type="info">\n  \n</Callout>` |
| Callout warning | `<Callout type="warning">\n  \n</Callout>` |
| CodePlayground Python | `<CodePlayground language="python" initialCode={\`\n\`} />` |
| CodePlayground JS | `<CodePlayground language="javascript" initialCode={\`\n\`} />` |
| Terminal simulé | `<SimulatedTerminal scenario="" expectedCommands={[]} />` |
| Quiz | Bloc `<Quiz>` avec une `<Question>` et deux `<Choice>` |
| Hint | `<Hint>\n  \n</Hint>` |
| Spoiler | `<Spoiler>\n  \n</Spoiler>` |
| Diagram | `<Diagram src="" alt="" />` |

**Frontmatter assisté** : formulaire structuré au-dessus de l'éditeur (pas dans le MDX) pour les métadonnées de la leçon (title, slug, category, difficulty, estimatedMinutes, xpReward, coverImageUrl, status). Le frontmatter est **séparé du corps MDX** côté admin : les métadonnées alimentent directement les colonnes Prisma, le corps MDX (`contentMdx`) est géré dans l'éditeur.

**Sauvegarde** :
- Bouton "Enregistrer brouillon" → `status: DRAFT`, pas de notification aux users
- Bouton "Publier" → `status: PUBLISHED` avec confirmation modale + audit log
- Auto-save toutes les 60s en mode brouillon (avec indicateur visuel "Sauvegardé il y a Xs")

**Dépendance à ajouter** : `@codemirror/lang-markdown` + `@uiw/react-codemirror` (wrapper React pour CodeMirror 6). À valider avant d'introduire (hors stack initiale).

> **Pourquoi CodeMirror plutôt que Monaco pour l'éditeur admin ?** Monaco est conservé pour le `<CodePlayground />` étudiant (nécessite LSP, IntelliSense, thème VS Code). Pour l'éditeur de contenu MDX, CodeMirror 6 est nettement plus léger (~300 KB vs ~4 MB), s'intègre mieux dans une interface de gestion de contenu, et dispose d'une meilleure extension pour le Markdown. Les deux coexistent sans conflit.

**Sécurité spécifique admin** :
- Middleware vérifie rôle ADMIN sur toutes les routes
- Toutes les mutations passent par Server Actions avec `requireAdmin()`
- Audit log automatique via wrapper de mutations
- Confirmation modale pour toute action destructive
- Header CSP encore plus strict

---

## 8. Roadmap incrémentale (PHASES)

> **Travaille phase par phase. À la fin de chaque phase, livre :**
> 1. Le code fonctionnel
> 2. Les tests associés
> 3. Une checklist de vérification cochée
> 4. Un récap de ce qui a été fait + ce qui reste en TODO
> **Ne passe à la phase suivante qu'après ma validation explicite.**

### Phase 0 — Fondations (1-2 jours)

**Livrables** :
- Init monorepo Turborepo + pnpm workspaces
- Création des packages `db`, `ui`, `types`, `lib`, `email`, `config`
- Setup TypeScript strict, ESLint, Biome, Prettier, Husky, Commitlint
- Setup Vitest dans chaque package
- Validation env via `@t3-oss/env-nextjs`
- `.env.example` documenté
- README avec instructions de setup
- GitHub Actions CI : lint + typecheck + test + build

**Critères d'acceptation** :
- [ ] `pnpm install` fonctionne sans warning
- [ ] `pnpm lint` passe
- [ ] `pnpm typecheck` passe avec strict mode
- [ ] `pnpm test` passe (même si juste un test trivial)
- [ ] CI verte sur PR

### Phase 1 — BDD & Auth (2-3 jours)

**Livrables** :
- Setup projet Supabase + récupération des credentials
- Schéma Prisma complet
- Migrations Prisma générées
- Policies RLS versionnées dans la chaîne de migrations Prisma (depuis `20260610200000_rls_baseline`)
- Auth Hook Supabase (Edge Function) pour injecter `user_role` dans le JWT
- Pages `/login`, `/auth/callback`, `/onboarding`
- Magic Link + GitHub OAuth fonctionnels
- Middleware d'auth dans `apps/web`
- Helpers `requireUser()` et `requireAdmin()`
- **Placement Test optionnel** en fin d'onboarding (quiz statique seedé, 10-15 questions sur les 3 catégories) qui génère une recommandation de parcours et débloque les prérequis ciblés — **sans jamais marquer de leçon COMPLETED ni distribuer d'XP**
- Seed de dev : 1 admin + 2 students + 5 leçons + 2 parcours + 10 badges + 1 placement test

**Critères d'acceptation** :
- [ ] Login magic link end-to-end fonctionnel
- [ ] Login GitHub fonctionnel
- [ ] RLS testée : un user ne peut PAS lire les progress d'un autre user (test e2e)
- [ ] Le rôle est bien dans le JWT
- [ ] Logout révoque la session côté Supabase
- [ ] Onboarding obligatoire enforcé
- [ ] Placement test : score high en CYBERSEC → parcours cyber recommandé, aucune leçon marquée COMPLETED, aucun XP attribué (vérifié en BDD)

### Phase 2 — Design System (2 jours)

**Livrables** :
- Setup Tailwind v4 + tokens CSS dans `packages/ui`
- Configuration shadcn/ui partagée
- Composants de base : Button, Input, Card, Dialog, Toast (sonner), DataTable
- Composants brand : `<XPBar />`, `<LevelBadge />`, `<RarityBadge />`
- Layout principal : Navbar, Sidebar, Footer
- Dark/Light theme switcher avec persistance
- Page Storybook OU page `/dev/components` listant tous les composants

**Critères d'acceptation** :
- [ ] Lighthouse accessibility ≥ 95 sur la page de démo
- [ ] Tous les composants ont un état dark + light
- [ ] Navigation clavier complète
- [ ] `prefers-reduced-motion` respecté

### Phase 3 — Leçons (lecture) (2-3 jours)

**Livrables** :
- Page `/lessons` : liste avec filtres (catégorie, difficulté, statut)
- Page `/lessons/[slug]` : rendu MDX (sans composants interactifs encore)
- Système de progression : start lesson → in_progress, scroll tracking
- Composant `<LessonCard />`
- Pipeline MDX sécurisée : remark + rehype + rehype-sanitize avec allowlist
- Repository pattern : `LessonRepository` dans `packages/db`

**Critères d'acceptation** :
- [ ] Aucune leçon DRAFT visible côté public
- [ ] MDX render correctement avec syntax highlighting
- [ ] Tentative d'injection HTML dans MDX → bloquée
- [ ] Test e2e : lecture d'une leçon → progress passe à IN_PROGRESS

### Phase 4 — Composants interactifs (3-4 jours)

**Livrables** :
- `<CodePlayground />` : Monaco + exécution Pyodide ou WebContainers selon langage
- `<SimulatedTerminal />` : xterm.js avec scénarios prédéfinis
- `<Quiz />` `<Question />` `<Choice />`
- Pyodide chargé en lazy avec SRI
- Validation de complétion : tous les quiz passés + tous les exos validés
- Server Action `completeLesson(lessonId)` qui attribue l'XP

**Critères d'acceptation** :
- [ ] Pyodide tourne dans un Worker isolé avec timeout
- [ ] Code utilisateur jamais envoyé au serveur
- [ ] Complétion d'une leçon → XP attribuée → niveau recalculé
- [ ] Tests unit sur `levelFromXp()` et `xpRequiredForLevel()`

### Phase 5 — Gamification (2 jours)

**Livrables** :
- Service `BadgeEvaluator` qui évalue tous les badges éligibles après une action
- Triggers : après `awardXp`, après `completeLesson`, après `completePathProgress`
- Page `/badges` : grille de tous les badges
- Page `/profile` : XP, niveau, badges, streak, leçons complétées
- Profile public `/u/{username}`
- Streak system : incrémenté si activité quotidienne, reset sinon (cron)
- **First Blood** : affichage des 3 premiers finishers sur chaque page de leçon (requête triée sur `UserLessonProgress` filtrée `status = COMPLETED`, `ORDER BY completedAt ASC LIMIT 3`), avec respect de la préférence de visibilité du profil

**Critères d'acceptation** :
- [ ] Badge attribué exactement une fois (unique constraint)
- [ ] Notification `BADGE_EARNED` créée à l'attribution
- [ ] Notification `LEVEL_UP` créée à chaque montée de niveau
- [ ] Streak correct sur 7 jours simulés
- [ ] First Blood : test e2e simulant 5 users terminant une leçon, vérifier que seuls les 3 premiers apparaissent

### Phase 6 — Parcours & Certificats (2-3 jours)

**Livrables** :
- Page `/paths` + `/paths/[slug]` avec visualisation skill-tree
- Tracking de progression de parcours
- À 100% → génération PDF via `@react-pdf/renderer`
- Hash SHA-256 + upload Supabase Storage
- Page publique `/verify/[publicId]`
- QR code dans le PDF

**Critères d'acceptation** :
- [ ] Certificat généré uniquement quand 100% des leçons required terminées
- [ ] Hash vérifiable depuis la page publique
- [ ] QR code scannable et fonctionnel
- [ ] Téléchargement PDF depuis le profil

### Phase 6 bis — Entraide & Feedback (1-2 jours)

**Livrables** :
- Implémentation du modèle `Rating` + service `RatingService`
  - `createOrUpdateRating(userId, targetType, targetId, score, feedback)` avec **enforcement strict** : vérification que le progress associé est `COMPLETED` avant d'autoriser
  - Recalcul de la moyenne (`avgRating`, `ratingsCount`) en transaction sur la ligne parente (`Lesson` ou `Path`)
  - UI : composant `<RatingStars />` + modale de feedback
  - Affichage de la moyenne + nombre de votes sur les cartes et pages détail
- Implémentation du Q&A par leçon (modèles `LessonQuestion` + `LessonAnswer`)
  - Onglet "Questions" sur chaque page de leçon
  - Composants `<QuestionList />`, `<QuestionForm />`, `<AnswerThread />`
  - Service `QnAService` avec sanitization markdown (même pipeline que MDX leçons)
  - Rate limiting : 5 questions/jour/user, 20 réponses/jour/user
  - Action `acceptAnswer` réservée à l'auteur de la question
  - Notifications in-app + email : nouvelle réponse sur ma question / ma réponse acceptée
  - Actions de modération admin : `hideQuestion`, `hideAnswer`, toutes loggées dans `audit_logs`

**Critères d'acceptation** :
- [ ] Un user NON COMPLETED ne peut pas noter (test e2e : tentative de POST → 403)
- [ ] Un user NON COMPLETED ne voit pas le bouton "Noter cette leçon"
- [ ] Update d'un rating existant fonctionne (pas de duplication)
- [ ] `avgRating` recalculé correctement après création/update/suppression
- [ ] Q&A : markdown XSS injecté → sanitizé (test unitaire sur le service)
- [ ] Rate limit Q&A déclenche une 429 après le 6e post dans la journée
- [ ] Accept answer : seul l'auteur peut, tentative d'un autre user → 403
- [ ] `isHidden` : question masquée → invisible au public, visible admin


### Phase 7 — Notifications & SM-2 (2 jours)

**Livrables** :
- Table `notifications` + Realtime subscription
- `<NotificationBell />` avec dropdown
- Templates React Email pour chaque type
- Service `NotificationService` (createInApp + sendEmail)
- Cron Vercel `/api/cron/review-reminders` (quotidien)
- Cron Vercel `/api/cron/streak-reset` (quotidien minuit)
- Implémentation SM-2 dans `packages/lib/src/gamification/sm2.ts`
- Préférences user : opt-in/out par type

**Critères d'acceptation** :
- [ ] Notification in-app reçue en temps réel sans refresh
- [ ] Email de bienvenue envoyé après onboarding
- [ ] Cron testable en local (`pnpm cron:review-reminders`)
- [ ] Tests unit sur l'algo SM-2

### Phase 8 — Contact & Jira (1-2 jours)

**Livrables** :
- Page `/contact` avec formulaire
- Intégration Cloudflare Turnstile
- Service `JiraService` pour création d'issues
- Email de confirmation à l'utilisateur
- Rate limiting 3/h/IP

**Critères d'acceptation** :
- [ ] Soumission → ticket en BDD + issue Jira créée
- [ ] Lien Jira retourné dans la réponse
- [ ] Captcha bloque les bots
- [ ] Rate limit déclenche une 429 propre

### Phase 9 — Dashboard admin (4-5 jours)

**Livrables** :
- App `apps/admin` complète
- Middleware vérification ADMIN
- CRUD complet : Lessons, Paths, Badges, Users, Tickets
- **Éditeur MDX intégré** (cf. section 7.9.1) :
  - Layout deux panneaux éditeur / preview live
  - CodeMirror 6 avec coloration MDX + barre d'outils
  - Palette de composants MDX custom (snippets insérables en un clic)
  - Formulaire frontmatter structuré (métadonnées séparées du corps)
  - Auto-save brouillon + bouton Publier avec confirmation
- Drag & drop pour ordonner les leçons dans un parcours
- Audit log viewer
- Wrapper de mutation qui log automatiquement dans `audit_logs`

**Critères d'acceptation** :
- [ ] Un user STUDENT qui tente d'accéder à admin.cyberlearn.app → 404
- [ ] Toute mutation admin → entry dans audit_logs
- [ ] Suppression d'une leçon publiée → confirmation modale
- [ ] CSP différenciée appliquée
- [ ] Éditeur : modification du MDX → preview mis à jour en ≤ 500ms
- [ ] Éditeur : clic sur "Insérer Callout" → snippet inséré à la position du curseur
- [ ] Éditeur : auto-save déclenché après 60s d'inactivité sans erreur
- [ ] Publication d'une leçon → status passe à PUBLISHED, visible côté web

### Phase 10 — Hardening & Polish (2-3 jours)

**Livrables** :
- Audit `pnpm audit` → 0 vulnérabilité high/critical
- Scan Semgrep en CI
- Scan gitleaks en CI
- Lighthouse CI intégré : Performance ≥ 90, A11y ≥ 95, Best Practices ≥ 95, SEO ≥ 90
- Tests Playwright e2e sur les flows critiques (auth, complétion leçon, certif)
- Page 404 et 500 personnalisées
- Sitemap.xml + robots.txt
- Open Graph tags + Twitter cards
- Documentation README à jour
- Guide de déploiement Vercel
- Runbook incident-response basique

**Critères d'acceptation** :
- [ ] Tous les scans CI verts
- [ ] Lighthouse aux objectifs
- [ ] Tests e2e passent
- [ ] Documentation déploiement testée from scratch

---

## 9. Conventions de code

### 9.1 Langue (règle non négociable)

> **Ce brief est rédigé en français pour ma lecture, mais le code doit être intégralement en anglais.** Toute dérive me fait perdre du temps lors des reviews.

**Obligatoirement en anglais** :
- Noms de variables, fonctions, classes, méthodes, types, interfaces, enums
- Noms de fichiers et de dossiers
- Commentaires de code (`//`, `/** */`)
- Messages de commit (Conventional Commits en anglais)
- Messages d'erreur techniques et logs applicatifs (Pino, Sentry)
- Noms de tables et de colonnes Prisma (déjà le cas dans le schéma fourni)
- Tests : descriptions `describe`, `it`, `test` en anglais
- Documentation technique (ADRs, README techniques, JSDoc)

**En français** :
- Textes UI visibles par l'utilisateur final, via `next-intl` dans `messages/fr.json`
- Contenu MDX des leçons seedées
- Emails transactionnels (templates React Email)
- Messages d'erreur **fonctionnels** affichés à l'utilisateur (ex: "Cette leçon n'est pas encore disponible")
- Documentation business destinée à moi (si tu veux, au choix)

**Exemple de conformité** :
```typescript
// ✅ GOOD
export async function completeLesson(userId: string, lessonId: string): Promise<CompletionResult> {
  // Verify the user has access to this lesson before awarding XP
  const hasAccess = await lessonRepository.userHasAccess(userId, lessonId);
  if (!hasAccess) {
    throw new ForbiddenError("User does not have access to this lesson");
  }
  // ...
}

// Message affiché à l'utilisateur (via next-intl)
// messages/fr.json: { "lesson.completion.success": "Bravo ! Leçon terminée, +{xp} XP gagnés 🎉" }

// ❌ BAD
export async function terminerLecon(idUtilisateur: string, idLecon: string) {
  // Vérifier si l'utilisateur a accès à la leçon
  // ...
}
```

### 9.2 Autres conventions

- **Commits** : Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `security:`)
- **Branches** : `feat/xxx`, `fix/xxx`, `security/xxx`
- **PR** : template avec checklist sécu
- **Naming** :
  - Composants React : PascalCase
  - Hooks : `useXxx`
  - Fichiers : kebab-case sauf composants
  - Constants : SCREAMING_SNAKE_CASE
  - Types : PascalCase, préfixe `T` interdit
- **Imports** : absolus via alias `@/`, `@cyberlearn/db`, etc.
- **Tests** : `*.test.ts` pour unit, `*.spec.ts` pour e2e
- **Pas de `any`**. Si vraiment nécessaire → `unknown` + narrowing.
- **Pas de `console.log`** en prod. Utiliser le logger Pino.
- **Commentaires** : pourquoi, pas quoi. Code self-documenting.

---

## 10. Variables d'environnement

```bash
# .env.example

# ===== Database =====
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# ===== Supabase =====
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY="" # SERVER ONLY — JAMAIS exposé au client

# ===== Site =====
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_ADMIN_URL="http://localhost:3001"

# ===== Email (Resend) =====
RESEND_API_KEY="re_xxx"
RESEND_FROM_EMAIL="noreply@cyberlearn.app"

# ===== Jira =====
JIRA_BASE_URL="https://xxx.atlassian.net"
JIRA_API_EMAIL="admin@cyberlearn.app"
JIRA_API_TOKEN=""
JIRA_PROJECT_KEY="CYBL"

# ===== Rate Limiting (Upstash) =====
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# ===== Captcha (Cloudflare Turnstile) =====
NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
TURNSTILE_SECRET_KEY=""

# ===== Audit / Pseudonymization =====
IP_HASH_SALT="" # Sel pour le hash SHA-256 des IPs (générer 32 bytes hex)

# ===== Monitoring =====
SENTRY_DSN=""
SENTRY_AUTH_TOKEN=""

# ===== Cron security =====
CRON_SECRET="" # Header secret pour les endpoints cron Vercel
```

---

## 11. Instructions finales pour Claude Code

1. **Lis ce document en entier avant de commencer.** Si quelque chose n'est pas clair ou pose un problème technique, **arrête-toi et pose la question** — ne fais pas d'hypothèse silencieuse.
2. **Travaille phase par phase.** À la fin de chaque phase, présente :
   - Un récap des fichiers créés/modifiés
   - Les tests que tu as écrits
   - La checklist de critères d'acceptation cochée
   - Les éventuels écarts par rapport au plan, justifiés
3. **Sécurité first.** Si tu hésites entre une solution rapide et une solution sécurisée, choisis toujours la sécurisée et explique pourquoi.
4. **Pas de raccourci sur les types.** TypeScript strict, zéro `any`.
5. **Pas de secret en dur.** Jamais. Si tu en as besoin pour un test, utilise une env var de test documentée dans `.env.example`.
6. **Tests automatisés** sur toute logique métier critique : XP, niveaux, badges, SM-2, génération de certificats, validation des entrées.
7. **Documente les décisions d'architecture** dans `/docs/adr/` (Architecture Decision Records) au format Markdown court.
8. **Si tu identifies une faille de sécurité** dans ce brief lui-même, signale-la avant d'implémenter.
9. **Demande validation** avant d'introduire une dépendance non listée dans la stack.
10. **Fail loudly, log gracefully.** Les erreurs ne doivent jamais être silencieuses, mais ne doivent jamais leak d'info sensible non plus.
11. **Pas de forum global.** Toute entraide passe par le Q&A rattaché à une leçon (section 7.8.2). Ne crée **jamais** de page `/forum`, `/community`, `/chat` ou équivalent, même si ça semble "aller avec" la feature sociale. Cette contrainte est volontaire : le contenu user-generated doit rester scopé à un contexte pédagogique pour limiter la surface de modération et éviter l'effet "zone vide".
12. **Respecte la langue du code.** Français dans le brief et l'UI, anglais dans le code. Toujours. (Cf. section 9.1.)

---

## 12. Definition of Done globale

Une feature est terminée quand :
- ✅ Le code est mergé sur `main` via PR review
- ✅ Tous les tests (unit + e2e relevant) passent
- ✅ Lint + typecheck verts
- ✅ Aucun secret commit
- ✅ Audit log en place si action sensible
- ✅ Validation Zod sur toutes les entrées
- ✅ Erreurs gérées et loggées (sans leak)
- ✅ Accessibilité vérifiée (clavier + lecteur d'écran sur les composants critiques)
- ✅ Responsive vérifié sur mobile (375px) et desktop (1280px)
- ✅ Dark + light mode supportés
- ✅ Documentée si API publique ou composant réutilisable

---

## 13. Backlog v2 (hors scope initial — NE PAS implémenter)

Ces idées ont été évaluées mais volontairement écartées de la v1 pour éviter de disperser l'effort. **Claude Code ne doit pas les implémenter**, ne doit pas créer de tables pour elles, et ne doit pas laisser de "hooks" dans le code pour les préparer. Elles sont listées ici uniquement pour éviter qu'elles soient proposées spontanément.

- **Squads / équipes** : groupes de 10 users, leaderboard collectif. Reporté car sous-spécifié (formation, modération, anti-cheat, RGPD sur noms publics) et prématuré sur une plateforme sans utilisateurs. À reconsidérer quand la base user dépasse ~500 inscrits actifs.
- **Peer Learning** (solutions de code partagées entre users) : reporté car engage une charge de modération permanente (signalement, scan anti-malveillant, queue admin) qui n'est pas compatible avec un solo-dev en apprentissage. Nécessite au préalable un modèle `ReportedContent` + service de modération + politique de contenu publique.
- **Webhooks Discord/Slack** de félicitations aux paliers : gadget sympathique mais à traiter en Phase polish v2, et uniquement en mode "user fournit son propre webhook URL" dans ses préférences (aucune dépendance externe obligatoire).
- **Leaderboard global public** : si ajouté, devra être opt-in explicite dans `UserPreferences` pour respecter le RGPD.
- **Export Open Badges 3.0** (standard W3C pour badges vérifiables) : très gros plus pour la crédibilité des certifs, mais hors scope v1.
- **Challenges hebdomadaires** : mission limitée dans le temps avec récompense spéciale. À envisager une fois la rétention mesurée sur le contenu de base.
- **Mode hors-ligne** (PWA avec service worker et sync différée) : prometteur pour la cible mobile mais complexifie beaucoup la gestion d'état et les migrations.

> Si tu penses qu'une de ces features est critique pour un cas précis, **arrête-toi et demande-moi** avant d'entamer quoi que ce soit. Je préfère dire "non, plus tard" que découvrir 500 lignes non prévues.

---

**Bon dev. Sécurise tout. Casse rien. 🛡️**
