import { z } from "zod";
import { extractLessonQuizzes } from "@cyberlearn/lib/mdx-quizzes";
import {
  QUIZ_REPORT_REASONS,
  lessonRepository,
  prisma,
  quizReportRepository,
} from "@cyberlearn/db";

export const quizReportSchema = z.object({
  lessonId: z.string().uuid(),
  quizId: z.string().min(1).max(100),
  reason: z.enum(QUIZ_REPORT_REASONS),
  comment: z.string().trim().max(500).optional(),
});

export type QuizReportInput = z.infer<typeof quizReportSchema>;

export type QuizReportResult = { ok: true } | { ok: false; error: string };

/** Reports a learner may file or change in an hour. A lesson has a handful of quizzes. */
export const QUIZ_REPORTS_PER_HOUR = 30;

/**
 * Records a learner's report on one quiz of a lesson.
 *
 * As for an answer (recordQuizAnswer), the lesson has to have been opened,
 * which is where access to it is decided, and the question has to exist in
 * the lesson as stored.
 *
 * Callers are responsible for AUTHENTICATION: `userId` must be a verified
 * identity (server action session or mobile Bearer JWT). Lives outside any
 * "use server" module so it cannot be invoked with an arbitrary userId.
 */
export async function reportQuiz(userId: string, input: unknown): Promise<QuizReportResult> {
  const parsed = quizReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Signalement invalide." };
  const { lessonId, quizId, reason } = parsed.data;
  const comment =
    parsed.data.comment === undefined || parsed.data.comment === "" ? null : parsed.data.comment;

  const [lesson, progress, recent] = await Promise.all([
    prisma.lesson.findUnique({ where: { id: lessonId }, select: { contentMdx: true } }),
    lessonRepository.findProgress(userId, lessonId),
    quizReportRepository.countSince(userId, new Date(Date.now() - 60 * 60 * 1000)),
  ]);
  if (!lesson || !progress) return { ok: false, error: "Leçon introuvable." };
  if (!extractLessonQuizzes(lesson.contentMdx).some((q) => q.id === quizId)) {
    return { ok: false, error: "Cette question n'existe plus dans la leçon." };
  }
  if (recent >= QUIZ_REPORTS_PER_HOUR) {
    return { ok: false, error: "Beaucoup de signalements d'un coup : réessaie dans une heure." };
  }

  await quizReportRepository.upsert(userId, lessonId, quizId, reason, comment);
  return { ok: true };
}
