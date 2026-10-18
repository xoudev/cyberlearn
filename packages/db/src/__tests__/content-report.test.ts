/**
 * The report queue's own reads and writes, Prisma mocked: the hourly limit
 * counts what the reporter did, not what the console did to their reports,
 * and the queue is paged by content in the database, each content carrying
 * whether the screen's queue still holds it.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { contentReportRepository } from "../repositories/content-report.repository.js";

const { mockPrisma, read } = vi.hoisted(() => ({
  mockPrisma: {
    contentReport: {
      upsert: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
  },
  read: vi.fn(),
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));
vi.mock("../repositories/content-moderation.repository.js", () => ({
  CONTENT_SURFACES: [
    "FORUM_POST",
    "LESSON_QUESTION",
    "LESSON_ANSWER",
    "CHALLENGE_WRITEUP",
    "CLASS_RESOURCE",
  ],
  contentModerationRepository: { read },
}));

const READER = "11111111-1111-4111-8111-111111111111";
const POST = "22222222-2222-4222-8222-222222222222";
const ANSWER = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  read.mockResolvedValue([]);
});

describe("the hourly limit", () => {
  it("counts the reports filed or filed again, on the reporter's own timestamp", async () => {
    mockPrisma.contentReport.count.mockResolvedValue(3);
    const since = new Date("2026-10-18T09:00:00Z");
    expect(await contentReportRepository.countSince(READER, since)).toBe(3);
    // Not updatedAt: the console closing twenty old reports moves that one.
    expect(mockPrisma.contentReport.count).toHaveBeenCalledWith({
      where: { reporterId: READER, reportedAt: { gte: since } },
    });
  });

  it("moves that timestamp when the same content is reported again", async () => {
    await contentReportRepository.report({
      reporterId: READER,
      surface: "FORUM_POST",
      contentId: POST,
      reason: "SPAM",
      comment: null,
    });
    const call = mockPrisma.contentReport.upsert.mock.calls[0] as
      | [{ update: { reportedAt?: unknown; status?: unknown } }]
      | undefined;
    expect(call?.[0].update.status).toBe("OPEN");
    expect(call?.[0].update.reportedAt).toBeInstanceOf(Date);
  });
});

describe("contentReportRepository.openByContent", () => {
  it("pages by content in the database, and reads only that page's reports", async () => {
    // Two contents with open reports, over every page.
    mockPrisma.contentReport.groupBy
      .mockResolvedValueOnce([
        { surface: "FORUM_POST", contentId: POST },
        { surface: "LESSON_ANSWER", contentId: ANSWER },
      ])
      .mockResolvedValueOnce([
        { surface: "LESSON_ANSWER", contentId: ANSWER },
        { surface: "FORUM_POST", contentId: POST },
      ]);
    mockPrisma.contentReport.count.mockResolvedValue(3);
    mockPrisma.contentReport.findMany.mockResolvedValue([
      {
        id: "r-1",
        surface: "FORUM_POST",
        contentId: POST,
        reason: "SPAM",
        comment: null,
        createdAt: new Date("2026-10-01T10:00:00Z"),
        reporter: { username: "ada" },
      },
      {
        id: "r-2",
        surface: "LESSON_ANSWER",
        contentId: ANSWER,
        reason: "HATE",
        comment: "Insultes.",
        createdAt: new Date("2026-10-02T10:00:00Z"),
        reporter: null,
      },
      {
        id: "r-3",
        surface: "LESSON_ANSWER",
        contentId: ANSWER,
        reason: "HATE",
        comment: null,
        createdAt: new Date("2026-10-03T10:00:00Z"),
        reporter: { username: "bob" },
      },
    ]);
    read.mockImplementation((surface: string, ids: string[]) =>
      Promise.resolve(
        surface === "LESSON_ANSWER" && ids.includes(ANSWER)
          ? [{ surface, id: ANSWER, isHidden: false, pendingReview: true }]
          : [],
      ),
    );

    const queue = await contentReportRepository.openByContent({ page: 1, pageSize: 20 });

    expect(mockPrisma.contentReport.groupBy).toHaveBeenLastCalledWith({
      by: ["surface", "contentId"],
      where: { status: "OPEN" },
      orderBy: [
        { _count: { id: "desc" } },
        { _min: { createdAt: "asc" } },
        { surface: "asc" },
        { contentId: "asc" },
      ],
      skip: 0,
      take: 20,
    });
    expect(mockPrisma.contentReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "OPEN",
          OR: [
            { surface: "LESSON_ANSWER", contentId: ANSWER },
            { surface: "FORUM_POST", contentId: POST },
          ],
        },
      }),
    );
    expect(queue).toMatchObject({ total: 2, page: 1, openReports: 3 });
    // The database's order: the most reported first.
    expect(queue.rows.map((g) => [g.contentId, g.reports.length])).toEqual([
      [ANSWER, 2],
      [POST, 1],
    ]);
    // The content is read with whether the screen still holds it; gone, it is null.
    expect(queue.rows[0]?.content).toMatchObject({ id: ANSWER, pendingReview: true });
    expect(queue.rows[1]?.content).toBeNull();
    expect(queue.rows[0]?.reports[0]).toMatchObject({ id: "r-2", reporterUsername: null });
  });

  it("reads nothing more when nothing is open", async () => {
    mockPrisma.contentReport.groupBy.mockResolvedValue([]);
    mockPrisma.contentReport.count.mockResolvedValue(0);
    expect(await contentReportRepository.openByContent({ page: 3, pageSize: 20 })).toEqual({
      rows: [],
      total: 0,
      page: 1,
      openReports: 0,
    });
    expect(mockPrisma.contentReport.findMany).not.toHaveBeenCalled();
  });
});
