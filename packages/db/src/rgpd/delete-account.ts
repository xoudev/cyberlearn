import { uploadedAvatarKey } from "@cyberlearn/types";
import { pseudonymize } from "@cyberlearn/lib/pseudonymize";
import { prisma } from "../prisma.js";
import { createSupabaseAdminClient } from "../supabase/admin.js";

/**
 * Erasing an account, for whoever asks - the person themselves or an
 * administrator.
 *
 * This lived in apps/web, reachable only from the RGPD self-service route.
 * Giving the console a delete button meant either reaching across app
 * boundaries or writing the erasure a second time, and a second erasure is how
 * one of them quietly stops erasing something: a table added to the
 * anonymisation list here and not there, a bucket cleaned on one path only.
 * There is one, and both callers use it.
 *
 * All database work runs in a single interactive transaction, so a mid-flight
 * error rolls the whole thing back - the user row and its anonymised
 * counterparts are either all committed or all untouched.
 *
 * Anonymised rather than deleted, because the content is not only theirs:
 *   Certificate     userId → null, holderName → "Utilisateur supprimé"
 *   LessonQuestion  userId → null (the thread stays readable)
 *   LessonAnswer    userId → null
 *   Rating          userId → null (aggregates stay honest)
 *   ContactTicket   userId → null, email → null
 *   AuditLog        actorId → null, actorHashedId → HMAC, anonymized → true
 *
 * Hard-deleted by Prisma cascade: profile, preferences, placement test, lesson
 * and path and challenge progress, hint reveals, badges, review schedule,
 * notifications, skip waivers, deletion tokens, class memberships.
 */

const CERTIFICATE_BUCKET = "certificates";
const AVATAR_BUCKET = "avatars";

/** pdfStorageKey is NOT NULL, so an erased certificate gets an explicit marker. */
const ERASED_STORAGE_KEY = "__erased__";

export interface DeletionSummary {
  hashedUserId: string; // pseudonymized - safe to surface to callers
  deletedAt: Date;
  certificatesAnonymized: number;
  questionsAnonymized: number;
  answersAnonymized: number;
  ratingsAnonymized: number;
  contactTicketsAnonymized: number;
  auditLogsAnonymized: number;
  /**
   * Whether auth.users went with public.users.
   *
   * False is not a rollback: the data is gone, which is what Art. 17 turns on,
   * and an identity that can no longer reach any of it is a loose end rather
   * than a failure to erase. It is reported instead of thrown so the caller can
   * say so, and it is written to the audit log either way.
   */
  authIdentityDeleted: boolean;
}

export interface DeleteAccountOptions {
  /** Hashed before storage; never written raw. */
  ip: string;
  userAgent: string;
  /**
   * Who pressed the button, when it was not the account holder. Recorded on
   * the final audit entry, which is the only trace left once the row is gone.
   */
  actorId?: string | null;
  /** What the audit entry calls it. Defaults to the self-service erasure. */
  action?: string;
  /**
   * Reporter for post-commit cleanup failures. Object storage is not
   * transactional, so these happen after the point of no return and must not
   * throw: the rows are already gone and nothing can bring them back. Defaults
   * to console.error; apps/web passes Sentry.
   */
  onCleanupError?: (area: string, error: unknown, context: Record<string, unknown>) => void;
}

function defaultCleanupReporter(
  area: string,
  error: unknown,
  context: Record<string, unknown>,
): void {
  console.error(`[rgpd] ${area} cleanup failed:`, error, context);
}

