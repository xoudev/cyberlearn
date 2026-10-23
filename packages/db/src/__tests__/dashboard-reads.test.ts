/**
 * What the dashboard reads, statement by statement. Prisma is mocked: what this
 * checks is what each one asks for, above all the two rules that keep a class's
 * private work out of the learner's figures (the catalogue for certificates,
 * the visible paths for the ranking) and that a lesson that is not published is
 * never a mission.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardRepository } from "../repositories/dashboard.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findUnique: vi.fn() },
    userLessonProgress: { findMany: vi.fn(), count: vi.fn() },
    userBadge: { findMany: vi.fn(), count: vi.fn() },
    certificate: { count: vi.fn() },
    path: { count: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const MONTH_START = new Date("2026-10-01T00:00:00+02:00");

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.userLessonProgress.findMany.mockResolvedValue([]);
  mockPrisma.userLessonProgress.count.mockResolvedValue(0);
  mockPrisma.userBadge.findMany.mockResolvedValue([]);
  mockPrisma.userBadge.count.mockResolvedValue(0);
});

describe("the header", () => {
  it("reads the name, the XP, the streak and its record", async () => {
    await dashboardRepository.findHeader("user-1");
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { displayName: true, xpTotal: true, streakDays: true, longestStreak: true },
    });
  });
});

describe("the lesson left open", () => {
  const lesson = {
    id: "l1",
    slug: "bases",
    title: "Les bases",
    description: "",
    category: "DEV",
    estimatedMinutes: 8,
    xpReward: 20,
  };

  it("is the one touched last among those under way, or null", async () => {
    mockPrisma.userLessonProgress.findMany.mockResolvedValueOnce([{ lesson }]);
    expect(await dashboardRepository.findLessonInProgress("user-1")).toEqual(lesson);

    // The mock is untyped; its one argument is the findMany's options.
    const [args] = mockPrisma.userLessonProgress.findMany.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(args["where"]).toEqual({ userId: "user-1", status: "IN_PROGRESS" });
    expect(args["orderBy"]).toEqual({ lastAccessedAt: "desc" });
    expect(args["take"]).toBe(1);

    mockPrisma.userLessonProgress.findMany.mockResolvedValueOnce([]);
    expect(await dashboardRepository.findLessonInProgress("user-1")).toBeNull();
  });
});

describe("the counts", () => {
  it("counts the lessons finished, in all and since the first of the month", async () => {
    mockPrisma.userLessonProgress.count.mockResolvedValueOnce(12).mockResolvedValueOnce(3);
    expect(await dashboardRepository.countCompletedLessons("user-1", MONTH_START)).toEqual({
      total: 12,
      thisMonth: 3,
    });
    expect(mockPrisma.userLessonProgress.count).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "COMPLETED" },
    });
    expect(mockPrisma.userLessonProgress.count).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "COMPLETED", completedAt: { gte: MONTH_START } },
    });
  });

  it("reads the last three badges, how many in all and how many this month", async () => {
    mockPrisma.userBadge.findMany.mockResolvedValue([{ badge: { name: "Premier pas" } }]);
    mockPrisma.userBadge.count.mockResolvedValueOnce(9).mockResolvedValueOnce(2);

    expect(await dashboardRepository.badgeSummary("user-1", MONTH_START)).toEqual({
      recent: [{ badge: { name: "Premier pas" } }],
      total: 9,
      thisMonth: 2,
    });
    expect(mockPrisma.userBadge.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      include: { badge: { select: { name: true, rarity: true, iconUrl: true } } },
      orderBy: { earnedAt: "desc" },
      take: 3,
    });
    expect(mockPrisma.userBadge.count).toHaveBeenCalledWith({
      where: { userId: "user-1", earnedAt: { gte: MONTH_START } },
    });
  });

  it("counts the certificates held, not the revoked ones", async () => {
    mockPrisma.certificate.count.mockResolvedValue(2);
    expect(await dashboardRepository.countCertificates("user-1")).toBe(2);
    expect(mockPrisma.certificate.count).toHaveBeenCalledWith({
      where: { userId: "user-1", revokedAt: null },
    });
  });

  it("counts the paths that can issue one: the catalogue's, never a class's", async () => {
    mockPrisma.path.count.mockResolvedValue(16);
    expect(await dashboardRepository.countCertifiablePaths()).toBe(16);
    expect(mockPrisma.path.count).toHaveBeenCalledWith({
      where: { status: "PUBLISHED", audience: "CATALOGUE" },
    });
  });

  it("lists the categories of the lessons finished last, newest first", async () => {
    mockPrisma.userLessonProgress.findMany.mockResolvedValue([
      { lesson: { category: "DEV" } },
      { lesson: { category: "NETWORK" } },
    ]);
    expect(await dashboardRepository.recentCompletedCategories("user-1")).toEqual([
      "DEV",
      "NETWORK",
    ]);
    expect(mockPrisma.userLessonProgress.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "COMPLETED" },
      select: { lesson: { select: { category: true } } },
      orderBy: { completedAt: "desc" },
      take: 20,
    });
  });
});

describe("the paths", () => {
  it("ranks the paths the learner may open, with their own state on each", async () => {
    mockPrisma.path.findMany.mockResolvedValue([]);
    await dashboardRepository.listPathsToRank("user-1");

    // The mock is untyped; its one argument is the findMany's options.
    const [args] = mockPrisma.path.findMany.mock.calls[0] as [Record<string, unknown>];
    // The catalogue, plus the classes this learner is in or teaches: not the
    // site-wide "published", which would show one class's work to everybody.
    expect(JSON.stringify(args["where"])).toContain("user-1");
    expect(args["where"]).not.toEqual({ status: "PUBLISHED" });
    expect(args["select"]).toMatchObject({
      progress: { where: { userId: "user-1" }, select: { status: true }, take: 1 },
      _count: {
        select: {
          lessons: { where: { lesson: { status: "PUBLISHED" } } },
          progress: { where: { status: "COMPLETED" } },
        },
      },
    });
  });

  it("reads the lead path's published lessons only, in order, with its modules", async () => {
    mockPrisma.path.findUnique.mockResolvedValue({ modules: [], lessons: [] });
    await dashboardRepository.findLeadPath("path-1");

    // The mock is untyped; its one argument is the findUnique's options.
    const [args] = mockPrisma.path.findUnique.mock.calls[0] as [
      { where: unknown; select: { modules: unknown; lessons: Record<string, unknown> } },
    ];
    expect(args.where).toEqual({ id: "path-1" });
    expect(args.select.modules).toEqual({
      orderBy: { position: "asc" },
      select: { id: true, position: true, title: true },
    });
    expect(args.select.lessons["where"]).toEqual({ lesson: { status: "PUBLISHED" } });
    expect(args.select.lessons["orderBy"]).toEqual({ position: "asc" });
  });

  it("tells which of a path's lessons were finished, and asks nothing for none", async () => {
    mockPrisma.userLessonProgress.findMany.mockResolvedValue([
      { lessonId: "l1" },
      { lessonId: "l3" },
    ]);
    expect(await dashboardRepository.completedLessonIds("user-1", ["l1", "l2", "l3"])).toEqual([
      "l1",
      "l3",
    ]);
    expect(mockPrisma.userLessonProgress.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "COMPLETED", lessonId: { in: ["l1", "l2", "l3"] } },
      select: { lessonId: true },
    });

    mockPrisma.userLessonProgress.findMany.mockClear();
    expect(await dashboardRepository.completedLessonIds("user-1", [])).toEqual([]);
    expect(mockPrisma.userLessonProgress.findMany).not.toHaveBeenCalled();
  });
});
