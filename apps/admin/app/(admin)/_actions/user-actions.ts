"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  auditLogRepository,
  banRepository,
  deleteAccount,
  resetProgress,
  userRepository,
  UserRole,
  type ChangeRoleResult,
} from "@cyberlearn/db";
import { AUDIT_ACTION } from "@cyberlearn/db/audit-actions";
import { banExpiryFor, banTimeLeft, isBanDurationKey } from "@cyberlearn/lib";
import { sendAccountDeletedEmail, sendBanNoticeEmail } from "@cyberlearn/email";
import { LAST_ADMIN_REFUSAL, banRefusal, roleChangeRefusal } from "@/lib/account-guards";
import { requireAdminAction } from "@/lib/auth";
import { deletedAccountHref } from "@/lib/deletion-notice";
import { env } from "@/lib/env";
import { learnerSiteUrl, learnerUrl } from "@/lib/learner-url";
import { PRIVACY_CONTACT_EMAIL } from "@/lib/support-contact";

import { logger, errorMessage } from "@cyberlearn/lib/logger";

// The Prisma enum rather than a spelled-out list: the accepted values are the ones
// the column can hold, by construction. A hand-written enum here would be one
// more copy to remember - and the one guarding a privilege change is the worst
// place to find out a copy was missed.
const updateRoleSchema = z.object({
  userId: z.guid(),
  newRole: z.enum(UserRole),
});

/**
 * Changes somebody's role, from the select on the users list.
 *
 * Two refusals, in two places. Demoting oneself is refused here, against the
 * session; demoting the last administrator is refused by the repository, in
 * the transaction that writes the role, because that rule depends on every
 * other account and a count read before the write can be stale by the time it
 * lands. Every outcome comes back as a sentence the list shows next to the
 * control, rather than as a thrown error that left the select where it was
 * with no word of why.
 *
 * The audit row is written by the repository, in the same transaction as the
 * role: a privilege change and its trace land together or not at all, and a
 * failed audit write is a failed change, reported like any other.
 */
export async function updateUserRoleAction(
  userId: string,
  newRole: UserRole,
): Promise<{ ok: boolean; error?: string }> {
  const admin = await requireAdminAction();

  const input = updateRoleSchema.safeParse({ userId, newRole });
  if (!input.success) {
    return { ok: false, error: "Paramètres invalides." };
  }

  const refusal = roleChangeRefusal({
    actorId: admin.id,
    targetId: input.data.userId,
    newRole: input.data.newRole,
  });
  if (refusal !== null) return { ok: false, error: refusal };

  let result: ChangeRoleResult;
  try {
    result = await userRepository.changeRole(input.data.userId, input.data.newRole, {
      actorId: admin.id,
    });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "updateUserRoleAction failed");
    return { ok: false, error: "Le changement de rôle a échoué. Rien n'a été modifié." };
  }
  if (!result.ok) {
    return {
      ok: false,
      error: result.reason === "LAST_ADMIN" ? LAST_ADMIN_REFUSAL : "Ce compte n'existe plus.",
    };
  }
  if (result.previousRole === input.data.newRole) return { ok: true };

  revalidatePath("/users");
  revalidatePath(`/users/${input.data.userId}`);
  return { ok: true };
}

// ─── Deletion ───────────────────────────────────────────────────────────────

const deleteUserSchema = z.object({
  userId: z.guid(),
  /**
   * The account's own e-mail, typed back by the administrator.
   *
   * Not a checkbox and not a modal: the one thing that separates deleting the
   * right account from deleting the one above it in a sorted list is having
   * looked at which row you are on. Typing the address is how you look.
   */
  confirmEmail: z.string().trim().toLowerCase().pipe(z.email()),
  /** Shown to the person in the notice. Nothing is invented when absent. */
  reason: z.string().trim().max(300).optional().or(z.literal("")),
});

/**
 * Only a refusal comes back here. A deletion that ran leaves the account's
 * page, which no longer exists, for the list: see deletedAccountHref.
 */
export interface DeleteUserState {
  error?: string;
}

