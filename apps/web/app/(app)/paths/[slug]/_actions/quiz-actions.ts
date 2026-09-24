"use server";

import { requireRequestUser } from "@/lib/auth";
import {
  startExam,
  submitExam,
  type StartQuizResult,
  type SubmitQuizResult,
} from "@/lib/exam/exam-service";

export type { StartQuizResult, SubmitQuizResult };

/** Web entry point: authenticates the session, then starts or resumes the exam. */
export async function startQuizAttempt(pathId: string): Promise<StartQuizResult> {
  const user = await requireRequestUser();
  return startExam(user.id, pathId);
}

/** Web entry point: authenticates the session, then submits the attempt. */
export async function submitQuizAttempt(
  attemptId: string,
  answers: unknown,
): Promise<SubmitQuizResult> {
  const user = await requireRequestUser();
  return submitExam(user.id, attemptId, answers);
}
