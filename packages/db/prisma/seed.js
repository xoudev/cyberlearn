"use strict";
/**
 * Development seed — creates realistic but fake data for local development.
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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
      rarity: "COMMON",
      criterionType: "LESSON_COMPLETED",
      criterionData: { count: 1 },
    },
    {
      refCode: "CL-BDG-002",
      name: "Curieux",
      description: "Complétez 5 leçons.",
      iconUrl: "/badges/curious.svg",
      rarity: "COMMON",
      criterionType: "LESSON_COMPLETED",
      criterionData: { count: 5 },
    },
    {
      refCode: "CL-BDG-003",
      name: "Explorateur",
      description: "Complétez votre première leçon dans chaque catégorie.",
      iconUrl: "/badges/explorer.svg",
      rarity: "RARE",
      criterionType: "CATEGORY_MASTERY",
      criterionData: { categories: ["DEV", "CYBERSEC", "NETWORK"] },
    },
    {
      refCode: "CL-BDG-004",
      name: "Sérieux",
      description: "Maintenez un streak de 7 jours.",
      iconUrl: "/badges/streak-7.svg",
      rarity: "RARE",
      criterionType: "STREAK_DAYS",
      criterionData: { days: 7 },
    },
    {
      refCode: "CL-BDG-005",
      name: "Hacktiviste",
      description: "Atteignez 1000 XP.",
      iconUrl: "/badges/xp-1000.svg",
      rarity: "EPIC",
      criterionType: "XP_THRESHOLD",
      criterionData: { xp: 1000 },
    },
    {
      refCode: "CL-BDG-006",
      name: "Quiz parfait",
      description: "Obtenez 100% à un quiz.",
      iconUrl: "/badges/perfect-quiz.svg",
      rarity: "EPIC",
      criterionType: "PERFECT_QUIZ",
      criterionData: {},
    },
    {
      refCode: "CL-BDG-007",
      name: "Quick Start",
      description: "Prouvez vos connaissances au test de placement.",
      iconUrl: "/badges/quick-start.svg",
      rarity: "RARE",
      criterionType: "CUSTOM",
      criterionData: { event: "placement_test_passed" },
    },
    {
      refCode: "CL-BDG-008",
      name: "Architecte",
      description: "Complétez un parcours entier.",
      iconUrl: "/badges/architect.svg",
      rarity: "EPIC",
      criterionType: "PATH_COMPLETED",
      criterionData: { count: 1 },
    },
    {
      refCode: "CL-BDG-009",
      name: "Légende",
      description: "Atteignez le niveau 50.",
      iconUrl: "/badges/legend.svg",
      rarity: "LEGENDARY",
      criterionType: "XP_THRESHOLD",
      criterionData: { level: 50 },
    },
    {
      refCode: "CL-BDG-010",
      name: "Certifié",
      description: "Obtenez votre premier certificat.",
      iconUrl: "/badges/certified.svg",
      rarity: "LEGENDARY",
      criterionType: "PATH_COMPLETED",
      criterionData: { withCertificate: true },
    },
  ];
  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { refCode: badge.refCode },
      create: badge,
      update: {},
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
      category: "CYBERSEC",
      difficulty: "BEGINNER",
      estimatedMinutes: 30,
      xpReward: 100,
      contentMdx:
        "# Introduction aux injections SQL\n\nDans cette leçon, vous allez découvrir l'une des vulnérabilités web les plus répandues.\n\n## Qu'est-ce qu'une injection SQL ?\n\nUne injection SQL est une attaque qui consiste à insérer du code SQL malveillant dans une requête...",
      authorId: ADMIN_ID,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    {
      refCode: "CL-LSN-002-V01",
      slug: "xss-cross-site-scripting",
      title: "Cross-Site Scripting (XSS)",
      description:
        "Découvrez les attaques XSS réfléchies et stockées, et les techniques de défense.",
      category: "CYBERSEC",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 45,
      xpReward: 150,
      contentMdx:
        "# Cross-Site Scripting (XSS)\n\nLe XSS est une vulnérabilité permettant à un attaquant d'injecter du code côté client...",
      authorId: ADMIN_ID,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    {
      refCode: "CL-LSN-003-V01",
      slug: "typescript-generics",
      title: "TypeScript : les génériques",
      description:
        "Maîtrisez les types génériques en TypeScript pour écrire du code réutilisable et type-safe.",
      category: "DEV",
      difficulty: "INTERMEDIATE",
      estimatedMinutes: 40,
      xpReward: 120,
      contentMdx:
        "# TypeScript : les génériques\n\nLes génériques permettent d'écrire des fonctions et classes qui fonctionnent avec n'importe quel type...",
      authorId: ADMIN_ID,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    {
      refCode: "CL-LSN-004-V01",
      slug: "modele-osi",
      title: "Le modèle OSI expliqué",
      description:
        "Comprenez les 7 couches du modèle OSI et leur rôle dans la communication réseau.",
      category: "NETWORK",
      difficulty: "BEGINNER",
      estimatedMinutes: 25,
      xpReward: 80,
      contentMdx:
        "# Le modèle OSI\n\nLe modèle OSI (Open Systems Interconnection) est un cadre conceptuel qui divise les communications réseau en 7 couches...",
      authorId: ADMIN_ID,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
    {
      refCode: "CL-LSN-005-V01",
      slug: "http-https-fondamentaux",
      title: "HTTP/HTTPS : les fondamentaux",
      description:
        "Comprenez comment fonctionnent HTTP et HTTPS, les méthodes, les codes de statut et les headers.",
      category: "NETWORK",
      difficulty: "BEGINNER",
      estimatedMinutes: 30,
      xpReward: 90,
      contentMdx:
        "# HTTP/HTTPS\n\nHTTP (HyperText Transfer Protocol) est le protocole fondamental du web...",
      authorId: ADMIN_ID,
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  ];
  const createdLessons = {};
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
      title: "Cybersécurité — Niveau débutant",
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
      title: "Réseaux — Les fondamentaux",
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
    // DEV — Beginner
    {
      category: "DEV",
      difficulty: "BEGINNER",
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
    // DEV — Intermediate
    {
      category: "DEV",
      difficulty: "INTERMEDIATE",
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
    // DEV — Intermediate
    {
      category: "DEV",
      difficulty: "INTERMEDIATE",
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
    // DEV — Advanced
    {
      category: "DEV",
      difficulty: "ADVANCED",
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
    // DEV — Advanced
    {
      category: "DEV",
      difficulty: "ADVANCED",
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
    // CYBERSEC — Beginner
    {
      category: "CYBERSEC",
      difficulty: "BEGINNER",
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
    // CYBERSEC — Beginner
    {
      category: "CYBERSEC",
      difficulty: "BEGINNER",
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
    // CYBERSEC — Intermediate
    {
      category: "CYBERSEC",
      difficulty: "INTERMEDIATE",
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
    // CYBERSEC — Intermediate
    {
      category: "CYBERSEC",
      difficulty: "INTERMEDIATE",
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
    // CYBERSEC — Advanced
    {
      category: "CYBERSEC",
      difficulty: "ADVANCED",
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
    // NETWORK — Beginner
    {
      category: "NETWORK",
      difficulty: "BEGINNER",
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
    // NETWORK — Beginner
    {
      category: "NETWORK",
      difficulty: "BEGINNER",
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
    // NETWORK — Intermediate
    {
      category: "NETWORK",
      difficulty: "INTERMEDIATE",
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
    // NETWORK — Intermediate
    {
      category: "NETWORK",
      difficulty: "INTERMEDIATE",
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
    // NETWORK — Advanced
    {
      category: "NETWORK",
      difficulty: "ADVANCED",
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
        "BGP est le protocole de routage de l'Internet. Il gère comment les paquets sont routés entre Autonomous Systems (AS) — les grands réseaux gérés par des opérateurs distincts.",
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
//# sourceMappingURL=seed.js.map
