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
  /** Where the prerequisite is, to go and do it first. */
  prerequisiteSlug?: string | null;
  hintCount?: number;
  /** The XP the solve was worth, the week's bonus included; null before it. */
  xpEarned?: number | null;
  /** What the challenge hands over: "La machine « web01 »". */
  supplied?: string;
  /** A glimpse of it; none while the challenge is locked. */
  evidence?: ChallengeEvidence | null;
}

/** What `ls` shows on a challenge's machine, and the first lines of its main file. */
export interface ChallengeEvidence {
  listing: { kind: "cmd" | "out"; text: string }[];
  excerpt: { file: string; lines: string[] } | null;
}

/** The challenge of the week, the same for everybody (@cyberlearn/lib/challenges/weekly). */
export interface WeeklyChallenge {
  id: string;
  /** ISO 8601: when the week ends, and the bonus with it. */
  endsAt: string;
  multiplier: number;
  nextId: string | null;
}

export interface ChallengeList {
  items: ChallengeItem[];
  weekly: WeeklyChallenge | null;
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
  prerequisiteSlug?: string | null;
  onMachine: boolean;
  /** Where to connect, as the site's « Connexion » shows it: "nc host 1337", or an address. */
  resourceUrl?: string | null;
  /** The file to download: an address of its own, or a path on the site. */
  attachmentUrl?: string | null;
  hints: ChallengeHint[];
  xpEarned?: number | null;
  /** Set while this is the challenge of the week. */
  weekly?: WeeklyChallenge | null;
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

/**
 * A challenge's file as a link the phone can open: an address of its own, or
 * a path on the site. Anything else (a `javascript:` link, a protocol-relative
 * one) is not opened.
 */
export function siteLink(url: string, siteUrl: string): string | null {
  if (/^https?:\/\//iu.test(url)) return url;
  if (url.startsWith("/") && !url.startsWith("//")) return `${siteUrl.replace(/\/+$/u, "")}${url}`;
  return null;
}

/** The attempts left, never below zero. */
export function attemptsLeft(challenge: { maxAttempts: number; userAttempts: number }): number {
  return Math.max(0, challenge.maxAttempts - challenge.userAttempts);
}

/** The list's tabs, as on the site: everything, what is left to do, what is done. */
export type ChallengeFilter = "all" | "todo" | "done";

export const FILTER_LABEL: Record<ChallengeFilter, string> = {
  all: "Tous",
  todo: "À faire",
  done: "Résolus",
};

export function matchesFilter(item: ChallengeItem, filter: ChallengeFilter): boolean {
  if (filter === "todo") {
    return item.displayStatus === "AVAILABLE" || item.displayStatus === "IN_PROGRESS";
  }
  if (filter === "done") return item.displayStatus === "COMPLETED";
  return true;
}

/**
 * The list split as the site shows it: the week's challenge on its own, the
 * others under the tabs, and next week's, named on the last tile.
 */
export function splitWeekly(list: ChallengeList): {
  weekly: ChallengeItem | null;
  next: ChallengeItem | null;
  others: ChallengeItem[];
} {
  const weeklyId = list.weekly?.id ?? null;
  const nextId = list.weekly?.nextId ?? null;
  const weekly = list.items.find((item) => item.id === weeklyId) ?? null;
  const next =
    nextId !== null && nextId !== weeklyId
      ? (list.items.find((item) => item.id === nextId) ?? null)
      : null;
  return { weekly, next, others: list.items.filter((item) => item.id !== weekly?.id) };
}

/** What a challenge is worth to this learner: what they earned, or the reward. */
export function xpLine(item: ChallengeItem, multiplier = 1): string {
  if (item.displayStatus === "COMPLETED") {
    return `${String(item.xpEarned ?? item.xpReward)} XP gagnés`;
  }
  return `${String(item.xpReward * multiplier)} XP`;
}

/** The header's tally: how many of each state, "en cours" left out when there are none. */
export function tallyOf(items: readonly ChallengeItem[]): { status: ChallengeStatus; n: number }[] {
  return (["COMPLETED", "IN_PROGRESS", "AVAILABLE", "LOCKED"] as const)
    .map((status) => ({ status, n: items.filter((i) => i.displayStatus === status).length }))
    .filter(({ status, n }) => n > 0 || status !== "IN_PROGRESS");
}

// ── Write-ups (the site's lib/challenges/writeups.ts) ───────────────────────

export interface WriteupView {
  id: string;
  content: string;
  /** Null for an erased account: the solution stays, without its author. */
  author: { name: string; username: string | null } | null;
  updatedAt: string;
}

/** The reader's own solution; `isHidden` while it waits for a moderator. */
export interface OwnWriteup {
  content: string;
  isHidden: boolean;
  updatedAt: string;
}

/** The count only until the challenge is solved, then the solutions. */
export type WriteupBoard =
  | { solved: false; count: number }
  | { solved: true; count: number; own: OwnWriteup | null; others: WriteupView[] };

export type WriteupReply = { ok: true; heldForReview?: true } | { ok: false; error: string };

/** "3 solutions publiées", as the site says it. */
export function solutionsLabel(count: number): string {
  return `${String(count)} solution${count > 1 ? "s" : ""} publiée${count > 1 ? "s" : ""}`;
}
