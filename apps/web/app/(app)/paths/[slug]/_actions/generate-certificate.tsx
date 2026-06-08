"use server";

import { pathRepository, prisma, quizRepository } from "@cyberlearn/db";
import { issueCertificate } from "@/lib/certificates/issue";
import { requireRequestUser } from "@/lib/auth";

/**
 * Called after a lesson is completed. For each published path containing that
 * lesson, if all its lessons are now complete:
 *  - path HAS an active quiz → do nothing (COMPLETED + cert are gated on a
 *    passing quiz attempt; see submitQuizAttempt). The quiz is "unlocked" by
 *    derivation: lessons complete && status != COMPLETED && active quiz exists.
 *  - path has NO quiz → issue the certificate immediately (unchanged behaviour;
 *    score stays null).
 */
export async function checkAndIssueCertificates(userId: string, lessonId: string): Promise<void> {
  const paths = await pathRepository.findPublishedPathsForLesson(lessonId);
  if (paths.length === 0) return;

  for (const path of paths) {
    if (!(await pathRepository.areLessonsComplete(userId, path.id))) continue;

    const quiz = await quizRepository.findActiveQuizByPathId(path.id);
    if (quiz) continue; // gated on the quiz — emission happens on a passing attempt

    await issueCertificate(userId, path.id);
  }
}

/**
 * Learner-triggered fallback: claim the certificate for a path that has NO active
 * quiz once all its lessons are complete. This keeps a 100%-complete, quiz-less
 * path from becoming a dead-end (the automatic emission on lesson-completion can
 * be missed if a quiz was active at completion time and later deactivated).
 *
 * Client-callable: the userId is derived from the session (never trusted from the
 * client), and the action refuses when an active quiz still gates the path.
 */
export async function claimCertificateAction(
  pathSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRequestUser();

  const path = await prisma.path.findFirst({
    where: { slug: pathSlug, status: "PUBLISHED" },
    select: { id: true },
  });
  if (!path) return { ok: false, error: "Parcours introuvable." };

  // Only claimable when no ACTIVE quiz gates the path (else the exam is required).
  const activeQuiz = await quizRepository.findActiveQuizByPathId(path.id);
  if (activeQuiz) return { ok: false, error: "Un examen final est requis pour ce parcours." };

  // issueCertificate re-checks lessons-complete + idempotence internally.
  const res = await issueCertificate(user.id, path.id);
  if (!res.issued) {
    return { ok: false, error: "Termine toutes les leçons du parcours d'abord." };
  }
  return { ok: true };
}
