/**
 * The console's lists, read one page at a time: accounts, the audit log and
 * lessons, and the quick search of the top bar over accounts, lessons and
 * tickets. Prisma is mocked: what this checks is the query each filter turns
 * into (where, order, window) and how a page past the end falls back.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { auditLogRepository, auditWhere } from "../repositories/audit-log.repository.js";
import { lastPage, readSlice } from "../repositories/console-page.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { consoleTicketWhere, ticketRepository } from "../repositories/ticket.repository.js";
import { consoleUserWhere, userRepository } from "../repositories/user.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { count: vi.fn(), findMany: vi.fn() },
    auditLog: { count: vi.fn(), findMany: vi.fn() },
    lesson: { count: vi.fn(), findMany: vi.fn(), groupBy: vi.fn() },
    contactTicket: { findMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const ID = "2b3c4d5e-1111-4111-8111-111111111111";

/** The first argument of a mock's only call, as the repository passed it. */
function firstArg(fn: { mock: { calls: unknown[][] } }): Record<string, unknown> {
  const arg = fn.mock.calls[0]?.[0];
  if (typeof arg !== "object" || arg === null) throw new Error("not called with an object");
  return { ...arg };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.user.findMany.mockResolvedValue([]);
  mockPrisma.auditLog.findMany.mockResolvedValue([]);
  mockPrisma.lesson.findMany.mockResolvedValue([]);
  mockPrisma.contactTicket.findMany.mockResolvedValue([]);
});

describe("readSlice", () => {
  it("reads the window of the page asked for", async () => {
    const read = vi.fn().mockResolvedValue(["row"]);
    const slice = await readSlice({ page: 3, pageSize: 25 }, () => Promise.resolve(80), read);
    expect(read).toHaveBeenCalledWith({ skip: 50, take: 25 });
    expect(slice).toEqual({ rows: ["row"], total: 80, page: 3 });
  });

  it("falls back to the last page when asked for one past the end", async () => {
    const read = vi.fn().mockResolvedValue([]);
    const slice = await readSlice({ page: 9, pageSize: 25 }, () => Promise.resolve(30), read);
    expect(read).toHaveBeenCalledWith({ skip: 25, take: 25 });
    expect(slice.page).toBe(2);
  });

  it("does not read at all when nothing matches", async () => {
    const read = vi.fn();
    const slice = await readSlice({ page: 4, pageSize: 25 }, () => Promise.resolve(0), read);
    expect(read).not.toHaveBeenCalled();
    expect(slice).toEqual({ rows: [], total: 0, page: 1 });
  });

  it("counts an empty list as one page", () => {
    expect(lastPage(0, 25)).toBe(1);
    expect(lastPage(25, 25)).toBe(1);
    expect(lastPage(26, 25)).toBe(2);
  });
});

