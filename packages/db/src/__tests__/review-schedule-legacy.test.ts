/**
 * The retired SM-2 queue's rows in the GDPR export: what is asked of the
 * database and what the export gets back. Prisma is mocked; the same read on
 * the real database is in review-schedules-retired.integration.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { reviewScheduleLegacyRepository } from "../repositories/review-schedule-legacy.repository.js";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    reviewScheduleLegacy: { findMany: vi.fn() },
  },
}));

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const USER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("reviewScheduleLegacyRepository.listForExport", () => {
  it("reads the learner's own rows only, in a stable order", async () => {
    mockPrisma.reviewScheduleLegacy.findMany.mockResolvedValueOnce([]);

    await reviewScheduleLegacyRepository.listForExport(USER);

    expect(mockPrisma.reviewScheduleLegacy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER },
        orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }],
      }),
    );
  });

  it("names each lesson by its title and slug, with the fields the export listed before", async () => {
    const nextReviewAt = new Date("2026-10-20T00:00:00.000Z");
    const lastReviewedAt = new Date("2026-10-14T09:30:00.000Z");
    mockPrisma.reviewScheduleLegacy.findMany.mockResolvedValueOnce([
      {
        easeFactor: 2.6,
        intervalDays: 6,
        repetitions: 2,
        nextReviewAt,
        lastReviewedAt,
        lesson: { title: "Le modèle OSI", slug: "modele-osi" },
      },
    ]);

    const rows = await reviewScheduleLegacyRepository.listForExport(USER);

    expect(rows).toEqual([
      {
        lessonTitle: "Le modèle OSI",
        lessonSlug: "modele-osi",
        easeFactor: 2.6,
        intervalDays: 6,
        repetitions: 2,
        nextReviewAt,
        lastReviewedAt,
      },
    ]);
  });

  it("gives an empty list to a learner with no row left", async () => {
    mockPrisma.reviewScheduleLegacy.findMany.mockResolvedValueOnce([]);

    expect(await reviewScheduleLegacyRepository.listForExport(USER)).toEqual([]);
  });
});
