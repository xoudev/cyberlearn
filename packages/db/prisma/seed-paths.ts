/**
 * Creates the learning paths and attaches the imported lessons to them, in
 * order, by refCode. Run AFTER importing the lesson .mdx files (admin
 * /lessons/import). Idempotent: upserts the path and its lesson links, so it
 * is safe to re-run after importing more lessons.
 *
 *   pnpm --filter @cyberlearn/db db:seed-paths
 *
 * Paths are created as DRAFT, like imported lessons: review then publish from
 * the admin. A lesson refCode not found in the database is skipped with a
 * warning (import it first).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface PathManifest {
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: "DEV" | "CYBERSEC" | "NETWORK";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  estimatedHours: number;
  /** Lesson refCodes in study order. */
  lessons: string[];
}

const PATHS: PathManifest[] = [
  {
    refCode: "CL-PATH-001-V01",
    slug: "python-bases-pratique",
    title: "Python : des bases à la pratique",
    description:
      "Apprenez Python de zéro : variables, conditions, boucles, fonctions, collections, gestion d'erreurs et programmation orientée objet. Chaque leçon est exécutable dans le navigateur et le parcours se termine par un projet complet.",
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedHours: 6,
    lessons: [
      "CL-LSN-001-V01",
      "CL-LSN-002-V01",
      "CL-LSN-003-V01",
      "CL-LSN-004-V01",
      "CL-LSN-005-V01",
      "CL-LSN-006-V01",
      "CL-LSN-007-V01",
      "CL-LSN-008-V01",
      "CL-LSN-009-V01",
      "CL-LSN-010-V01",
      "CL-LSN-011-V01",
      "CL-LSN-012-V01",
    ],
  },
  {
    refCode: "CL-PATH-002-V01",
    slug: "javascript-moderne",
    title: "JavaScript moderne : du navigateur à l'app",
    description:
      "Apprenez le langage du web : variables, opérateurs, conditions, boucles, fonctions fléchées, tableaux (map/filter/reduce), objets, closures, asynchrone (promesses, async/await) et JSON. Chaque leçon s'exécute dans le navigateur et le parcours se termine par un moteur de quiz à étendre.",
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedHours: 6,
    lessons: [
      "CL-LSN-013-V01",
      "CL-LSN-014-V01",
      "CL-LSN-015-V01",
      "CL-LSN-016-V01",
      "CL-LSN-017-V01",
      "CL-LSN-018-V01",
      "CL-LSN-019-V01",
      "CL-LSN-020-V01",
      "CL-LSN-021-V01",
      "CL-LSN-022-V01",
      "CL-LSN-023-V01",
      "CL-LSN-024-V01",
    ],
  },
  {
    refCode: "CL-PATH-003-V01",
    slug: "c-programmation",
    title: "C : programmation système et bas niveau",
    description:
      "Plongez dans le C, langage fondateur des systèmes : structure d'un programme, types, contrôle de flux, fonctions, tableaux, chaînes, et surtout les pointeurs et structures. Code compilé et exécuté dans le navigateur, jusqu'à un gestionnaire d'inventaire.",
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedHours: 7,
    lessons: [
      "CL-LSN-025-V01",
      "CL-LSN-026-V01",
      "CL-LSN-027-V01",
      "CL-LSN-028-V01",
      "CL-LSN-029-V01",
      "CL-LSN-030-V01",
      "CL-LSN-031-V01",
      "CL-LSN-032-V01",
      "CL-LSN-033-V01",
      "CL-LSN-034-V01",
      "CL-LSN-035-V01",
      "CL-LSN-036-V01",
    ],
  },
  {
    refCode: "CL-PATH-004-V01",
    slug: "assembleur-x86",
    title: "Assembleur x86-64 : au coeur du processeur",
    description:
      "Descendez au plus près de la machine : registres, arithmétique, opérations binaires, la pile, comparaisons, sauts, boucles et fonctions en assembleur x86-64. Code exécuté dans un simulateur intégré, jusqu'à de vrais algorithmes et une calculatrice.",
    category: "DEV",
    difficulty: "INTERMEDIATE",
    estimatedHours: 7,
    lessons: [
      "CL-LSN-037-V01",
      "CL-LSN-038-V01",
      "CL-LSN-039-V01",
      "CL-LSN-040-V01",
      "CL-LSN-041-V01",
      "CL-LSN-042-V01",
      "CL-LSN-043-V01",
      "CL-LSN-044-V01",
      "CL-LSN-045-V01",
      "CL-LSN-046-V01",
      "CL-LSN-047-V01",
      "CL-LSN-048-V01",
    ],
  },
  {
    refCode: "CL-PATH-005-V01",
    slug: "linux-terminal",
    title: "Linux et la ligne de commande",
    description:
      "Prenez le contrôle d'un système Linux au clavier : le shell, la navigation, les fichiers, les permissions, les processus, les redirections, la recherche et les premiers scripts Bash. Chaque leçon se pratique dans un terminal interactif.",
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedHours: 7,
    lessons: [
      "CL-LSN-049-V01",
      "CL-LSN-050-V01",
      "CL-LSN-051-V01",
      "CL-LSN-052-V01",
      "CL-LSN-053-V01",
      "CL-LSN-054-V01",
      "CL-LSN-055-V01",
      "CL-LSN-056-V01",
      "CL-LSN-057-V01",
      "CL-LSN-058-V01",
      "CL-LSN-059-V01",
      "CL-LSN-060-V01",
    ],
  },
  {
    refCode: "CL-PATH-006-V01",
    slug: "git-docker-cicd",
    title: "Git, Docker et CI/CD",
    description:
      "Les outils du développeur moderne : versionner avec Git et collaborer par pull requests, conteneuriser une application avec Docker et Compose, et automatiser tests et livraison avec un pipeline CI/CD. Conclu par un projet de déploiement complet.",
    category: "DEV",
    difficulty: "INTERMEDIATE",
    estimatedHours: 8,
    lessons: [
      "CL-LSN-061-V01",
      "CL-LSN-062-V01",
      "CL-LSN-063-V01",
      "CL-LSN-064-V01",
      "CL-LSN-065-V01",
      "CL-LSN-066-V01",
      "CL-LSN-067-V01",
      "CL-LSN-068-V01",
      "CL-LSN-069-V01",
      "CL-LSN-070-V01",
      "CL-LSN-071-V01",
      "CL-LSN-072-V01",
    ],
  },
  {
    refCode: "CL-PATH-007-V01",
    slug: "cyber-fondamentaux",
    title: "Cybersécurité : les fondamentaux",
    description:
      "Les bases solides de la sécurité : la triade CIA, les menaces et l'ingénierie sociale, vulnérabilités et surface d'attaque, authentification et hachage des mots de passe, sécurité réseau et web, défense en profondeur, réponse à incident et éthique. Conclu par un audit méthodique.",
    category: "CYBERSEC",
    difficulty: "BEGINNER",
    estimatedHours: 7,
    lessons: [
      "CL-LSN-073-V01",
      "CL-LSN-074-V01",
      "CL-LSN-075-V01",
      "CL-LSN-076-V01",
      "CL-LSN-077-V01",
      "CL-LSN-078-V01",
      "CL-LSN-079-V01",
      "CL-LSN-080-V01",
      "CL-LSN-081-V01",
      "CL-LSN-082-V01",
      "CL-LSN-083-V01",
      "CL-LSN-084-V01",
    ],
  },
  {
    refCode: "CL-PATH-008-V01",
    slug: "cyber-web-owasp",
    title: "Sécurité web : le Top 10 OWASP en pratique",
    description:
      "Apprenez à reconnaître et à corriger les failles web les plus répandues : injection SQL, XSS, contrôle d'accès défaillant et IDOR, défaillances d'authentification, mauvaises configurations, CSRF, dépendances vulnérables, défaillances cryptographiques, SSRF et logique métier. Conclu par l'audit guidé d'une application volontairement vulnérable.",
    category: "CYBERSEC",
    difficulty: "INTERMEDIATE",
    estimatedHours: 8,
    lessons: [
      "CL-LSN-085-V01",
      "CL-LSN-086-V01",
      "CL-LSN-087-V01",
      "CL-LSN-088-V01",
      "CL-LSN-089-V01",
      "CL-LSN-090-V01",
      "CL-LSN-091-V01",
      "CL-LSN-092-V01",
      "CL-LSN-093-V01",
      "CL-LSN-094-V01",
      "CL-LSN-095-V01",
      "CL-LSN-096-V01",
    ],
  },
  {
    refCode: "CL-PATH-009-V01",
    slug: "cryptographie",
    title: "Cryptographie : de la théorie à la pratique",
    description:
      "Comprenez la cryptographie sans vous noyer dans les maths : les quatre objectifs, chiffrement symétrique et asymétrique, fonctions de hachage, MAC et HMAC, signatures, échange de clés, certificats et TLS, stockage des mots de passe, et les erreurs de mise en oeuvre qui cassent une bonne crypto. Conclu par un projet où vous cassez vous-même un chiffrement.",
    category: "CYBERSEC",
    difficulty: "INTERMEDIATE",
    estimatedHours: 8,
    lessons: [
      "CL-LSN-097-V01",
      "CL-LSN-098-V01",
      "CL-LSN-099-V01",
      "CL-LSN-100-V01",
      "CL-LSN-101-V01",
      "CL-LSN-102-V01",
      "CL-LSN-103-V01",
      "CL-LSN-104-V01",
      "CL-LSN-105-V01",
      "CL-LSN-106-V01",
      "CL-LSN-107-V01",
      "CL-LSN-108-V01",
    ],
  },
  {
    refCode: "CL-PATH-010-V01",
    slug: "pentest",
    title: "Test d'intrusion : la démarche offensive",
    description:
      "Apprenez le métier de testeur d'intrusion dans un cadre légal : méthodologie et règles d'engagement, reconnaissance passive et active, scan nmap, énumération, recherche de vulnérabilités, exploitation, attaques de mots de passe, exploitation web, post-exploitation et élévation de privilèges, mouvement latéral, et rédaction du rapport. Conclu par la compromission guidée d'une machine d'entraînement.",
    category: "CYBERSEC",
    difficulty: "ADVANCED",
    estimatedHours: 9,
    lessons: [
      "CL-LSN-109-V01",
      "CL-LSN-110-V01",
      "CL-LSN-111-V01",
      "CL-LSN-112-V01",
      "CL-LSN-113-V01",
      "CL-LSN-114-V01",
      "CL-LSN-115-V01",
      "CL-LSN-116-V01",
      "CL-LSN-117-V01",
      "CL-LSN-118-V01",
      "CL-LSN-119-V01",
      "CL-LSN-120-V01",
    ],
  },
  {
    refCode: "CL-PATH-011-V01",
    slug: "grc",
    title: "Gouvernance, risque et conformité",
    description:
      "Le versant organisationnel de la sécurité : gouvernance et pilotage du risque, politiques et standards, cadres ISO 27001, NIST et CIS, conformité par secteur et RGPD, classification des actifs, continuité d'activité, risque des tiers, facteur humain et audit. Conclu par une analyse de risque guidée pour une PME.",
    category: "CYBERSEC",
    difficulty: "INTERMEDIATE",
    estimatedHours: 7,
    lessons: [
      "CL-LSN-121-V01",
      "CL-LSN-122-V01",
      "CL-LSN-123-V01",
      "CL-LSN-124-V01",
      "CL-LSN-125-V01",
      "CL-LSN-126-V01",
      "CL-LSN-127-V01",
      "CL-LSN-128-V01",
      "CL-LSN-129-V01",
      "CL-LSN-130-V01",
      "CL-LSN-131-V01",
      "CL-LSN-132-V01",
    ],
  },
  {
    refCode: "CL-PATH-012-V01",
    slug: "blue-team-soc",
    title: "Blue team et SOC : défendre et détecter",
    description:
      "Le métier de la défense au quotidien : posture blue team et SOC, journaux et SIEM, détection par signatures et anomalies, MITRE ATT and CK, chasse aux menaces, réponse à incident, analyse de logs, durcissement, renseignement sur les menaces et investigation numérique. Conclu par l'analyse guidée d'un incident de bout en bout.",
    category: "CYBERSEC",
    difficulty: "INTERMEDIATE",
    estimatedHours: 8,
    lessons: [
      "CL-LSN-133-V01",
      "CL-LSN-134-V01",
      "CL-LSN-135-V01",
      "CL-LSN-136-V01",
      "CL-LSN-137-V01",
      "CL-LSN-138-V01",
      "CL-LSN-139-V01",
      "CL-LSN-140-V01",
      "CL-LSN-141-V01",
      "CL-LSN-142-V01",
      "CL-LSN-143-V01",
      "CL-LSN-144-V01",
    ],
  },
];

