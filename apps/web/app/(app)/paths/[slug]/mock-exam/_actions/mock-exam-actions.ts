"use server";

import { requireRequestUser } from "@/lib/auth";
import {
  startMockExam,
  submitMockExam,
  type MockStartResult,
  type MockSubmitResult,
} from "@/lib/exam/mock-exam";

/**
 * The site's entry points for a mock exam: the session, then the service the
 * app uses too (@/lib/exam/mock-exam), which reads its input with Zod.
 */

export async function startMockExamAction(pathId: unknown): Promise<MockStartResult> {
  const user = await requireRequestUser();
  return startMockExam(user.id, pathId);
}

export async function submitMockExamAction(
  attemptId: unknown,
  answers: unknown,
): Promise<MockSubmitResult> {
  const user = await requireRequestUser();
  return submitMockExam(user.id, attemptId, answers);
}
