"use server";

import { z } from "zod";
import { requireRequestUser } from "@/lib/auth";
import { recordQuizAnswer, type QuizAnswerResult } from "@/lib/lessons/quiz-answer";

const answerSchema = z.object({
  lessonId: z.string().uuid(),
  quizId: z.string().min(1).max(100),
  selected: z.number().int().min(0).max(25),
});

/** Web entry point: authenticates the session, then records the answer. */
export async function answerQuiz(
  lessonId: string,
  quizId: string,
  selected: number,
): Promise<QuizAnswerResult> {
  const parsed = answerSchema.safeParse({ lessonId, quizId, selected });
  if (!parsed.success) return { ok: false, error: "Réponse invalide." };
  const user = await requireRequestUser();
  return recordQuizAnswer(user.id, parsed.data.lessonId, parsed.data.quizId, parsed.data.selected);
}