export async function deleteUserAction(
  _prev: DeleteUserState,
  formData: FormData,
): Promise<DeleteUserState> {
  const admin = await requireAdminAction();
  const parsed = deleteUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Adresse de confirmation invalide." };

  // Read before erasing: afterwards there is no address to write to and no name
  // to write to it with.
  const target = await userRepository.findConsoleTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };

  if (target.email.toLowerCase() !== parsed.data.confirmEmail) {
    return { error: "L'adresse saisie ne correspond pas à ce compte." };
  }

  // An administrator deleting their own account from the console would erase
  // the session they are holding, mid-request. The self-service flow exists and
  // asks for a confirmation by e-mail, which is the right way round.
  if (target.id === admin.id) {
    return { error: "Supprime ton propre compte depuis tes paramètres, pas depuis la console." };
  }

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for");
  const ip = forwarded ? (forwarded.split(",")[0]?.trim() ?? "unknown") : "unknown";

  let summary;
  try {
    summary = await deleteAccount(target.id, {
      ip,
      userAgent: requestHeaders.get("user-agent") ?? "",
      actorId: admin.id,
      // Distinct from the self-service action, so the audit log can tell apart
      // someone who left from someone who was removed.
      action: AUDIT_ACTION.user.deleted,
    });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "deleteUserAction failed");
    return { error: "La suppression a échoué. Rien n'a été effacé." };
  }

  // After the erasure, never before it. Sending first would mean telling
  // someone their account is gone and then failing to delete it; sending after
  // means the notice is always true, and a mail that does not go out is a
  // missing notice rather than a false one.
  let emailFailed = false;
  try {
    await sendAccountDeletedEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: target.email,
      displayName: target.displayName || (target.username ?? "toi"),
      deletedAt: new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      }).format(summary.deletedAt),
      // The address the privacy policy publishes: the sender is a noreply.
      contactEmail: PRIVACY_CONTACT_EMAIL,
      reason: parsed.data.reason === "" ? undefined : parsed.data.reason,
    });
  } catch (error) {
    // The account is already gone; nothing here can put it back. The failure is
    // recorded where it can still be acted on rather than thrown away.
    emailFailed = true;
    logger.error({ scope: "admin", err: errorMessage(error) }, "account deletion notice failed");
    await auditLogRepository.record({
      actorId: admin.id,
      actorHashedId: summary.hashedUserId,
      action: AUDIT_ACTION.user.deletionNoticeFailed,
      targetType: "user",
      targetId: summary.hashedUserId,
      anonymized: true,
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
  }

  revalidatePath("/users");
  // Both warnings travel with the redirect: the auth identity that survived
  // still has to be removed by hand, and the list is where that is said.
  redirect(deletedAccountHref({ emailFailed, authSurvived: !summary.authIdentityDeleted }));
}

// ── Bans ──────────────────────────────────────────────────────────────────────

const banSchema = z.object({
  userId: z.guid(),
  duration: z.string().refine(isBanDurationKey, "Durée invalide."),
  /**
   * Required, and not by accident.
   *
   * A ban whose reason is blank cannot be appealed - there is nothing to answer
   * - and whoever picks the appeal up has nothing to review either. Thirty
   * characters is roughly a sentence, which is the least that is any use to the
   * person reading it in their inbox.
   */
  reason: z.string().trim().min(30, "Explique le motif : au moins 30 caractères.").max(500),
});

export interface BanUserState {
  error?: string;
  ok?: boolean;
  /** True when the ban was issued but the notice could not be delivered. */
  emailFailed?: boolean;
}

/**
 * Bans an account.
 *
 * The order matters: ban first, then write to them. Sending first would mean
 * telling somebody they are banned and then failing to ban them; sending after
 * means the notice is always true, and a mail that does not go out is a missing
 * notice rather than a false one - the same rule the deletion notice follows.
 */
export async function banUserAction(
  _prev: BanUserState,
  formData: FormData,
): Promise<BanUserState> {
  const admin = await requireAdminAction();
  const parsed = banSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const target = await userRepository.findConsoleTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };

  // The same rule the moderation queue applies before its own sanction.
  const refusal = banRefusal({ actorId: admin.id, targetId: target.id, targetRole: target.role });
  if (refusal !== null) return { error: refusal };

  const now = new Date();
  // No cast: the schema refines with a type predicate, so duration is already
  // one of the keys on offer by the time it gets here.
  const expiresAt = banExpiryFor(parsed.data.duration, now);

  const issued = await banRepository.issue({
    userId: target.id,
    reason: parsed.data.reason,
    expiresAt,
    issuedById: admin.id,
    now,
  });
  if (!issued.ok) return { error: "Ce compte est déjà banni." };

  await auditLogRepository.record({
    actorId: admin.id,
    action: AUDIT_ACTION.user.banned,
    targetType: "User",
    targetId: target.id,
    metadata: { expiresAt: expiresAt?.toISOString() ?? null, reason: parsed.data.reason },
  });

  let emailFailed = false;
  try {
    await sendBanNoticeEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: target.email,
      displayName: target.displayName || (target.username ?? "toi"),
      reason: parsed.data.reason,
      durationLabel: banTimeLeft(expiresAt, now),
      endsOn:
        expiresAt === null
          ? null
          : new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "long",
              timeStyle: "short",
              timeZone: "Europe/Paris",
            }).format(expiresAt),
      appealUrl: learnerUrl("/banned"),
      siteUrl: learnerSiteUrl(),
    });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "ban notice e-mail failed");
    emailFailed = true;
  }

  revalidatePath(`/users/${target.id}`);
  return { ok: true, emailFailed };
}

