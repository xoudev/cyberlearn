import { prisma } from "@cyberlearn/db";
import { pseudonymize } from "@/lib/pseudonymize";

export interface DeletionSummary {
  hashedUserId: string; // pseudonymized — safe to surface to callers
  deletedAt: Date;
  certificatesAnonymized: number;
  questionsAnonymized: number;
  answersAnonymized: number;
  ratingsAnonymized: number;
  contactTicketsAnonymized: number;
  auditLogsAnonymized: number;
}

/**
 * Permanently deletes a user account in compliance with RGPD Art. 17.
 *
 * All operations run in a single Prisma interactive transaction so that any
 * mid-flight error causes a full rollback — the user record and its
 * anonymized counterparts are either all committed or all untouched.
 *
 * Anonymization strategy:
 *   - Certificate : userId → null, holderName → "Utilisateur supprimé"
 *   - LessonQuestion / LessonAnswer : userId → null (content preserved)
 *   - Rating : userId → null (aggregate stats preserved)
 *   - ContactTicket : userId → null, email → null
 *   - AuditLog : actorId → null, actorHashedId → HMAC, anonymized → true
 *
 * Hard-deleted via Prisma cascade:
 *   Profile, Preferences, PlacementTest, LessonProgress, PathProgress,
 *   ChallengeProgress, HintReveals, Badges, ReviewSchedule, Notifications,
 *   SkipWaivers, AccountDeletionTokens.
 */
export async function deleteAccount(
  userId: string,
  metadata: { ip: string; userAgent: string },
): Promise<DeletionSummary> {
  const hashedUserId = pseudonymize(userId);
  const hashedIp = pseudonymize(metadata.ip);
  const safeUserAgent = metadata.userAgent.slice(0, 500);
  const deletedAt = new Date();

  const summary = await prisma.$transaction(async (tx) => {
    // ── 1. Verify user exists ─────────────────────────────────────────────
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`deleteAccount: user not found (hash=${hashedUserId})`);
    }

    // ── 2. Snapshot counts BEFORE modification ────────────────────────────
    const [
      certificatesAnonymized,
      questionsAnonymized,
      answersAnonymized,
      ratingsAnonymized,
      contactTicketsAnonymized,
      auditLogsAnonymized,
    ] = await Promise.all([
      tx.certificate.count({ where: { userId } }),
      tx.lessonQuestion.count({ where: { userId } }),
      tx.lessonAnswer.count({ where: { userId } }),
      tx.rating.count({ where: { userId } }),
      tx.contactTicket.count({ where: { userId } }),
      tx.auditLog.count({ where: { actorId: userId } }),
    ]);

    // ── 3a. Anonymise Certificate ─────────────────────────────────────────
    await tx.certificate.updateMany({
      where: { userId },
      data: { userId: null, holderName: "Utilisateur supprimé" },
    });

    // ── 3b. Anonymise LessonQuestion ──────────────────────────────────────
    await tx.lessonQuestion.updateMany({
      where: { userId },
      data: { userId: null },
    });

    // ── 3c. Anonymise LessonAnswer ────────────────────────────────────────
    await tx.lessonAnswer.updateMany({
      where: { userId },
      data: { userId: null },
    });

    // ── 3d. Anonymise Rating ──────────────────────────────────────────────
    await tx.rating.updateMany({
      where: { userId },
      data: { userId: null },
    });

    // ── 3e. Anonymise ContactTicket ───────────────────────────────────────
    await tx.contactTicket.updateMany({
      where: { userId },
      data: { userId: null, email: null },
    });

    // ── 3f. Anonymise AuditLog ────────────────────────────────────────────
    // actorId stays as UUID FK (can't store HMAC in UUID column);
    // actorHashedId holds the pseudonymized identifier for traceability.
    await tx.auditLog.updateMany({
      where: { actorId: userId },
      data: { actorId: null, actorHashedId: hashedUserId, anonymized: true },
    });

    // ── 4. Hard delete User (Prisma cascade handles remaining relations) ──
    await tx.user.delete({ where: { id: userId } });

    // ── 5. Final immutable audit entry ────────────────────────────────────
    await tx.auditLog.create({
      data: {
        actorId: null,
        actorHashedId: hashedUserId,
        action: "user.account.deleted",
        targetType: "user",
        targetId: hashedUserId,
        anonymized: true,
        metadata: {
          ip: hashedIp,
          userAgent: safeUserAgent,
          certificatesAnonymized,
          questionsAnonymized,
          answersAnonymized,
          ratingsAnonymized,
          contactTicketsAnonymized,
          auditLogsAnonymized,
        },
      },
    });

    return {
      hashedUserId,
      deletedAt,
      certificatesAnonymized,
      questionsAnonymized,
      answersAnonymized,
      ratingsAnonymized,
      contactTicketsAnonymized,
      auditLogsAnonymized,
    } satisfies DeletionSummary;
  });

  return summary;
}
