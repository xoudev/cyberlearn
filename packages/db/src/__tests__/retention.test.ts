/**
 * Unit tests for the retention purge: the cutoffs, which tickets each filter
 * reaches, and the trace it leaves. Prisma is mocked; the filters run against
 * real rows in retention.integration.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  expiredTicketFilters,
  monthsBefore,
  purgeExpiredRecords,
  RETENTION_MONTHS,
} from "../rgpd/retention.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $transaction: vi.fn(),
    auditLog: { deleteMany: vi.fn(), create: vi.fn() },
    contactTicket: { deleteMany: vi.fn() },
    lessonPreview: { deleteMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const NOW = new Date("2026-10-03T03:30:00.000Z");

describe("monthsBefore", () => {
  it.each([
    ["2026-10-03T03:30:00.000Z", 12, "2025-10-03T03:30:00.000Z"],
    ["2026-10-03T03:30:00.000Z", 3, "2026-07-03T03:30:00.000Z"],
    ["2026-03-31T10:00:00.000Z", 1, "2026-02-28T10:00:00.000Z"],
    ["2028-03-31T10:00:00.000Z", 1, "2028-02-29T10:00:00.000Z"],
    ["2026-05-31T10:00:00.000Z", 3, "2026-02-28T10:00:00.000Z"],
    ["2026-01-15T00:00:00.000Z", 12, "2025-01-15T00:00:00.000Z"],
  ])("%s minus %i months is %s", (now, months, expected) => {
    expect(monthsBefore(new Date(now), months).toISOString()).toBe(expected);
  });

  it("does not touch the date it is given", () => {
    const now = new Date(NOW);
    monthsBefore(now, 3);
    expect(now.toISOString()).toBe(NOW.toISOString());
  });
});

describe("expiredTicketFilters", () => {
  const { resolved, open } = expiredTicketFilters(NOW);

  it("reaches resolved and closed tickets three months after their resolution", () => {
    expect(resolved.AND).toContainEqual({ status: { in: ["RESOLVED", "CLOSED"] } });
    expect(resolved.AND).toContainEqual({
      updatedAt: { lt: new Date("2026-07-03T03:30:00.000Z") },
    });
  });

  it("reaches open tickets twelve months after their last activity", () => {
    expect(open.AND).toContainEqual({ status: { in: ["OPEN", "IN_PROGRESS"] } });
    expect(open.AND).toContainEqual({ updatedAt: { lt: new Date("2025-10-03T03:30:00.000Z") } });
  });

  it("spares the appeal of a ban still in force, in both", () => {
    const spare = {
      OR: [
        { appealFor: { is: null } },
        { appealFor: { is: { OR: [{ liftedAt: { not: null } }, { expiresAt: { lte: NOW } }] } } },
      ],
    };
    expect(resolved.AND).toContainEqual(spare);
    expect(open.AND).toContainEqual(spare);
  });
});

describe("purgeExpiredRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.auditLog.deleteMany.mockReturnValue("auditLogs");
    mockPrisma.contactTicket.deleteMany.mockReturnValue("tickets");
    mockPrisma.lessonPreview.deleteMany.mockReturnValue("previews");
  });

  it("deletes in one transaction and records what it did", async () => {
    mockPrisma.$transaction.mockResolvedValue([
      { count: 4 },
      { count: 2 },
      { count: 1 },
      { count: 3 },
    ]);

    await expect(purgeExpiredRecords(NOW)).resolves.toEqual({
      auditLogs: 4,
      resolvedTickets: 2,
      openTickets: 1,
      lessonPreviews: 3,
    });

    expect(mockPrisma.$transaction).toHaveBeenCalledWith([
      "auditLogs",
      "tickets",
      "tickets",
      "previews",
    ]);
    expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({
      where: { createdAt: { lt: monthsBefore(NOW, RETENTION_MONTHS.auditLog) } },
    });
    const filters = expiredTicketFilters(NOW);
    expect(mockPrisma.contactTicket.deleteMany).toHaveBeenNthCalledWith(1, {
      where: filters.resolved,
    });
    expect(mockPrisma.contactTicket.deleteMany).toHaveBeenNthCalledWith(2, { where: filters.open });
    // An editor preview lives half an hour past its last refresh; whatever is
    // older than now is gone.
    expect(mockPrisma.lessonPreview.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lt: NOW } },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: null,
        action: "retention.purge",
        targetType: "Retention",
        metadata: { auditLogs: 4, resolvedTickets: 2, openTickets: 1, lessonPreviews: 3 },
      },
    });
  });

  it("leaves no trace on a day with nothing to purge", async () => {
    mockPrisma.$transaction.mockResolvedValue([
      { count: 0 },
      { count: 0 },
      { count: 0 },
      { count: 0 },
    ]);
    await purgeExpiredRecords(NOW);
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });
});