/** Lets somebody back in. The ban stays on the record, marked as lifted. */
export async function liftBanAction(
  _prev: BanUserState,
  formData: FormData,
): Promise<BanUserState> {
  const admin = await requireAdminAction();
  const parsed = z
    .object({
      userId: z.guid(),
      reason: z.string().trim().max(500).optional().or(z.literal("")),
    })
    .safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Formulaire invalide." };

  const reason = parsed.data.reason;
  const lifted = await banRepository.lift({
    userId: parsed.data.userId,
    liftedById: admin.id,
    // exactOptionalPropertyTypes: an absent key and a key holding undefined are
    // different things here, so the key is left out rather than set to nothing.
    ...(reason !== undefined && reason !== "" ? { reason } : {}),
  });
  if (!lifted) return { error: "Ce compte n'est pas banni." };

  await auditLogRepository.record({
    actorId: admin.id,
    action: AUDIT_ACTION.user.banLifted,
    targetType: "User",
    targetId: parsed.data.userId,
    metadata: { reason: reason === undefined || reason === "" ? null : reason },
  });

  revalidatePath(`/users/${parsed.data.userId}`);
  return { ok: true };
}

// ─── Resetting progress ─────────────────────────────────────────────────────

const resetProgressSchema = z.object({
  userId: z.guid(),
  /**
   * The account's own handle, typed back.
   *
   * The same reasoning as the deletion form: what separates resetting the right
   * account from the one above it in a sorted list is having looked at which
   * row you are on. Deliberately the handle and not the address, so a value
   * pasted into the wrong form on this page arms neither.
   */
  confirmHandle: z.string().trim(),
});

export interface ResetProgressState {
  error?: string;
  ok?: boolean;
  /** Filled on success, so the console can say what it cleared. */
  summary?: {
    xpCleared: number;
    levelBefore: number;
    lessonsCleared: number;
    pathsCleared: number;
    badgesCleared: number;
    certificatesCleared: number;
  };
  /** True when the rows went but their PDFs did not. */
  certificateFilesKept?: boolean;
}

export async function resetProgressAction(
  _prev: ResetProgressState,
  formData: FormData,
): Promise<ResetProgressState> {
  const admin = await requireAdminAction();
  const parsed = resetProgressSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Paramètres invalides." };

  const target = await userRepository.findConsoleTarget(parsed.data.userId);
  if (!target) return { error: "Ce compte n'existe plus." };

  // Accounts that have not finished onboarding have no handle yet; the address
  // is what identifies them, and it is what the form shows in that case.
  const expected = target.username ?? target.email;
  if (expected.toLowerCase() !== parsed.data.confirmHandle.toLowerCase()) {
    return { error: "La saisie ne correspond pas à ce compte." };
  }

  let summary;
  try {
    summary = await resetProgress(target.id, { actorId: admin.id });
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "resetProgressAction failed");
    return { error: "La remise à zéro a échoué. Rien n'a été effacé." };
  }

  revalidatePath(`/users/${target.id}`);
  revalidatePath("/users");
  return {
    ok: true,
    summary: {
      xpCleared: summary.xpCleared,
      levelBefore: summary.levelBefore,
      lessonsCleared: summary.lessonsCleared,
      pathsCleared: summary.pathsCleared,
      badgesCleared: summary.badgesCleared,
      certificatesCleared: summary.certificatesCleared,
    },
    certificateFilesKept: !summary.certificateFilesRemoved,
  };
}
