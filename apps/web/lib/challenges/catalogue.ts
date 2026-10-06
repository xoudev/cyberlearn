import { challengeRepository, type ChallengeWithProgress } from "@cyberlearn/db";
import { parseChallengeMachine } from "@cyberlearn/types";
import {
  WEEKLY_XP_MULTIPLIER,
  weekEnd,
  weeklyChallengeId,
} from "@cyberlearn/lib/challenges/weekly";
import { attachmentEvidence, machineEvidence, type ChallengeEvidence } from "./evidence";

/**
 * The challenges as a learner sees them, for the site's pages and the app's
 * routes alike: the same list, the same states, the same lock.
 */

export type DisplayStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";

export interface ChallengeItem {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: "CYBERSEC" | "DEV" | "NETWORK";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  type: "CTF" | "PUZZLE" | "LAB" | "SCRIPT";
  xpReward: number;
  timeLimitMin: number;
  maxAttempts: number;
  userAttempts: number;
  displayStatus: DisplayStatus;
  lockedByTitle: string | null;
  /** Where the prerequisite is, to go and do it first. */
  prerequisiteSlug: string | null;
  hintCount: number;
  /** The XP the solve was worth, the week's bonus included; null before it. */
  xpEarned: number | null;
  /** What the challenge hands over, in a few words: "La machine « web01 »". */
  supplied: string;
  /** A glimpse of it (lib/challenges/evidence.ts); none while the challenge is locked. */
  evidence: ChallengeEvidence | null;
}

export type { ChallengeEvidence };

/** The challenge of the week, the same for everybody (@cyberlearn/lib/challenges/weekly). */
export interface WeeklyChallenge {
  id: string;
  /** When the week ends and the bonus with it, ISO 8601. */
  endsAt: string;
  multiplier: number;
  /** Next week's, from Monday: the next in catalogue order. */
  nextId: string | null;
}

export interface ChallengeCatalogue {
  items: ChallengeItem[];
  weekly: WeeklyChallenge | null;
}

/** What a challenge hands over, in a few words. */
function suppliedOf(c: ChallengeWithProgress): string {
  if (c.machine !== null) {
    const machine = parseChallengeMachine(c.machine);
    if (machine.ok && machine.machine.title !== undefined) {
      return `La machine « ${machine.machine.title} »`;
    }
    return "Une machine Linux, dans ton navigateur";
  }
  if (c.attachmentUrl !== null) return "Un fichier à télécharger";
  if (c.resourceUrl !== null) return "Une cible en ligne";
  if (c.type === "SCRIPT") return "Un interpréteur Python, dans ton navigateur";
  return "L'énoncé";
}

function evidenceOf(c: ChallengeWithProgress): ChallengeEvidence | null {
  if (c.machine !== null) return machineEvidence(c.machine);
  if (c.attachmentUrl !== null) return attachmentEvidence(c.attachmentUrl);
  return null;
}

/**
 * Every active challenge with where the learner stands: done, started, open,
 * or locked until its prerequisite is done.
 */
export async function challengeItemsFor(userId: string): Promise<ChallengeItem[]> {
  const raw = await challengeRepository.findAllActive(userId);
  const titleById = new Map(raw.map((c) => [c.id, c.title]));
  const completedIds = new Set(raw.filter((c) => c.userStatus === "COMPLETED").map((c) => c.id));

  return raw.map((c) => {
    let displayStatus: DisplayStatus;
    if (c.userStatus === "COMPLETED") displayStatus = "COMPLETED";
    else if (c.userStatus === "IN_PROGRESS") displayStatus = "IN_PROGRESS";
    else if (c.prerequisiteId !== null && !completedIds.has(c.prerequisiteId)) {
      displayStatus = "LOCKED";
    } else displayStatus = "AVAILABLE";

    return {
      id: c.id,
      refCode: c.refCode,
      slug: c.slug,
      title: c.title,
      description: c.description,
      category: c.category,
      difficulty: c.difficulty,
      type: c.type,
      xpReward: c.xpReward,
      timeLimitMin: c.timeLimitMin,
      maxAttempts: c.maxAttempts,
      userAttempts: c.userAttempts,
      displayStatus,
      lockedByTitle: c.prerequisiteId !== null ? (titleById.get(c.prerequisiteId) ?? null) : null,
      prerequisiteSlug: c.prerequisiteSlug,
      hintCount: c.hintCount,
      xpEarned: c.userXpEarned,
      supplied: suppliedOf(c),
      evidence: displayStatus === "LOCKED" ? null : evidenceOf(c),
    };
  });
}

