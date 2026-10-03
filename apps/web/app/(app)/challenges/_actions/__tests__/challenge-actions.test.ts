/**
 * submitFlagAction on a Linux machine: the learner's own flag passes, a flag
 * from someone else's machine does not, nothing is checked without the key,
 * and an answer past the last attempt is not looked at.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "s".repeat(64);
const CHALLENGE = "11111111-1111-4111-8111-111111111111";
const ALICE = "22222222-2222-4222-8222-222222222222";
const BOB = "33333333-3333-4333-8333-333333333333";

const { mockPrisma, mockRepo, mockEnv } = vi.hoisted(() => ({
  mockPrisma: {
    challenge: { findUnique: vi.fn() },
    userChallengeProgress: { update: vi.fn() },
    // awardChallengeXp reads the user first: without one it stops there.
    user: { findUnique: vi.fn() },
  },
  mockRepo: { getUserProgress: vi.fn(), startChallenge: vi.fn() },
  mockEnv: { CHALLENGE_FLAG_SECRET: undefined as string | undefined },
}));

vi.mock("@cyberlearn/db", () => ({ prisma: mockPrisma, challengeRepository: mockRepo }));
vi.mock("@/lib/env", () => ({ env: mockEnv }));
vi.mock("@/lib/auth", () => ({ requireRequestUser: () => Promise.resolve({ id: ALICE }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/quests/progress", () => ({ recordQuestProgress: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkHintReveal: vi.fn() }));
vi.mock("@/lib/xp/credit", () => ({ creditXp: vi.fn() }));

import { personalFlag } from "@/lib/challenges/flag";
import { submitFlagAction } from "../challenge-actions";

const MACHINE_CHALLENGE = {
  id: CHALLENGE,
  flag: null,
  machine: { files: { "a.txt": "{{FLAG}}" } },
  xpReward: 50,
  title: "Le serveur oublié",
  maxAttempts: 3,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv.CHALLENGE_FLAG_SECRET = SECRET;
  mockPrisma.challenge.findUnique.mockResolvedValue(MACHINE_CHALLENGE);
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockRepo.getUserProgress.mockResolvedValue(null);
});

describe("submitFlagAction on a machine", () => {
  it("accepts the learner's own flag", async () => {
    const flag = personalFlag(SECRET, CHALLENGE, ALICE);
    await expect(submitFlagAction(CHALLENGE, flag)).resolves.toEqual({ correct: true });
  });

  it("refuses the flag of someone else's machine, and counts the attempt", async () => {
    const result = await submitFlagAction(CHALLENGE, personalFlag(SECRET, CHALLENGE, BOB));
    expect(result.correct).toBe(false);
    expect(result.error).toContain("Flag incorrect");
    expect(mockRepo.startChallenge).toHaveBeenCalledWith(ALICE, CHALLENGE);
  });

  it("is unavailable without the key, rather than checking against anything", async () => {
    mockEnv.CHALLENGE_FLAG_SECRET = undefined;
    await expect(submitFlagAction(CHALLENGE, "CL{x}")).resolves.toEqual({
      correct: false,
      error: "Ce défi est indisponible pour le moment.",
    });
    expect(mockRepo.startChallenge).not.toHaveBeenCalled();
  });

  it("does not look at an answer past the last attempt, even the right one", async () => {
    mockRepo.getUserProgress.mockResolvedValue({ status: "IN_PROGRESS", attempts: 3 });
    const flag = personalFlag(SECRET, CHALLENGE, ALICE);
    await expect(submitFlagAction(CHALLENGE, flag)).resolves.toEqual({
      correct: false,
      error: "Plus de tentatives disponibles.",
    });
  });
});

describe("submitFlagAction without a machine", () => {
  it("still takes the flag the author wrote", async () => {
    mockPrisma.challenge.findUnique.mockResolvedValue({
      ...MACHINE_CHALLENGE,
      machine: null,
      flag: "CTF{le_flag}",
    });
    await expect(submitFlagAction(CHALLENGE, "ctf{LE_FLAG}")).resolves.toEqual({ correct: true });
  });
});
