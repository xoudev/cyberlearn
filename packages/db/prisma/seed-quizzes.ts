/**
 * Seeds the final certification quiz of each learning path from
 * content/quizzes/<path-slug>.json. Run AFTER db:seed-paths (the path must
 * already exist; the quiz is matched to it by slug).
 *
 *   pnpm --filter @cyberlearn/db db:seed-quizzes          (DRY RUN: validate only)
 *   pnpm --filter @cyberlearn/db db:seed-quizzes --apply  (write to the database)
 *
 * Idempotent: upserts the Quiz (one per path, pathId is @unique) and brings its
 * question pool in line with the file, retiring (never deleting) the questions
 * the file no longer holds. Validation always runs first and mirrors the admin
 * questionSchema; --apply refuses to run if any file is invalid. A path slug
 * with no row in the database is skipped with a warning (seed the paths first).
 *
 * The console's "Synchroniser avec le dépôt" page does the same from
 * production, through the same code (@cyberlearn/db/catalogue).
 */

import { createPrismaClient } from "../src/prisma.js";
import { findQuizDir, loadQuizFiles, syncQuiz } from "../src/catalogue/index.js";

const apply = process.argv.includes("--apply");

async function main(): Promise<void> {
  const quizDir = findQuizDir();
  if (quizDir === null) throw new Error("content/quizzes introuvable (lancez depuis le repo).");
  const { quizzes, errors } = loadQuizFiles(quizDir);
  if (quizzes.length === 0 && errors.length === 0) {
    console.log(`Aucun fichier .json dans ${quizDir}`);
    return;
  }

  console.log(
    apply ? "== APPLY MODE ==" : "== DRY RUN (validation seule, passez --apply pour écrire) ==",
  );
  for (const e of errors) console.error(`  ✗ ${e}`);
  for (const { slug, quiz } of quizzes) {
    console.log(
      `  ✓ ${slug}: ${String(quiz.questions.length)} questions, tirage ${String(quiz.questionsToDraw)}, seuil ${String(quiz.passThreshold)}%`,
    );
  }
  console.log(`\nValides: ${String(quizzes.length)} fichiers. Erreurs: ${String(errors.length)}.`);
  if (errors.length > 0) {
    console.error("Validation échouée: corrige les fichiers avant --apply.");
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log("Validation OK (dry run). Relance avec --apply pour écrire en base.");
    return;
  }

  const prisma = createPrismaClient();
  try {
    let written = 0;
    for (const { slug, quiz } of quizzes) {
      const path = await prisma.path.findUnique({ where: { slug }, select: { id: true } });
      if (!path) {
        console.log(`  ⚠ "${slug}": parcours introuvable en base, ignoré (db:seed-paths d'abord).`);
        continue;
      }
      const result = await syncQuiz(prisma, path.id, quiz);
      written++;
      console.log(
        `  ✓ "${slug}": quiz + ${String(result.questions)} questions écrits, ${String(result.retired)} désactivée(s).`,
      );
    }
    console.log(
      `\n${String(written)} quiz écrits. Les quiz sont actifs; vérifiez et publiez les parcours depuis l'admin.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exitCode = 1;
});