describe("userRepository.listForConsole", () => {
  it("searches the address, the handle and the display name, without the @", () => {
    expect(consoleUserWhere("  @amel ", undefined)).toEqual({
      AND: [
        {
          OR: [
            { email: { contains: "amel", mode: "insensitive" } },
            { username: { contains: "amel", mode: "insensitive" } },
            { displayName: { contains: "amel", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("filters by role alone when there is no search", () => {
    expect(consoleUserWhere("", "TEACHER")).toEqual({ AND: [{ role: "TEACHER" }] });
  });

  it("reads one page of 25 under the filter, with the count of every match", async () => {
    mockPrisma.user.count.mockResolvedValue(60);
    const slice = await userRepository.listForConsole({
      q: "amel",
      role: "STUDENT",
      sort: { key: "xp", dir: "desc" },
      page: 2,
      pageSize: 25,
    });
    const where = consoleUserWhere("amel", "STUDENT");
    expect(mockPrisma.user.count).toHaveBeenCalledWith({ where });
    expect(firstArg(mockPrisma.user.findMany)).toMatchObject({
      where,
      orderBy: [{ xpTotal: "desc" }, { id: "asc" }],
      skip: 25,
      take: 25,
    });
    expect(slice).toMatchObject({ total: 60, page: 2 });
  });

  it("puts administrators first when the role column sorts up", async () => {
    mockPrisma.user.count.mockResolvedValue(3);
    await userRepository.listForConsole({
      q: "",
      role: undefined,
      sort: { key: "role", dir: "asc" },
      page: 1,
      pageSize: 25,
    });
    // The enum is declared STUDENT, TEACHER, ADMIN.
    expect(firstArg(mockPrisma.user.findMany)).toMatchObject({
      orderBy: [{ role: "desc" }, { id: "asc" }],
    });
  });

  it("sorts handles with the accounts still in onboarding last", async () => {
    mockPrisma.user.count.mockResolvedValue(3);
    await userRepository.listForConsole({
      q: "",
      role: undefined,
      sort: { key: "user", dir: "asc" },
      page: 1,
      pageSize: 25,
    });
    expect(firstArg(mockPrisma.user.findMany)).toMatchObject({
      orderBy: [
        { username: { sort: "asc", nulls: "last" } },
        { displayName: "asc" },
        { id: "asc" },
      ],
    });
  });

  it("counts every account, the administrators and the week's active ones", async () => {
    mockPrisma.user.count
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(40);
    const now = new Date("2026-10-12T12:00:00Z");
    expect(await userRepository.consoleCounts(now)).toEqual({
      total: 120,
      admins: 2,
      activeWeek: 40,
    });
    expect(mockPrisma.user.count).toHaveBeenCalledWith({ where: { role: "ADMIN" } });
    expect(mockPrisma.user.count).toHaveBeenCalledWith({
      where: { lastActiveAt: { gte: new Date("2026-10-05T12:00:00Z") } },
    });
  });

  it("tells which auth ids already have a profile, without a query for none", async () => {
    expect((await userRepository.existingIds([])).size).toBe(0);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();

    mockPrisma.user.findMany.mockResolvedValue([{ id: "a" }]);
    const ids = await userRepository.existingIds(["a", "b"]);
    expect([...ids]).toEqual(["a"]);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ["a", "b"] } },
      select: { id: true },
    });
  });
});

describe("auditWhere", () => {
  it("matches an actor id exactly, through its index", () => {
    expect(auditWhere({ actor: ID.toUpperCase() })).toEqual({ AND: [{ actorId: ID }] });
  });

  it("looks for any other actor among the people, without the @", () => {
    expect(auditWhere({ actor: "@jordan" })).toEqual({
      AND: [
        {
          actor: {
            is: {
              OR: [
                { username: { contains: "jordan", mode: "insensitive" } },
                { email: { contains: "jordan", mode: "insensitive" } },
                { displayName: { contains: "jordan", mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  });

  it("reads a target as an id, a type, or the start of an id as the list prints it", () => {
    expect(auditWhere({ target: ID })).toEqual({ AND: [{ targetId: ID }] });
    expect(auditWhere({ target: "2b3c4d5e" })).toEqual({
      AND: [
        {
          OR: [
            { targetType: { equals: "2b3c4d5e", mode: "insensitive" } },
            { targetId: { startsWith: "2b3c4d5e", mode: "insensitive" } },
          ],
        },
      ],
    });
  });

  it("keeps each filter its own term, the date range included", () => {
    const from = new Date("2026-10-01T00:00:00+02:00");
    const until = new Date("2026-10-08T00:00:00+02:00");
    expect(
      auditWhere({ actor: ID, target: "User", action: "admin.user.mfa_reset", from, until }).AND,
    ).toHaveLength(4);
    expect(auditWhere({ from })).toEqual({ AND: [{ createdAt: { gte: from } }] });
    expect(auditWhere({ until })).toEqual({ AND: [{ createdAt: { lt: until } }] });
  });

  it("matches everything with no filter", () => {
    expect(auditWhere({ actor: " ", target: "", action: "" })).toEqual({ AND: [] });
  });
});

describe("auditLogRepository", () => {
  it("reads a page newest first, the id settling entries of the same instant", async () => {
    mockPrisma.auditLog.count.mockResolvedValue(1200);
    const slice = await auditLogRepository.list({
      filter: { action: "user.role.update" },
      dir: "desc",
      page: 3,
      pageSize: 50,
    });
    expect(firstArg(mockPrisma.auditLog.findMany)).toMatchObject({
      where: { AND: [{ action: "user.role.update" }] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: 100,
      take: 50,
    });
    expect(slice.total).toBe(1200);
  });

  it("goes on from the last entry of the previous batch when exporting", async () => {
    await auditLogRepository.exportBatch({}, null, 500);
    expect(firstArg(mockPrisma.auditLog.findMany)).not.toHaveProperty("cursor");

    mockPrisma.auditLog.findMany.mockClear();
    await auditLogRepository.exportBatch({}, ID, 500);
    expect(firstArg(mockPrisma.auditLog.findMany)).toMatchObject({
      cursor: { id: ID },
      skip: 1,
      take: 500,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  });

  it("lists the actions the log holds, once each", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([{ action: "a" }, { action: "b" }]);
    expect(await auditLogRepository.actionNames()).toEqual(["a", "b"]);
    expect(firstArg(mockPrisma.auditLog.findMany)).toMatchObject({ distinct: ["action"] });
  });
});

describe("lessonRepository.listForConsole", () => {
  const base = {
    folder: "active" as const,
    q: "",
    category: undefined,
    difficulty: undefined,
    status: undefined,
    origin: undefined,
    sort: undefined,
    page: 1,
    pageSize: 50,
  };

  beforeEach(() => {
    mockPrisma.lesson.count.mockResolvedValue(10);
  });

  it("keeps the archives out of the working list, drafts first and newest first", async () => {
    await lessonRepository.listForConsole(base);
    expect(firstArg(mockPrisma.lesson.findMany)).toMatchObject({
      where: { AND: [{ status: { in: ["DRAFT", "PUBLISHED"] } }] },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      take: 50,
    });
  });

  it("ignores a status filter in the archives, which hold one status", async () => {
    await lessonRepository.listForConsole({ ...base, folder: "archives", status: "PUBLISHED" });
    expect(firstArg(mockPrisma.lesson.findMany)).toMatchObject({
      where: { AND: [{ status: "ARCHIVED" }] },
    });
  });

  it("filters by status, category, difficulty and the title, refCode or slug", async () => {
    await lessonRepository.listForConsole({
      ...base,
      status: "DRAFT",
      category: "NETWORK",
      difficulty: "EXPERT",
      q: "osi",
      sort: { key: "xp", dir: "desc" },
    });
    expect(firstArg(mockPrisma.lesson.findMany)).toMatchObject({
      where: {
        AND: [
          { status: { in: ["DRAFT", "PUBLISHED"] } },
          { status: "DRAFT" },
          { category: "NETWORK" },
          { difficulty: "EXPERT" },
          {
            OR: [
              { title: { contains: "osi", mode: "insensitive" } },
              { refCode: { contains: "osi", mode: "insensitive" } },
              { slug: { contains: "osi", mode: "insensitive" } },
            ],
          },
        ],
      },
      orderBy: [{ xpReward: "desc" }, { title: "asc" }, { id: "asc" }],
    });
  });

  it("tells a class lesson by its audience", async () => {
    await lessonRepository.listForConsole({ ...base, origin: "class" });
    expect(firstArg(mockPrisma.lesson.findMany)).toMatchObject({
      where: { AND: [{ status: { in: ["DRAFT", "PUBLISHED"] } }, { audience: "CLASS" }] },
    });
  });

  it("tells the first catalogue from the new one by the shape of the refCode", async () => {
    mockPrisma.lesson.findMany.mockResolvedValueOnce([
      { id: "old", refCode: "CL-LSN-042-V01" },
      { id: "new", refCode: "CL-LSN-01042-V01" },
    ]);
    await lessonRepository.listForConsole({ ...base, origin: "first" });
    expect(mockPrisma.lesson.findMany.mock.calls[1]?.[0]).toMatchObject({
      where: { AND: [{ status: { in: ["DRAFT", "PUBLISHED"] } }, { id: { in: ["old"] } }] },
    });

    mockPrisma.lesson.findMany.mockReset();
    mockPrisma.lesson.findMany
      .mockResolvedValueOnce([{ id: "old", refCode: "CL-LSN-042-V01" }])
      .mockResolvedValue([]);
    await lessonRepository.listForConsole({ ...base, origin: "new" });
    expect(mockPrisma.lesson.findMany.mock.calls[1]?.[0]).toMatchObject({
      where: {
        AND: [
          { status: { in: ["DRAFT", "PUBLISHED"] } },
          { audience: "CATALOGUE", id: { notIn: ["old"] } },
        ],
      },
    });
  });

  it("counts every status, an empty one as zero", async () => {
    mockPrisma.lesson.groupBy.mockResolvedValue([{ status: "PUBLISHED", _count: { _all: 250 } }]);
    expect(await lessonRepository.countByStatus()).toEqual({
      DRAFT: 0,
      PUBLISHED: 250,
      ARCHIVED: 0,
    });
  });
});

describe("the console's quick search", () => {
  it("offers a few accounts for a term, the most recently active first", async () => {
    await userRepository.searchForConsole("@amel", 5);
    expect(firstArg(mockPrisma.user.findMany)).toEqual({
      where: consoleUserWhere("@amel", undefined),
      orderBy: [{ lastActiveAt: "desc" }, { id: "asc" }],
      take: 5,
      select: { id: true, email: true, username: true, displayName: true, role: true },
    });
  });

  it("offers a few lessons in every status, the archives last", async () => {
    await lessonRepository.searchForConsole("  osi ", 5);
    expect(firstArg(mockPrisma.lesson.findMany)).toMatchObject({
      where: {
        OR: [
          { title: { contains: "osi", mode: "insensitive" } },
          { refCode: { contains: "osi", mode: "insensitive" } },
          { slug: { contains: "osi", mode: "insensitive" } },
        ],
      },
      orderBy: [{ status: "asc" }, { title: "asc" }, { id: "asc" }],
      take: 5,
    });
    // No status term: a draft and an archived lesson are found as well.
    expect(JSON.stringify(firstArg(mockPrisma.lesson.findMany).where)).not.toContain("status");
  });

  it("looks for a ticket by its subject or its requester, without the @", () => {
    const contains = { contains: "amel", mode: "insensitive" };
    expect(consoleTicketWhere(" @amel ")).toEqual({
      OR: [
        { subject: contains },
        { email: contains },
        {
          user: {
            is: { OR: [{ email: contains }, { username: contains }, { displayName: contains }] },
          },
        },
      ],
    });
  });

  it("offers a few tickets, the open ones first and then the most recently touched", async () => {
    await ticketRepository.searchForConsole("panne", 5);
    expect(firstArg(mockPrisma.contactTicket.findMany)).toMatchObject({
      where: consoleTicketWhere("panne"),
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      take: 5,
    });
  });

  it("matches nothing, without a query, for an empty term", async () => {
    expect(await userRepository.searchForConsole(" @ ", 5)).toEqual([]);
    expect(await lessonRepository.searchForConsole("   ", 5)).toEqual([]);
    expect(await ticketRepository.searchForConsole("@", 5)).toEqual([]);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.lesson.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.contactTicket.findMany).not.toHaveBeenCalled();
  });
});
