"use server";

import { requireRequestUser } from "@/lib/auth";
import {
  mockExamOverview,
  startMockExam,
  submitMockExam,
  type MockOverview,
  type MockStartResult,
  type MockSubmitResult,
} from "@/lib/exam/mock-exam";

/**
 * The site's entry points for a mock exam: the session, then the service the
 * app uses too (@/lib/exam/mock-exam), which reads its input with Zod.
 */

/**
 * What the exam covers and the attempts already made, for the window on the
 * path's page: read when it opens. Null for a path the reader may not open.
 */
export async function mockOverviewAction(slug: unknown): Promise<MockOverview | null> {
  const user = await requireRequestUser();
  return mockExamOverview(user.id, slug);
}

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
