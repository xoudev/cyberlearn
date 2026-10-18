"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adjustXp, badgeRepository, streakRepository } from "@cyberlearn/db";
import { MAX_FREEZES } from "@cyberlearn/lib";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { requireAdminAction } from "@/lib/auth";
import {
  MAX_STREAK_DAYS,
  MAX_XP_ADJUSTMENT,
  REASON_MAX,
  REASON_MIN,
  badgeGrantOutcome,
  badgeRevokeOutcome,
  streakCorrectionOutcome,
  xpAdjustmentOutcome,
  type Outcome,
} from "@/lib/gamification-corrections";

/**
 * Corrections to what an account earned: XP added or taken back, a streak
 * set by hand, a badge granted or taken away. Support's answer to "my streak
 * vanished" or "this badge never came", short of resetting everything.
 *
 * Each one asks for a reason, kept in the audit row its repository writes in
 * the same transaction as the correction: a figure changed by hand with no
 * word of why is a figure nobody can check later.
 */

export interface GamificationActionState {
  ok?: boolean;
  error?: string;
  /** What was done, in a sentence, once it is done. */
  notice?: string;
}

const reason = z
  .string()
  .trim()
  .min(REASON_MIN, `Donne un motif : au moins ${String(REASON_MIN)} caractères.`)
  .max(REASON_MAX, `Le motif tient en ${String(REASON_MAX)} caractères au plus.`);

const target = z.object({ userId: z.guid("Compte invalide."), reason });

function answer(userId: string, outcome: Outcome): GamificationActionState {
  if (!outcome.ok) return { error: outcome.error };
  revalidatePath(`/users/${userId}`);
  return { ok: true, notice: outcome.notice };
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Paramètres invalides.";
}

// ─── XP ─────────────────────────────────────────────────────────────────────

const adjustSchema = target.extend({
  direction: z.enum(["add", "remove"], "Choisis d'ajouter ou de retirer de l'XP."),
  amount: z.coerce
    .number("Indique un nombre d'XP.")
    .int("Un nombre entier d'XP.")
    .min(1, "Au moins 1 XP.")
    .max(
      MAX_XP_ADJUSTMENT,
      `Au plus ${MAX_XP_ADJUSTMENT.toLocaleString("fr-FR")} XP par correction.`,
    ),
});

/**
 * Adds XP to the account, or takes some back, as a line of the XP ledger
 * (source ADJUSTMENT). Taking back stops at zero, and the notice says when it
 * did. Nobody is notified.
 */
export async function adjustXpAction(
  _prev: GamificationActionState,
  formData: FormData,
): Promise<GamificationActionState> {
  const admin = await requireAdminAction();
  const parsed = adjustSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { userId, direction, amount } = parsed.data;

  try {
    const result = await adjustXp({
      userId,
      delta: direction === "remove" ? -amount : amount,
      reason: parsed.data.reason,
      actorId: admin.id,
    });
    return answer(userId, xpAdjustmentOutcome(result));
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "adjustXpAction failed");
    return { error: "La correction a échoué. Rien n'a été modifié." };
  }
}

// ─── Streak ─────────────────────────────────────────────────────────────────

const streakSchema = target.extend({
  streakDays: z.coerce
    .number("Indique un nombre de jours.")
    .int("Un nombre entier de jours.")
    .min(0, "Une série ne descend pas sous 0.")
    .max(MAX_STREAK_DAYS, `Au plus ${String(MAX_STREAK_DAYS)} jours.`),
  longestStreak: z.coerce
    .number("Indique un record, en jours.")
    .int("Un nombre entier de jours pour le record.")
    .min(0, "Un record ne descend pas sous 0.")
    .max(MAX_STREAK_DAYS, `Un record de ${String(MAX_STREAK_DAYS)} jours au plus.`),
  streakFreezes: z.coerce
    .number("Indique un nombre de gels.")
    .int("Un nombre entier de gels.")
    .min(0, "Pas moins de 0 gel.")
    .max(MAX_FREEZES, `Au plus ${String(MAX_FREEZES)} gels en réserve.`),
});

/**
 * Sets the streak, its record and the freezes in reserve. The record follows
 * a streak set above it, and is lowered only by changing it, never under the
 * streak; a streak brought back after a gap counts today as active, so that
 * tonight's check does not break it again.
 */
export async function correctStreakAction(
  _prev: GamificationActionState,
  formData: FormData,
): Promise<GamificationActionState> {
  const admin = await requireAdminAction();
  const parsed = streakSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { userId, streakDays, longestStreak, streakFreezes } = parsed.data;

  try {
    const result = await streakRepository.correct(
      userId,
      { streakDays, longestStreak, streakFreezes },
      { actorId: admin.id, reason: parsed.data.reason },
    );
    return answer(userId, streakCorrectionOutcome(result));
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "correctStreakAction failed");
    return { error: "La correction a échoué. Rien n'a été modifié." };
  }
}

// ─── Badges ─────────────────────────────────────────────────────────────────

const badgeSchema = target.extend({ badgeId: z.guid("Choisis un badge.") });

/** Grants a badge: its XP is paid and the learner is notified, as for one earned. */
export async function grantBadgeAction(
  _prev: GamificationActionState,
  formData: FormData,
): Promise<GamificationActionState> {
  const admin = await requireAdminAction();
  const parsed = badgeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { userId, badgeId } = parsed.data;

  try {
    const result = await badgeRepository.grant(userId, badgeId, {
      actorId: admin.id,
      reason: parsed.data.reason,
    });
    return answer(userId, badgeGrantOutcome(result));
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "grantBadgeAction failed");
    return { error: "L'attribution a échoué. Rien n'a été modifié." };
  }
}

const revokeSchema = badgeSchema.extend({
  // A checkbox: "on" when ticked, absent otherwise.
  takeBackXp: z.literal("on").optional(),
});

/** Takes a badge away, and with it, when asked, the XP it paid. */
export async function revokeBadgeAction(
  _prev: GamificationActionState,
  formData: FormData,
): Promise<GamificationActionState> {
  const admin = await requireAdminAction();
  const parsed = revokeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { userId, badgeId } = parsed.data;
  const takeBackXp = parsed.data.takeBackXp === "on";

  try {
    const result = await badgeRepository.revoke(userId, badgeId, {
      actorId: admin.id,
      reason: parsed.data.reason,
      takeBackXp,
    });
    return answer(userId, badgeRevokeOutcome(result, takeBackXp));
  } catch (error) {
    logger.error({ scope: "admin", err: errorMessage(error) }, "revokeBadgeAction failed");
    return { error: "Le retrait a échoué. Rien n'a été modifié." };
  }
}
