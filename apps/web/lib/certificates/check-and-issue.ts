import { pathRepository, quizRepository } from "@cyberlearn/db";
import { issueCertificate } from "@/lib/certificates/issue";

/**
 * Called server-side after a lesson is completed. For each published path
 * containing that lesson, if all its lessons are now complete:
 *  - path HAS an active quiz → do nothing (COMPLETED + cert are gated on a
 *    passing quiz attempt; see submitQuizAttempt). The quiz is "unlocked" by
 *    derivation: lessons complete && status != COMPLETED && active quiz exists.
 *  - path has NO quiz → issue the certificate immediately (score stays null).
 *
 * This takes `userId` as a parameter, so it must never be reachable from the
 * client: it lives in a plain module rather than a "use server" file, where
 * every export becomes a callable endpoint. Client-triggered emission goes
 * through claimCertificateAction, which derives the user from the session.
 */
export async function checkAndIssueCertificates(userId: string, lessonId: string): Promise<void> {
  const paths = await pathRepository.findPublishedPathsForLesson(lessonId);
  if (paths.length === 0) return;

  for (const path of paths) {
    if (!(await pathRepository.areLessonsComplete(userId, path.id))) continue;

    const quiz = await quizRepository.findActiveQuizByPathId(path.id);
    if (quiz) continue; // gated on the quiz - emission happens on a passing attempt

    await issueCertificate(userId, path.id);
  }
}
