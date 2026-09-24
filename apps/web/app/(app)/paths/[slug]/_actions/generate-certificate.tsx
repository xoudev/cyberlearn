"use server";

import { CATALOGUE_PATH, prisma, quizRepository } from "@cyberlearn/db";
import { issueCertificate } from "@/lib/certificates/issue";
import { requireRequestUser } from "@/lib/auth";

// checkAndIssueCertificates used to live here. Every export of a "use server"
// file is a callable endpoint, and it takes a userId parameter, so it let a
// caller mint certificates for an arbitrary account. It now sits in
// @/lib/certificates/check-and-issue, reachable from the server only.

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
    // Catalogue only: a certificate carries the platform's name, and a path
    // one teacher assembled for one class is not something it vouches for.
    where: { slug: pathSlug, ...CATALOGUE_PATH },
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
