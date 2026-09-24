"use server";

import { requireRequestUser } from "@/lib/auth";
import { reportQuiz, type QuizReportResult } from "@/lib/lessons/quiz-report";

/** Web entry point: authenticates the session, then records the report. */
export async function reportQuizAction(input: unknown): Promise<QuizReportResult> {
  const user = await requireRequestUser();
  return reportQuiz(user.id, input);
}
