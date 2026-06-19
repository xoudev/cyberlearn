/**
 * Seeds the final certification quiz of each learning path from
 * content/quizzes/<path-slug>.json. Run AFTER db:seed-paths (the path must
 * already exist; the quiz is matched to it by slug).
 *
 *   pnpm --filter @cyberlearn/db db:seed-quizzes          (DRY RUN: validate only)
 *   pnpm --filter @cyberlearn/db db:seed-quizzes --apply  (write to the database)
 *
 * Idempotent: upserts the Quiz (one per path, pathId is @unique) and REPLACES
 * its question pool. Validation always runs first and mirrors the admin
 * questionSchema; --apply refuses to run if any file is invalid. A path slug
 * with no row in the database is skipped with a warning (seed the paths first).
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");

interface QuizOption {
  id: string;
  text: string;
}
interface QuizQuestionFile {
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
}
interface QuizFile {
  passThreshold: number;
  questionsToDraw: number;
  questions: QuizQuestionFile[];
}

// Walk up from the cwd to find content/quizzes, so the script works whether it
// is launched from the package dir or the repo root.
function findQuizDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "content", "quizzes");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  throw new Error("content/quizzes introuvable (lancez depuis le repo).");
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Validation mirroring apps/admin .../quiz/_actions/quiz-validation.ts plus the
// project rule banning the em-dash in authored content.
function validate(slug: string, raw: unknown): { errors: string[]; data?: QuizFile } {
  const errors: string[] = [];
  const push = (m: string): number => errors.push(`[${slug}] ${m}`);

  if (!isObject(raw)) {
    push("le fichier n'est pas un objet JSON");
    return { errors };
  }
  const { passThreshold, questionsToDraw, questions } = raw;
  if (
    typeof passThreshold !== "number" ||
    !Number.isInteger(passThreshold) ||
    passThreshold < 0 ||
    passThreshold > 100
  ) {
    push("passThreshold doit être un entier 0-100");
  }
  if (
    typeof questionsToDraw !== "number" ||
    !Number.isInteger(questionsToDraw) ||
    questionsToDraw < 1 ||
    questionsToDraw > 100
  ) {
    push("questionsToDraw doit être un entier 1-100");
  }
  if (!Array.isArray(questions) || questions.length < 1) {
    push("questions doit être un tableau non vide");
    return { errors };
  }
  if (typeof questionsToDraw === "number" && questionsToDraw > questions.length) {
    push(
      `questionsToDraw (${String(questionsToDraw)}) > nombre de questions (${String(questions.length)})`,
    );
  }

  questions.forEach((q, i) => {
    const at = `Q${String(i + 1)}`;
    if (!isObject(q)) {
      push(`${at}: n'est pas un objet`);
      return;
    }
    if (
      typeof q.question !== "string" ||
      q.question.trim().length < 1 ||
      q.question.length > 2000
    ) {
      push(`${at}: 'question' invalide (1-2000 caractères)`);
    }
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 10) {
      push(`${at}: 'options' doit contenir 2 à 10 entrées`);
      return;
    }
    const ids = new Set<string>();
    for (const o of q.options) {
      if (!isObject(o) || typeof o.id !== "string" || o.id.trim().length < 1 || o.id.length > 10) {
        push(`${at}: option avec un 'id' invalide`);
        continue;
      }
      if (typeof o.text !== "string" || o.text.trim().length < 1 || o.text.length > 500) {
        push(`${at}: option "${o.id}" a un 'text' invalide (1-500 caractères)`);
      }
      ids.add(o.id);
    }
    if (ids.size !== q.options.length) push(`${at}: identifiants d'options en double`);
    if (typeof q.correctOptionId !== "string" || !ids.has(q.correctOptionId)) {
      push(`${at}: correctOptionId doit correspondre à une option`);
    }
    if (
      q.explanation !== undefined &&
      (typeof q.explanation !== "string" || q.explanation.length > 2000)
    ) {
      push(`${at}: 'explanation' invalide (max 2000 caractères)`);
    }
    const blob = `${String(q.question)} ${q.options.map((o) => (isObject(o) ? String(o.text) : "")).join(" ")} ${String(q.explanation ?? "")}`;
    if (blob.includes("—")) push(`${at}: contient un tiret cadratin "—" (interdit)`);
  });

  if (errors.length > 0) return { errors };
  // SAFETY: every field checked above; the shape matches QuizFile.
  return { errors, data: raw as unknown as QuizFile };
}

async function main(): Promise<void> {
  const quizDir = findQuizDir();
  const files = readdirSync(quizDir)
    .filter((f) => f.endsWith(".json"))
    .sort();
  if (files.length === 0) {
    console.log(`Aucun fichier .json dans ${quizDir}`);
    return;
  }

  console.log(
    apply ? "== APPLY MODE ==" : "== DRY RUN (validation seule, passez --apply pour écrire) ==",
  );

  const valid: { slug: string; data: QuizFile }[] = [];
  let errorCount = 0;
  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(join(quizDir, file), "utf8"));
    } catch (e) {
      console.error(`[${slug}] JSON illisible: ${String(e instanceof Error ? e.message : e)}`);
      errorCount++;
      continue;
    }
    const { errors, data } = validate(slug, parsed);
    if (errors.length > 0 || !data) {
      errorCount += errors.length;
      for (const e of errors) console.error(`  ✗ ${e}`);
      continue;
    }
    valid.push({ slug, data });
    console.log(
      `  ✓ ${slug}: ${String(data.questions.length)} questions, tirage ${String(data.questionsToDraw)}, seuil ${String(data.passThreshold)}%`,
    );
  }

  console.log(
    `\nValides: ${String(valid.length)}/${String(files.length)} fichiers. Erreurs: ${String(errorCount)}.`,
  );
  if (errorCount > 0) {
    console.error("Validation échouée: corrige les fichiers avant --apply.");
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log("Validation OK (dry run). Relance avec --apply pour écrire en base.");
    return;
  }

  const prisma = new PrismaClient();
  try {
    let written = 0;
    for (const { slug, data } of valid) {
      const path = await prisma.path.findUnique({ where: { slug }, select: { id: true } });
      if (!path) {
        console.log(`  ⚠ "${slug}": parcours introuvable en base, ignoré (db:seed-paths d'abord).`);
        continue;
      }
      const quiz = await prisma.quiz.upsert({
        where: { pathId: path.id },
        create: {
          pathId: path.id,
          passThreshold: data.passThreshold,
          questionsToDraw: data.questionsToDraw,
          isActive: true,
        },
        update: {
          passThreshold: data.passThreshold,
          questionsToDraw: data.questionsToDraw,
          isActive: true,
        },
      });
      await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
      await prisma.quizQuestion.createMany({
        data: data.questions.map((q, i) => ({
          quizId: quiz.id,
          question: q.question,
          // SAFETY: validated as [{ id, text }]; Prisma stores it as Json.
          options: q.options as unknown as object,
          correctOptionId: q.correctOptionId,
          explanation: q.explanation && q.explanation.length > 0 ? q.explanation : null,
          orderIndex: i,
          isActive: true,
        })),
      });
      written++;
      console.log(`  ✓ "${slug}": quiz + ${String(data.questions.length)} questions écrits.`);
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
