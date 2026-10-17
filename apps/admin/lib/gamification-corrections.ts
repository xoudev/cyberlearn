import type {
  AdjustXpResult,
  BadgeGrantResult,
  BadgeRevokeResult,
  StreakCorrectionResult,
  XpSource,
} from "@cyberlearn/db";

/**
 * The bounds and the words of the corrections an account's page makes to its
 * XP, streak and badges. Out of the actions module, which may only export
 * async functions, so the forms and the tests read the same figures.
 */

/** The most one correction moves, either way: a slip of the keyboard stays a slip. */
export const MAX_XP_ADJUSTMENT = 100_000;
/** Ten years of days: past it, a figure is a typo. */
export const MAX_STREAK_DAYS = 3650;
export const REASON_MIN = 3;
export const REASON_MAX = 500;
/** Lines of the XP ledger the page lists. */
export const RECENT_LEDGER_ROWS = 20;

/** How the ledger's sources read in the console. */
export const XP_SOURCE_LABEL: Record<XpSource, string> = {
  LESSON: "Leçon",
  BADGE: "Badge",
  QUEST: "Quête",
  CHALLENGE: "Défi",
  REVIEW: "Révision",
  EXERCISE: "Exercice",
  ADJUSTMENT: "Correction",
};

/** The active badges an account does not hold yet: what can be granted to it. */
export function grantableBadges<B extends { id: string }>(
  active: readonly B[],
  held: readonly { badgeId: string }[],
): B[] {
  const heldIds = new Set(held.map((badge) => badge.badgeId));
  return active.filter((badge) => !heldIds.has(badge.id));
}

const number = new Intl.NumberFormat("fr-FR");

/** "+1 200 XP" or "−50 XP", with a real minus sign. */
export function signedXp(amount: number): string {
  const sign = amount < 0 ? "−" : "+";
  return `${sign}${number.format(Math.abs(amount))} XP`;
}

function plural(count: number, one: string, many: string): string {
  return `${number.format(count)} ${count > 1 ? many : one}`;
}

export type Outcome = { ok: true; notice: string } | { ok: false; error: string };

export function xpAdjustmentOutcome(result: AdjustXpResult): Outcome {
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "NO_USER"
          ? "Ce compte n'existe plus."
          : "Ce compte n'a pas d'XP à retirer : son total est déjà à zéro.",
    };
  }
  const { before, after, applied, requested } = result;
  const level =
    before.level === after.level
      ? `niveau ${String(after.level)} inchangé`
      : `niveau ${String(before.level)} → ${String(after.level)}`;
  const capped =
    applied !== requested
      ? ` Le total est à zéro : ${signedXp(applied)} seulement, sur ${signedXp(requested)} demandés.`
      : "";
  return {
    ok: true,
    notice: `${signedXp(applied)} : ${number.format(before.xpTotal)} → ${number.format(after.xpTotal)} XP, ${level}. Ligne « Correction » ajoutée au registre, motif inscrit au journal d'audit.${capped}`,
  };
}

export function streakCorrectionOutcome(result: StreakCorrectionResult): Outcome {
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "NO_USER"
          ? "Ce compte n'existe plus."
          : "Rien à corriger : la série a déjà ces valeurs.",
    };
  }
  const { before, after, movedToToday } = result;
  const parts = [`${String(before.streakDays)} → ${plural(after.streakDays, "jour", "jours")}`];
  if (before.longestStreak !== after.longestStreak) {
    parts.push(`record ${String(before.longestStreak)} → ${String(after.longestStreak)}`);
  }
  if (before.streakFreezes !== after.streakFreezes) {
    parts.push(`gels ${String(before.streakFreezes)} → ${String(after.streakFreezes)}`);
  }
  const alive = movedToToday
    ? " Aujourd'hui compte comme jour actif : la prochaine activité, aujourd'hui ou demain, la prolonge."
    : "";
  return { ok: true, notice: `Série corrigée : ${parts.join(", ")}.${alive}` };
}

export function badgeGrantOutcome(result: BadgeGrantResult): Outcome {
  if (!result.ok) {
    const error = {
      NO_BADGE: "Ce badge n'existe plus.",
      INACTIVE: "Ce badge est désactivé : réactive-le avant de l'attribuer.",
      ALREADY_EARNED: "Ce compte a déjà ce badge.",
    }[result.reason];
    return { ok: false, error };
  }
  const xp = result.xpCredited > 0 ? `, ${signedXp(result.xpCredited)}` : "";
  return {
    ok: true,
    notice: `Badge « ${result.badgeName} » attribué${xp}. La personne a reçu la notification d'un badge obtenu.`,
  };
}

export function badgeRevokeOutcome(result: BadgeRevokeResult, takeBackXp: boolean): Outcome {
  if (!result.ok) return { ok: false, error: "Ce compte n'a pas, ou plus, ce badge." };
  const xp =
    result.xpTakenBack > 0
      ? ` ${signedXp(-result.xpTakenBack)} : les XP qu'il avait rapportés sont repris.`
      : takeBackXp
        ? " Il n'avait rapporté aucun XP à reprendre."
        : " Les XP qu'il avait rapportés restent acquis.";
  return { ok: true, notice: `Badge « ${result.badgeName} » retiré.${xp}` };
}
