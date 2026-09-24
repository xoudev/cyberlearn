import { z } from "zod";
import { CATALOGUE_PATH, prisma, quizRepository } from "@cyberlearn/db";
import { issueCertificate } from "@/lib/certificates/issue";

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/);

/**
 * Learner-triggered fallback: claim the certificate for a path that has NO
 * active quiz once all its lessons are complete. This keeps a 100%-complete,
 * quiz-less path from becoming a dead-end (the automatic emission on lesson
 * completion can be missed if a quiz was active at completion time and later
 * deactivated).
 *
 * Shared by the site (claimCertificateAction) and the app
 * (/api/mobile/exam/claim). Callers are responsible for AUTHENTICATION:
 * `userId` must be a verified identity. Lives outside any "use server" module
 * so it cannot be invoked with an arbitrary userId.
 */
export async function claimCertificate(
  userId: string,
  pathSlug: unknown,
): Promise<{ ok: boolean; error?: string }> {
  const slug = slugSchema.safeParse(pathSlug);
  if (!slug.success) return { ok: false, error: "Parcours introuvable." };

  const path = await prisma.path.findFirst({
    // Catalogue only: a certificate carries the platform's name, and a path
    // one teacher assembled for one class is not something it vouches for.
    where: { slug: slug.data, ...CATALOGUE_PATH },
    select: { id: true },
  });
  if (!path) return { ok: false, error: "Parcours introuvable." };

  // Only claimable when no ACTIVE quiz gates the path (else the exam is required).
  const activeQuiz = await quizRepository.findActiveQuizByPathId(path.id);
  if (activeQuiz) return { ok: false, error: "Un examen final est requis pour ce parcours." };

  // issueCertificate re-checks lessons-complete + idempotence internally.
  const res = await issueCertificate(userId, path.id);
  if (!res.issued) {
    return { ok: false, error: "Termine toutes les leçons du parcours d'abord." };
  }
  return { ok: true };
}
