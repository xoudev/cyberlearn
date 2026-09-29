/**
 * Reads and checks the final exams of the catalogue, content/quizzes/<slug>.json:
 * one file per path, named after the path's slug, holding the question pool
 * an attempt draws from and the score that earns the certificate.
 *
 * Used by seed-quizzes and by the console's "Synchroniser avec le dépôt" page
 * (which writes an exam through ./quiz-sync.ts), and by a unit test that fails
 * the build on a file that would not load - so a broken exam is caught when it
 * is written, not when the console refuses it in production.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface QuizFileOption {
  id: string;
  text: string;
}

export interface QuizFileQuestion {
  question: string;
  options: QuizFileOption[];
  correctOptionId: string;
  explanation?: string;
}

export interface QuizFile {
  passThreshold: number;
  questionsToDraw: number;
  questions: QuizFileQuestion[];
}

export interface LoadedQuizFile {
  /** The path's slug, from the file name. */
  slug: string;
  file: string;
  quiz: QuizFile;
}

/** content/quizzes, found by walking up from the working directory. */
export function findQuizDir(from: string = process.cwd()): string | null {
  let dir = from;
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "content", "quizzes");
    if (existsSync(candidate)) return candidate;
    dir = dirname(dir);
  }
  return null;
}

// Built from its code point: the character itself is banned from the sources.
const EM_DASH = String.fromCodePoint(0x2014);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * The checks of the console's quiz editor (apps/admin .../quiz-validation.ts),
 * plus the project rule banning the em-dash in authored content.
 */
export function checkQuizFile(slug: string, raw: unknown): { errors: string[]; quiz?: QuizFile } {
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

  const texts = new Set<string>();
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
    } else {
      if (texts.has(q.question)) push(`${at}: question en double dans le pool`);
      texts.add(q.question);
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
    const authored = [
      q.question,
      q.explanation,
      ...q.options.map((o) => (isObject(o) ? o.text : undefined)),
    ].filter((t): t is string => typeof t === "string");
    const blob = authored.join(" ");
    if (blob.includes(EM_DASH)) push(`${at}: contient un tiret cadratin (U+2014, interdit)`);
  });

  if (errors.length > 0) return { errors };
  // SAFETY: every field checked above; the shape matches QuizFile.
  return { errors, quiz: raw as unknown as QuizFile };
}

/** Every exam in `dir`, checked. A missing directory holds no exam. */
export function loadQuizFiles(dir: string | null = findQuizDir()): {
  quizzes: LoadedQuizFile[];
  errors: string[];
} {
  if (dir === null) return { quizzes: [], errors: [] };
  let files: string[];
  try {
    files = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    return { quizzes: [], errors: [] };
  }
  const quizzes: LoadedQuizFile[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(join(dir, file), "utf8")) as unknown;
    } catch (error) {
      errors.push(`[${slug}] JSON illisible (${error instanceof Error ? error.message : "?"}).`);
      continue;
    }
    const checked = checkQuizFile(slug, raw);
    if (checked.quiz) quizzes.push({ slug, file, quiz: checked.quiz });
    errors.push(...checked.errors);
  }
  return { quizzes, errors };
}