/**
 * The challenges as /challenges shows them, and the week's challenge among
 * them: its turn comes in catalogue order, the order the list is read in, so
 * it is the one the XP credit doubles (lib/challenges/play.ts).
 */
export async function challengeCatalogueFor(
  userId: string,
  now: Date = new Date(),
): Promise<ChallengeCatalogue> {
  const items = await challengeItemsFor(userId);
  const ids = items.map((item) => item.id);
  const id = weeklyChallengeId(ids, now);
  const endsAt = weekEnd(now);
  return {
    items,
    weekly:
      id === null
        ? null
        : {
            id,
            endsAt: endsAt.toISOString(),
            multiplier: WEEKLY_XP_MULTIPLIER,
            nextId: weeklyChallengeId(ids, endsAt),
          },
  };
}

/** Where a learner stands on one challenge, its prerequisite included. */
export async function displayStatusFor(
  userId: string,
  challenge: { id: string; prerequisiteId: string | null },
): Promise<{ status: DisplayStatus; attempts: number; xpEarned: number | null }> {
  const progress = await challengeRepository.getUserProgress(userId, challenge.id);
  const attempts = progress?.attempts ?? 0;
  const xpEarned = progress?.xpEarned ?? null;
  if (progress?.status === "COMPLETED") return { status: "COMPLETED", attempts, xpEarned };
  if (progress?.status === "IN_PROGRESS") return { status: "IN_PROGRESS", attempts, xpEarned };
  if (challenge.prerequisiteId !== null) {
    const prerequisite = await challengeRepository.getUserProgress(
      userId,
      challenge.prerequisiteId,
    );
    if (prerequisite?.status !== "COMPLETED") return { status: "LOCKED", attempts, xpEarned };
  }
  return { status: "AVAILABLE", attempts, xpEarned };
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
  type: ChallengeItem["type"];
  xpReward: number;
  maxAttempts: number;
  userAttempts: number;
  displayStatus: DisplayStatus;
  prerequisiteTitle: string | null;
  /** Where the prerequisite is, to go and do it first. */
  prerequisiteSlug: string | null;
  /** Played on the site's Linux machine: the app shows the statement and takes the flag. */
  onMachine: boolean;
  /** A hint's content only once the learner has revealed it. */
  hints: { id: string; orderIndex: number; xpCost: number; content: string | null }[];
  /** The XP the solve was worth, the week's bonus included; null before it. */
  xpEarned: number | null;
  /** Set while this is the challenge of the week. */
  weekly: WeeklyChallenge | null;
}

/** The week's challenge, when it is this one: until when, and at what bonus. */
export async function weeklyStateOf(
  challengeId: string,
  now: Date = new Date(),
): Promise<WeeklyChallenge | null> {
  const ids = await challengeRepository.findActiveIdsInOrder();
  if (weeklyChallengeId(ids, now) !== challengeId) return null;
  const endsAt = weekEnd(now);
  return {
    id: challengeId,
    endsAt: endsAt.toISOString(),
    multiplier: WEEKLY_XP_MULTIPLIER,
    nextId: weeklyChallengeId(ids, endsAt),
  };
}

/**
 * One active challenge for the app: what the site's page shows, less what only
 * the site can play (the machine's files, the Python runner). Never the flag.
 */
export async function challengeDetailFor(
  userId: string,
  slug: string,
): Promise<ChallengeDetail | null> {
  const challenge = await challengeRepository.findBySlug(slug);
  if (!challenge) return null;
  const [{ status, attempts, xpEarned }, revealed, weekly] = await Promise.all([
    displayStatusFor(userId, challenge),
    challenge.hints.length > 0
      ? challengeRepository.getRevealedHintsWithContent(userId, challenge.id)
      : Promise.resolve([]),
    weeklyStateOf(challenge.id),
  ]);
  const contentById = new Map(revealed.map((r) => [r.hintId, r.content]));

  return {
    id: challenge.id,
    refCode: challenge.refCode,
    slug: challenge.slug,
    title: challenge.title,
    description: challenge.description,
    instructions: challenge.instructions,
    category: challenge.category,
    difficulty: challenge.difficulty,
    type: challenge.type,
    xpReward: challenge.xpReward,
    maxAttempts: challenge.maxAttempts,
    userAttempts: attempts,
    displayStatus: status,
    prerequisiteTitle: challenge.prerequisite?.title ?? null,
    prerequisiteSlug: challenge.prerequisite?.slug ?? null,
    onMachine: challenge.machine !== null,
    hints: challenge.hints.map((h) => ({
      id: h.id,
      orderIndex: h.orderIndex,
      xpCost: h.xpCost,
      content: contentById.get(h.id) ?? null,
    })),
    xpEarned,
    weekly,
  };
}
