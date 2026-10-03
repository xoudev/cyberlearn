import { challengeRepository } from "@cyberlearn/db";

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
    };
  });
}

/** Where a learner stands on one challenge, its prerequisite included. */
export async function displayStatusFor(
  userId: string,
  challenge: { id: string; prerequisiteId: string | null },
): Promise<{ status: DisplayStatus; attempts: number }> {
  const progress = await challengeRepository.getUserProgress(userId, challenge.id);
  const attempts = progress?.attempts ?? 0;
  if (progress?.status === "COMPLETED") return { status: "COMPLETED", attempts };
  if (progress?.status === "IN_PROGRESS") return { status: "IN_PROGRESS", attempts };
  if (challenge.prerequisiteId !== null) {
    const prerequisite = await challengeRepository.getUserProgress(
      userId,
      challenge.prerequisiteId,
    );
    if (prerequisite?.status !== "COMPLETED") return { status: "LOCKED", attempts };
  }
  return { status: "AVAILABLE", attempts };
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
  /** Played on the site's Linux machine: the app shows the statement and takes the flag. */
  onMachine: boolean;
  /** A hint's content only once the learner has revealed it. */
  hints: { id: string; orderIndex: number; xpCost: number; content: string | null }[];
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
  const [{ status, attempts }, revealed] = await Promise.all([
    displayStatusFor(userId, challenge),
    challenge.hints.length > 0
      ? challengeRepository.getRevealedHintsWithContent(userId, challenge.id)
      : Promise.resolve([]),
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
    onMachine: challenge.machine !== null,
    hints: challenge.hints.map((h) => ({
      id: h.id,
      orderIndex: h.orderIndex,
      xpCost: h.xpCost,
      content: contentById.get(h.id) ?? null,
    })),
  };
}
