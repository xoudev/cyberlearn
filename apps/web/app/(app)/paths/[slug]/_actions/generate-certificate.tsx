"use server";

import { pathRepository, quizRepository } from "@cyberlearn/db";
import { issueCertificate } from "@/lib/certificates/issue";

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
