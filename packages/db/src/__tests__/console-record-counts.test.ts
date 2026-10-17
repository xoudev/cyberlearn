/**
 * The totals an account's page in the console heads its moderation lists
 * with. The lists stop at the latest few; the totals count everything, so
 * that a number read as a total is one. Prisma is mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { moderationRepository } from "../repositories/moderation.repository.js";
import { noteReportRepository } from "../repositories/note-report.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    moderationEvent: { count: vi.fn() },
    noteReport: { count: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("moderationRepository.countForUser", () => {
  it("counts every decision about the account's writing, with no limit", async () => {
    mockPrisma.moderationEvent.count.mockResolvedValue(25);
    await expect(moderationRepository.countForUser(USER)).resolves.toBe(25);
    expect(mockPrisma.moderationEvent.count).toHaveBeenCalledWith({ where: { userId: USER } });
  });
});

describe("noteReportRepository.countAgainstAuthor", () => {
  it("counts every report filed against the author's notes, with no limit", async () => {
    mockPrisma.noteReport.count.mockResolvedValue(12);
    await expect(noteReportRepository.countAgainstAuthor(USER)).resolves.toBe(12);
    expect(mockPrisma.noteReport.count).toHaveBeenCalledWith({
      where: { note: { userId: USER } },
    });
  });
});
