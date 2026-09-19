import { prisma } from "../prisma.js";
import { createSupabaseAdminClient } from "../supabase/admin.js";

/**
 * Putting a learner back to their first day, without touching who they are.
 *
 * Written for the console, where somebody testing the learning loop needs an
 * account that has done nothing - and doing that by deleting and recreating
 * the account loses the username, the classes and the history that made it a
 * useful test account in the first place.
 *
 * The line is between what somebody earned and what somebody is. Everything
 * earned goes. Nothing they wrote, joined, or were told goes with it.
 *
 * Wiped:
 *   the counters on the row itself - XP, level, both streaks, freezes
 *   lesson, path, challenge and quest progress, and skip waivers
 *   badges, quiz attempts, hint reveals
 *   the review schedule, so spaced repetition starts over
 *   the activity calendar the streak is drawn from
 *   the XP ledger and every league membership, so seasons start over
 *   cosmetics owned and equipped - they are unlocked by level, and a locker
 *   full of items at level 1 is a reset that did not finish
 *   certificates, and their PDFs, because one names a path this account can no
 *   longer show it finished, on a URL anybody can check
 *   wrapped snapshots, which are frozen copies of figures that just changed
 *
 * Kept, each one a decision rather than an omission:
 *   identity and preferences - the point is to keep the account
 *   the placement test result. It is the output of an onboarding step this
 *   reset does not replay: onboarding is marked complete in the auth metadata,
 *   so clearing the scores would leave an account with no way to sit the test
 *   again and recommendations silently stuck on the neutral default
 *   notifications, tickets, forum posts, notes, ratings, questions and answers
 *   - somebody else is reading those
 *   friendships, class memberships, moderation events, bans, audit logs
 *
 * All database work is one interactive transaction. Object storage is not
 * transactional, so the certificate PDFs are removed after it commits and a
 * failure there is reported rather than thrown: the rows are already gone.
 */

const CERTIFICATE_BUCKET = "certificates";

/** What the reset put back to zero, so the console can say so. */
export interface ResetProgressSummary {
  resetAt: Date;
  xpCleared: number;
  levelBefore: number;
  lessonsCleared: number;
  pathsCleared: number;
  badgesCleared: number;
  certificatesCleared: number;
  reviewSchedulesCleared: number;
  activityDaysCleared: number;
  cosmeticsCleared: number;
  /** False when the PDFs outlived their rows - a loose end worth naming. */
  certificateFilesRemoved: boolean;
}

export interface ResetProgressOptions {
  /** Who pressed the button. Written to the audit log. */
  actorId: string;
  /** What the audit entry calls it. */
  action?: string;
  /**
   * Reporter for the post-commit storage cleanup, which cannot throw: the rows
   * are committed and nothing can bring them back. Defaults to console.error.
   */
  onCleanupError?: (area: string, error: unknown, context: Record<string, unknown>) => void;
}

function defaultCleanupReporter(
  area: string,
  error: unknown,
  context: Record<string, unknown>,
): void {
  // Constant format string, the area as an argument: a value interpolated into
  // it could forge the shape of a log line.
  console.error("[reset-progress] cleanup failed", { area, error, ...context });
}

export async function resetProgress(
  userId: string,
  options: ResetProgressOptions,
): Promise<ResetProgressSummary> {
  const report = options.onCleanupError ?? defaultCleanupReporter;
  let certificateKeys: string[] = [];

  const summary = await prisma.$transaction(async (tx) => {
    const before = await tx.user.findUnique({
      where: { id: userId },
      select: { xpTotal: true, level: true },
    });
    if (!before) throw new Error(`reset-progress: no such user ${userId}`);

    // Read the storage keys while the rows still exist; the files are removed
    // once this has committed.
    const certificates = await tx.certificate.findMany({
      where: { userId },
      select: { pdfStorageKey: true },
    });
    certificateKeys = certificates.map((row) => row.pdfStorageKey).filter((key) => key !== "");

    // Path progress first: it holds the foreign key to a certificate, and the
    // certificate rows go next.
    const [pathsCleared, badgesCleared, lessonsCleared, reviewSchedulesCleared] = await Promise.all(
      [
        tx.userPathProgress.deleteMany({ where: { userId } }),
        tx.userBadge.deleteMany({ where: { userId } }),
        tx.userLessonProgress.deleteMany({ where: { userId } }),
        tx.reviewSchedule.deleteMany({ where: { userId } }),
      ],
    );

    const certificatesCleared = await tx.certificate.deleteMany({ where: { userId } });

    const [activityDaysCleared, cosmeticsCleared] = await Promise.all([
      tx.userActivityDay.deleteMany({ where: { userId } }),
      tx.userCosmetic.deleteMany({ where: { userId } }),
    ]);

    await Promise.all([
      tx.userSkipWaiver.deleteMany({ where: { userId } }),
      tx.userChallengeProgress.deleteMany({ where: { userId } }),
      tx.challengeHintReveal.deleteMany({ where: { userId } }),
      tx.quizAttempt.deleteMany({ where: { userId } }),
      tx.userQuestProgress.deleteMany({ where: { userId } }),
      tx.xpLedger.deleteMany({ where: { userId } }),
      tx.leagueMembership.deleteMany({ where: { userId } }),
      tx.wrappedSnapshot.deleteMany({ where: { userId } }),
      tx.userCosmeticLoadout.deleteMany({ where: { userId } }),
    ]);

    await tx.user.update({
      where: { id: userId },
      data: {
        xpTotal: 0,
        level: 1,
        streakDays: 0,
        longestStreak: 0,
        // The schema's own default: a fresh account starts with one freeze in
        // reserve, and a reset that left zero would be harsher than a new one.
        streakFreezes: 1,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: options.actorId,
        action: options.action ?? "admin.user.progress.reset",
        targetType: "User",
        targetId: userId,
        metadata: {
          xpCleared: before.xpTotal,
          levelBefore: before.level,
          lessonsCleared: lessonsCleared.count,
          pathsCleared: pathsCleared.count,
          badgesCleared: badgesCleared.count,
          certificatesCleared: certificatesCleared.count,
        },
      },
    });

    return {
      resetAt: new Date(),
      xpCleared: before.xpTotal,
      levelBefore: before.level,
      lessonsCleared: lessonsCleared.count,
      pathsCleared: pathsCleared.count,
      badgesCleared: badgesCleared.count,
      certificatesCleared: certificatesCleared.count,
      reviewSchedulesCleared: reviewSchedulesCleared.count,
      activityDaysCleared: activityDaysCleared.count,
      cosmeticsCleared: cosmeticsCleared.count,
    };
  });

  let certificateFilesRemoved = true;
  if (certificateKeys.length > 0) {
    try {
      const admin = createSupabaseAdminClient();
      const { error } = await admin.storage.from(CERTIFICATE_BUCKET).remove(certificateKeys);
      if (error) {
        certificateFilesRemoved = false;
        report("reset.certificates", error, { userId, objectCount: certificateKeys.length });
      }
    } catch (error) {
      certificateFilesRemoved = false;
      report("reset.certificates", error, { userId, objectCount: certificateKeys.length });
    }
  }

  return { ...summary, certificateFilesRemoved };
}