async function main(): Promise<void> {
  for (const m of PATHS) {
    const path = await prisma.path.upsert({
      where: { refCode: m.refCode },
      create: {
        refCode: m.refCode,
        slug: m.slug,
        title: m.title,
        description: m.description,
        category: m.category,
        difficulty: m.difficulty,
        estimatedHours: m.estimatedHours,
        status: "DRAFT",
      },
      update: {
        title: m.title,
        description: m.description,
        category: m.category,
        difficulty: m.difficulty,
        estimatedHours: m.estimatedHours,
      },
    });

    let position = 1;
    let attached = 0;
    const missing: string[] = [];
    for (const refCode of m.lessons) {
      const lesson = await prisma.lesson.findUnique({
        where: { refCode },
        select: { id: true },
      });
      if (!lesson) {
        missing.push(refCode);
        continue;
      }
      await prisma.pathLesson.upsert({
        where: { pathId_lessonId: { pathId: path.id, lessonId: lesson.id } },
        create: { pathId: path.id, lessonId: lesson.id, position },
        update: { position },
      });
      position++;
      attached++;
    }

    console.log(`${m.refCode} "${m.title}": ${attached}/${m.lessons.length} leçons attachées`);
    if (missing.length > 0) {
      console.log(`  manquantes (à importer d'abord): ${missing.join(", ")}`);
    }
  }
  console.log("\nParcours créés en DRAFT. Publiez-les depuis l'admin après relecture.");
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