export async function deleteAccount(
  userId: string,
  options: DeleteAccountOptions,
): Promise<DeletionSummary> {
  const {
    ip,
    userAgent,
    actorId = null,
    action = "user.account.deleted",
    onCleanupError = defaultCleanupReporter,
  } = options;

  const hashedUserId = pseudonymize(userId);
  const hashedIp = pseudonymize(ip);
  const safeUserAgent = userAgent.slice(0, 500);
  const deletedAt = new Date();

  // Collected inside the transaction, erased from Storage once it commits:
  // object storage is not transactional, so removing files first would leave
  // them gone after a rollback.
  let avatarUrl: string | null = null;
  let certificateStorageKeys: string[] = [];

  const summary = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`deleteAccount: user not found (hash=${hashedUserId})`);
    }
    avatarUrl = user.avatarUrl;

    // Counted before anything is modified - afterwards they are all zero.
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

    // The storage key embeds the user's UUID and the PDF behind it carries
    // their real name, so neither may survive the erasure. The objects
    // themselves are removed after the transaction commits.
    const issuedCertificates = await tx.certificate.findMany({
      where: { userId },
      select: { pdfStorageKey: true },
    });
    certificateStorageKeys = issuedCertificates
      .map((c) => c.pdfStorageKey)
      .filter((key) => key !== "" && key !== ERASED_STORAGE_KEY && key !== "pending");

    await tx.certificate.updateMany({
      where: { userId },
      data: {
        userId: null,
        holderName: "Utilisateur supprimé",
        pdfStorageKey: ERASED_STORAGE_KEY,
      },
    });
    await tx.lessonQuestion.updateMany({ where: { userId }, data: { userId: null } });
    await tx.lessonAnswer.updateMany({ where: { userId }, data: { userId: null } });
    await tx.rating.updateMany({ where: { userId }, data: { userId: null } });
    await tx.contactTicket.updateMany({ where: { userId }, data: { userId: null, email: null } });

    // actorId stays a UUID FK (an HMAC does not fit a uuid column);
    // actorHashedId holds the pseudonymized identifier for traceability.
    await tx.auditLog.updateMany({
      where: { actorId: userId },
      data: { actorId: null, actorHashedId: hashedUserId, anonymized: true },
    });

    await tx.user.delete({ where: { id: userId } });

    await tx.auditLog.create({
      data: {
        // The administrator who did it stays named; the person it was done to
        // is a hash. Anonymising the actor as well would leave no one
        // accountable for the one action that cannot be reviewed afterwards.
        actorId,
        actorHashedId: hashedUserId,
        action,
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
    };
  });

  // ── Post-commit: files, then the identity ────────────────────────────────
  // The database rows are already gone, which is what Art. 17 turns on. A
  // storage hiccup must not resurrect them, so failures are reported rather
  // than thrown.
  const admin = createSupabaseAdminClient();

  const avatarKey = uploadedAvatarKey(avatarUrl);
  if (avatarKey !== null) {
    try {
      const { error } = await admin.storage.from(AVATAR_BUCKET).remove([avatarKey]);
      if (error) throw new Error(error.message);
    } catch (error) {
      onCleanupError("rgpd.delete.avatar", error, { hashedUserId });
    }
  }

  if (certificateStorageKeys.length > 0) {
    try {
      const { error } = await admin.storage.from(CERTIFICATE_BUCKET).remove(certificateStorageKeys);
      if (error) throw new Error(error.message);
    } catch (error) {
      onCleanupError("rgpd.delete.certificates", error, {
        hashedUserId,
        objectCount: certificateStorageKeys.length,
      });
    }
  }

  // public.users is gone; this is auth.users. It lives here rather than in each
  // caller because an account whose identity survives can still sign in, and
  // upsertFromAuth would hand it a fresh empty profile - an erasure that undoes
  // itself at the next login. One caller remembering is not a design.
  let authIdentityDeleted = true;
  try {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
  } catch (error) {
    authIdentityDeleted = false;
    onCleanupError("rgpd.delete.auth", error, { hashedUserId });
    await prisma.auditLog.create({
      data: {
        actorId,
        actorHashedId: hashedUserId,
        action: "user.account.auth_delete_failed",
        targetType: "user",
        targetId: hashedUserId,
        anonymized: true,
        metadata: { error: error instanceof Error ? error.message : String(error) },
      },
    });
  }

  return { ...summary, authIdentityDeleted };
}
