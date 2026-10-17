/**
 * What a public profile reads beyond who may open it: the exact counts
 * (findPublicProfile), how it opens (profileAccess, which also decides the
 * noindex), the link preview's card, and profileRepository's badges, paths
 * and contributions. Prisma is mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileRepository } from "../repositories/profile.repository.js";
import { PROFILE_BADGES, userRepository } from "../repositories/user.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    friendship: { findUnique: vi.fn() },
    lesson: { groupBy: vi.fn() },
    userBadge: { findMany: vi.fn(), groupBy: vi.fn() },
    userPathProgress: { findMany: vi.fn() },
    pathLesson: { groupBy: vi.fn() },
    forumPost: { count: vi.fn() },
    forumTopic: { count: vi.fn() },
    lessonAnswer: { count: vi.fn() },
    challengeWriteup: { count: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const OWNER = "11111111-1111-4111-8111-111111111111";
const READER = "22222222-2222-4222-8222-222222222222";

function ownerRow(publicProfile: boolean | null): Record<string, unknown> {
  return {
    id: OWNER,
    username: "alex",
    displayName: "Alex",
    xpTotal: 1200,
    streakDays: 3,
    preferences: publicProfile === null ? null : { publicProfile },
    badges: [],
    lessonProgress: [],
    pathProgress: [],
    certificates: [],
    challengeProgress: [],
    _count: {
      badges: 17,
      lessonProgress: 48,
      challengeProgress: 35,
      certificates: 2,
      pathProgress: 3,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.friendship.findUnique.mockResolvedValue(null);
  mockPrisma.lesson.groupBy.mockResolvedValue([]);
});

describe("findPublicProfile's counts", () => {
  it("counts what the lists only sample, and bounds the badges it lists", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(ownerRow(true));

    const profile = await userRepository.findPublicProfile("alex", null);

    expect(profile?.counts).toEqual({
      badges: 17,
      lessons: 48,
      challenges: 35,
      certificates: 2,
      paths: 3,
    });
    expect(profile).not.toHaveProperty("_count");
    const query = mockPrisma.user.findUnique.mock.calls[0]?.[0] as {
      include: Record<string, unknown>;
    };
    expect(query.include["badges"]).toMatchObject({ take: PROFILE_BADGES });
    expect(query.include["_count"]).toEqual({
      select: {
        badges: true,
        lessonProgress: { where: { status: "COMPLETED" } },
        challengeProgress: { where: { status: "COMPLETED" } },
        certificates: { where: { revokedAt: null } },
        pathProgress: { where: { status: "COMPLETED" } },
      },
    });
  });
});

describe("profileAccess", () => {
  it("tells a public profile from a private one the reader was let into", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: OWNER,
      preferences: { publicProfile: true },
    });
    expect(await userRepository.profileAccess("alex", null)).toBe("public");

    mockPrisma.user.findUnique.mockResolvedValue({ id: OWNER, preferences: null });
    expect(await userRepository.profileAccess("alex", null)).toBe("public");

    mockPrisma.user.findUnique.mockResolvedValue({
      id: OWNER,
      preferences: { publicProfile: false },
    });
    expect(await userRepository.profileAccess("alex", OWNER)).toBe("private");

    mockPrisma.friendship.findUnique.mockResolvedValue({ status: "ACCEPTED" });
    expect(await userRepository.profileAccess("alex", READER)).toBe("private");
  });

  it("closes a missing profile and a private one to a stranger alike", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await userRepository.profileAccess("nobody", READER)).toBe("closed");

    mockPrisma.user.findUnique.mockResolvedValue({
      id: OWNER,
      preferences: { publicProfile: false },
    });
    expect(await userRepository.profileAccess("alex", null)).toBe("closed");
    mockPrisma.friendship.findUnique.mockResolvedValue({ status: "PENDING" });
    expect(await userRepository.profileAccess("alex", READER)).toBe("closed");
    expect(await userRepository.isProfileOpenTo("alex", READER)).toBe(false);
  });
});

describe("findPreviewCard", () => {
  it("names a public profile, and nobody behind a private one", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      username: "alex",
      displayName: "Alex",
      xpTotal: 1200,
      streakDays: 3,
      preferences: { publicProfile: true },
      _count: { badges: 17 },
    });
    expect(await userRepository.findPreviewCard("alex")).toEqual({
      username: "alex",
      displayName: "Alex",
      xpTotal: 1200,
      streakDays: 3,
      badges: 17,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      username: "alex",
      displayName: "Alex",
      xpTotal: 1200,
      streakDays: 3,
      preferences: { publicProfile: false },
      _count: { badges: 17 },
    });
    expect(await userRepository.findPreviewCard("alex")).toBeNull();

    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await userRepository.findPreviewCard("nobody")).toBeNull();
  });
});

describe("profileRepository", () => {
  it("weighs the badges of the highest rarity, each with its number of holders", async () => {
    const earnedAt = new Date("2026-05-01T00:00:00Z");
    mockPrisma.userBadge.findMany.mockResolvedValue([
      {
        id: "ub-1",
        badgeId: "b-legend",
        earnedAt,
        badge: { name: "Légende", rarity: "LEGENDARY", iconUrl: "/l.svg" },
      },
      {
        id: "ub-2",
        badgeId: "b-rare",
        earnedAt,
        badge: { name: "Rare", rarity: "RARE", iconUrl: null },
      },
    ]);
    mockPrisma.userBadge.groupBy.mockResolvedValue([
      { badgeId: "b-legend", _count: { _all: 4 } },
      { badgeId: "b-rare", _count: { _all: 31 } },
    ]);

    expect(await profileRepository.badgeCandidates(OWNER)).toEqual([
      { id: "ub-1", name: "Légende", rarity: "LEGENDARY", iconUrl: "/l.svg", earnedAt, holders: 4 },
      { id: "ub-2", name: "Rare", rarity: "RARE", iconUrl: null, earnedAt, holders: 31 },
    ]);
    expect(mockPrisma.userBadge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: OWNER },
        orderBy: [{ badge: { rarity: "desc" } }, { earnedAt: "desc" }],
      }),
    );
    expect(mockPrisma.userBadge.groupBy).toHaveBeenCalledWith({
      by: ["badgeId"],
      where: { badgeId: { in: ["b-legend", "b-rare"] } },
      _count: { _all: true },
    });
  });

  it("asks nothing more for somebody without a badge", async () => {
    mockPrisma.userBadge.findMany.mockResolvedValue([]);
    expect(await profileRepository.badgeCandidates(OWNER)).toEqual([]);
    expect(mockPrisma.userBadge.groupBy).not.toHaveBeenCalled();
  });

  it("reads the catalogue paths with their missions done and in all", async () => {
    const completedAt = new Date("2026-06-01T00:00:00Z");
    mockPrisma.userPathProgress.findMany.mockResolvedValue([
      {
        status: "IN_PROGRESS",
        completedAt: null,
        path: {
          id: "p-1",
          slug: "linux",
          title: "Linux",
          category: "DEV",
          _count: { lessons: 12 },
        },
      },
      {
        status: "COMPLETED",
        completedAt,
        path: {
          id: "p-2",
          slug: "reseau",
          title: "Réseau",
          category: "NETWORK",
          _count: { lessons: 8 },
        },
      },
    ]);
    mockPrisma.pathLesson.groupBy.mockResolvedValue([{ pathId: "p-1", _count: { _all: 5 } }]);

    expect(await profileRepository.pathsOf(OWNER)).toEqual([
      {
        slug: "linux",
        title: "Linux",
        category: "DEV",
        completed: false,
        done: 5,
        total: 12,
        completedAt: null,
      },
      {
        slug: "reseau",
        title: "Réseau",
        category: "NETWORK",
        completed: true,
        done: 0,
        total: 8,
        completedAt,
      },
    ]);
    // A class's path is the class's: never on a profile.
    expect(mockPrisma.userPathProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: OWNER,
          status: { in: ["IN_PROGRESS", "COMPLETED"] },
          path: { audience: "CATALOGUE" },
        },
      }),
    );
    expect(mockPrisma.pathLesson.groupBy).toHaveBeenCalledWith({
      by: ["pathId"],
      where: {
        pathId: { in: ["p-1", "p-2"] },
        lesson: { status: "PUBLISHED", progress: { some: { userId: OWNER, status: "COMPLETED" } } },
      },
      _count: { _all: true },
    });
  });

  it("counts only the contributions still shown", async () => {
    mockPrisma.forumPost.count.mockResolvedValue(12);
    mockPrisma.forumTopic.count.mockResolvedValue(2);
    mockPrisma.lessonAnswer.count.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    mockPrisma.challengeWriteup.count.mockResolvedValue(3);

    expect(await profileRepository.contributionsOf(OWNER)).toEqual({
      posts: 12,
      topics: 2,
      answers: 5,
      acceptedAnswers: 1,
      writeups: 3,
    });
    expect(mockPrisma.forumPost.count).toHaveBeenCalledWith({
      where: { authorId: OWNER, isHidden: false, topic: { isHidden: false } },
    });
    expect(mockPrisma.lessonAnswer.count).toHaveBeenLastCalledWith({
      where: { userId: OWNER, isHidden: false, isAccepted: true, question: { isHidden: false } },
    });
    expect(mockPrisma.challengeWriteup.count).toHaveBeenCalledWith({
      where: { userId: OWNER, isHidden: false },
    });
  });
});
