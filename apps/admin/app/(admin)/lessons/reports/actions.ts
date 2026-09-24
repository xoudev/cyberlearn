"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma, quizReportRepository } from "@cyberlearn/db";
import { requireAdminAction } from "@/lib/auth";

const schema = z.object({
  lessonId: z.string().uuid(),
  quizId: z.string().min(1).max(100),
});

/**
 * Closes every open report on one question, once it has been fixed or read
 * and kept. A learner who reports it again reopens theirs.
 */
export async function resolveQuizReportsAction(formData: FormData): Promise<void> {
  const admin = await requireAdminAction();
  const parsed = schema.safeParse({
    lessonId: formData.get("lessonId"),
    quizId: formData.get("quizId"),
  });
  if (!parsed.success) return;

  const { lessonId, quizId } = parsed.data;
  const count = await quizReportRepository.resolveQuiz(lessonId, quizId);
  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "quiz.report.resolve",
      targetType: "lesson",
      targetId: lessonId,
      metadata: { quizId, count },
    },
  });
  revalidatePath("/lessons/reports");
  revalidatePath("/lessons");
}
