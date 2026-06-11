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
