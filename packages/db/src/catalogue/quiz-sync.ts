/**
 * Writes a path's final exam from a content/quizzes file. The one
 * implementation behind both doors an exam can come in by: the seed-quizzes
 * script, and the console's "Synchroniser avec le dépôt" page.
 *
 * Idempotent, and it never deletes a question. An attempt stores the ids of
 * the questions it drew and is scored against them (findQuestionsByIds reads
 * inactive rows too), so a question deleted while someone is sitting the exam
 * would leave that attempt unscorable. Instead, a question of the file whose
 * text is already in the pool keeps its row and is updated in place; a new one
 * is created; a question no longer in the file is switched off, which takes it
 * out of every future draw. All of it in one transaction, so a draw never sees
 * a pool half rewritten.
 */

import type { PrismaClient } from "@prisma/client";
import { changedValue, type CatalogueChange } from "./changes";
import type { QuizFile } from "./quiz-files";

export interface QuizSyncResult {
  quizId: string;
  /** False when the path already had a quiz, now rewritten. */
  created: boolean;
  /** Active questions after the sync: the file's pool. */
  questions: number;
  /** Questions of the database no longer in the file, now inactive. */
  retired: number;
}

export async function syncQuiz(
  client: PrismaClient,
  pathId: string,
  quiz: QuizFile,
): Promise<QuizSyncResult> {
  return client.$transaction(
    async (tx) => {
      const existing = await tx.quiz.findUnique({ where: { pathId }, select: { id: true } });
      const fields = {
        passThreshold: quiz.passThreshold,
        questionsToDraw: quiz.questionsToDraw,
        isActive: true,
      };
      const saved = await tx.quiz.upsert({
        where: { pathId },
        create: { pathId, ...fields },
        update: fields,
        select: { id: true },
      });

      const stored = await tx.quizQuestion.findMany({
        where: { quizId: saved.id },
        orderBy: [{ isActive: "desc" }, { orderIndex: "asc" }],
        select: { id: true, question: true },
      });
      const unused = new Map<string, string[]>();
      for (const row of stored) {
        unused.set(row.question, [...(unused.get(row.question) ?? []), row.id]);
      }

      const kept = new Set<string>();
      for (const [orderIndex, q] of quiz.questions.entries()) {
        const data = {
          question: q.question,
          // SAFETY: checked as [{ id, text }] by checkQuizFile; Prisma stores Json.
          options: q.options as unknown as object,
          correctOptionId: q.correctOptionId,
          explanation: q.explanation && q.explanation.length > 0 ? q.explanation : null,
          orderIndex,
          isActive: true,
        };
        const id = unused.get(q.question)?.shift();
        if (id) {
          await tx.quizQuestion.update({ where: { id }, data });
          kept.add(id);
        } else {
          await tx.quizQuestion.create({ data: { quizId: saved.id, ...data } });
        }
      }

      const retired = await tx.quizQuestion.updateMany({
        where: {
          quizId: saved.id,
          isActive: true,
          id: { in: stored.filter((row) => !kept.has(row.id)).map((row) => row.id) },
        },
        data: { isActive: false },
      });

      return {
        quizId: saved.id,
        created: existing === null,
        questions: quiz.questions.length,
        retired: retired.count,
      };
    },
    { timeout: 60_000 },
  );
}

/** A quiz as the database holds it. */
export interface StoredQuiz {
  passThreshold: number;
  questionsToDraw: number;
  isActive: boolean;
  /** Every question, active or not, in pool order (orderIndex). */
  questions: {
    question: string;
    options: unknown;
    correctOptionId: string;
    explanation: string | null;
    isActive: boolean;
  }[];
}

function sameOptions(stored: unknown, file: QuizFile["questions"][number]["options"]): boolean {
  if (!Array.isArray(stored) || stored.length !== file.length) return false;
  return file.every((o, i) => {
    const s: unknown = stored[i];
    return (
      typeof s === "object" &&
      s !== null &&
      "id" in s &&
      "text" in s &&
      s.id === o.id &&
      s.text === o.text
    );
  });
}

/**
 * Whether the database already holds what syncQuiz would write. Inactive
 * questions are ignored: they are the ones a sync retires on purpose.
 */
export function quizMatches(stored: StoredQuiz, quiz: QuizFile): boolean {
  const active = stored.questions.filter((q) => q.isActive);
  if (
    !stored.isActive ||
    stored.passThreshold !== quiz.passThreshold ||
    stored.questionsToDraw !== quiz.questionsToDraw ||
    active.length !== quiz.questions.length
  ) {
    return false;
  }
  return quiz.questions.every((q, i) => {
    const s = active[i];
    return (
      s?.question === q.question &&
      s.correctOptionId === q.correctOptionId &&
      (s.explanation ?? "") === (q.explanation ?? "") &&
      sameOptions(s.options, q.options)
    );
  });
}

/**
 * What syncQuiz would change, in words: the settings, then the questions as
 * it matches them, by their text. Empty when quizMatches holds; the console
 * lists it before anyone confirms a sync.
 */
export function quizChanges(stored: StoredQuiz, quiz: QuizFile): CatalogueChange[] {
  const changes: CatalogueChange[] = [];
  if (!stored.isActive) {
    changes.push({ kind: "changed", label: "Examen", before: "désactivé", after: "actif" });
  }
  changes.push(
    ...changedValue(
      "Seuil",
      `${String(stored.passThreshold)} %`,
      `${String(quiz.passThreshold)} %`,
    ),
    ...changedValue("Questions tirées", stored.questionsToDraw, quiz.questionsToDraw),
  );

  const active = stored.questions.filter((q) => q.isActive);
  const activeByText = new Map<string, StoredQuiz["questions"][number]>();
  for (const q of active) if (!activeByText.has(q.question)) activeByText.set(q.question, q);
  const inactive = new Set(stored.questions.filter((q) => !q.isActive).map((q) => q.question));

  for (const [index, q] of quiz.questions.entries()) {
    const label = `Question ${String(index + 1)}`;
    const saved = activeByText.get(q.question);
    if (!saved) {
      changes.push({
        kind: "added",
        label: inactive.has(q.question) ? `${label} (réactivée)` : label,
        value: q.question,
      });
      continue;
    }
    const parts = [
      ...(sameOptions(saved.options, q.options) ? [] : ["options"]),
      ...(saved.correctOptionId === q.correctOptionId ? [] : ["bonne réponse"]),
      ...((saved.explanation ?? "") === (q.explanation ?? "") ? [] : ["explication"]),
    ];
    if (parts.length > 0) {
      changes.push({ kind: "modified", label, value: `${q.question} (${parts.join(", ")})` });
    }
  }

  const kept = new Set(quiz.questions.map((q) => q.question));
  for (const q of active) {
    if (!kept.has(q.question)) {
      changes.push({ kind: "removed", label: "Question désactivée", value: q.question });
    }
  }

  // The same questions in another order: the pool is read in its order.
  const order = active.map((q) => q.question).filter((text) => kept.has(text));
  const wanted = quiz.questions.map((q) => q.question).filter((text) => activeByText.has(text));
  if (order.join("\n") !== wanted.join("\n")) {
    changes.push({ kind: "modified", label: "Ordre", value: "Les questions changent d'ordre." });
  }
  return changes;
}
