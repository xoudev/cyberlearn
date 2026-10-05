import { colors } from "@cyberlearn/tokens";
import { CATEGORY_META, DIFFICULTY_META } from "@cyberlearn/lib/content/vocabulary";

/**
 * The site's challenges in the app: the same list, the same states, read from
 * /api/mobile/challenges (apps/web/lib/challenges/catalogue.ts shapes them).
 * A challenge played on a Linux machine is played on the site; the app shows
 * its statement, its hints, and takes its flag.
 */

export type ChallengeStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
export type ChallengeType = "CTF" | "PUZZLE" | "LAB" | "SCRIPT";

export interface ChallengeItem {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: "CYBERSEC" | "DEV" | "NETWORK";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  type: ChallengeType;
  xpReward: number;
  timeLimitMin: number;
  maxAttempts: number;
  userAttempts: number;
  displayStatus: ChallengeStatus;
  lockedByTitle: string | null;
}

export interface ChallengeHint {
  id: string;
  orderIndex: number;
  xpCost: number;
  /** Null until the learner has revealed it. */
  content: string | null;
}

export interface ChallengeDetail {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  description: string;
  /** Markdown. */
  instructions: string;
  category: ChallengeItem["category"];
  difficulty: ChallengeItem["difficulty"];
  type: ChallengeType;
  xpReward: number;
  maxAttempts: number;
  userAttempts: number;
  displayStatus: ChallengeStatus;
  prerequisiteTitle: string | null;
  onMachine: boolean;
  hints: ChallengeHint[];
}

/** The site's words for each state. */
export const STATUS_META: Record<ChallengeStatus, { label: string; color: string }> = {
  COMPLETED: { label: "Résolu", color: colors.success },
  IN_PROGRESS: { label: "En cours", color: colors.warning },
  AVAILABLE: { label: "Disponible", color: colors.info },
  LOCKED: { label: "Verrouillé", color: colors.textMuted },
};

// The words are the site's (packages/lib, content/vocabulary).
export const DIFFICULTY_LABEL: Record<ChallengeItem["difficulty"], string> = {
  BEGINNER: DIFFICULTY_META.BEGINNER.label,
  INTERMEDIATE: DIFFICULTY_META.INTERMEDIATE.label,
  ADVANCED: DIFFICULTY_META.ADVANCED.label,
  EXPERT: DIFFICULTY_META.EXPERT.label,
};

export const CATEGORY_LABEL: Record<ChallengeItem["category"], string> = {
  CYBERSEC: CATEGORY_META.CYBERSEC.label,
  DEV: CATEGORY_META.DEV.label,
  NETWORK: CATEGORY_META.NETWORK.label,
};

/** Whether the app takes an answer for this challenge as a flag. */
export function takesFlag(type: ChallengeType): boolean {
  return type === "CTF" || type === "SCRIPT";
}

/** The attempts left, never below zero. */
export function attemptsLeft(challenge: { maxAttempts: number; userAttempts: number }): number {
  return Math.max(0, challenge.maxAttempts - challenge.userAttempts);
}
