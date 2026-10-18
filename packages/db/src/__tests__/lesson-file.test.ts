/**
 * The one write that puts a lesson file over a lesson, and what the console
 * reads before it. Prisma is mocked: what this checks is that a row which
 * moved since the comparison is left alone, logged or not, and that the
 * audit line lands with the write.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  lessonFileRepository,
  type LessonFileWrite,
} from "../repositories/lesson-file.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    lesson: { updateMany: vi.fn() },
    lessonPrerequisite: { deleteMany: vi.fn(), createMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      lesson: { findMany: vi.fn(), findUnique: vi.fn() },
      lessonQuizAnswer: { groupBy: vi.fn() },
      auditLog: { findMany: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const LESSON = "11111111-1111-4111-8111-111111111111";
const PREREQ = "22222222-2222-4222-8222-222222222222";
const SEEN = new Date("2026-09-01T10:00:00Z");

function write(over: Partial<LessonFileWrite> = {}): LessonFileWrite {
  return {
    lessonId: LESSON,
    expectedUpdatedAt: SEEN,
    fields: {
      contentMdx: "# Les listes",
      title: "Listes",
      description: "Ranger plusieurs valeurs dans une seule variable.",
      category: "DEV",
      difficulty: "BEGINNER",
      estimatedMinutes: 20,
      xpReward: 50,
    },
    prerequisiteIds: [PREREQ],
    audit: { actorId: "admin-1", action: "lesson.import.update", metadata: { refCode: "X" } },
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.lesson.updateMany.mockResolvedValue({ count: 1 });
});

describe("writeFromFile", () => {
  it("writes the fields on the row as it was compared, its prerequisites, and the audit line", async () => {
    expect(await lessonFileRepository.writeFromFile(write())).toBe(true);

    const [update] = tx.lesson.updateMany.mock.calls[0] as [{ where: unknown; data: object }];
    expect(update.where).toEqual({ id: LESSON, updatedAt: SEEN });
    expect(update.data).not.toHaveProperty("slug");
    expect(update.data).not.toHaveProperty("status");
    expect(tx.lessonPrerequisite.deleteMany).toHaveBeenCalledWith({ where: { lessonId: LESSON } });
    expect(tx.lessonPrerequisite.createMany).toHaveBeenCalledWith({
      data: [{ lessonId: LESSON, prerequisiteId: PREREQ }],
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: "admin-1",
        action: "lesson.import.update",
        targetType: "lesson",
        targetId: LESSON,
        metadata: { refCode: "X" },
      },
    });
  });

  it("writes and logs nothing more when the row moved since the comparison", async () => {
    tx.lesson.updateMany.mockResolvedValue({ count: 0 });
    expect(await lessonFileRepository.writeFromFile(write())).toBe(false);
    expect(tx.lessonPrerequisite.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("clears the prerequisites of a file that has none", async () => {
    await lessonFileRepository.writeFromFile(write({ prerequisiteIds: [] }));
    expect(tx.lessonPrerequisite.deleteMany).toHaveBeenCalled();
    expect(tx.lessonPrerequisite.createMany).not.toHaveBeenCalled();
  });
});

describe("consoleEditsSinceFile", () => {
  it("keeps an edit only when nothing came from a file after it", async () => {
    const edited = new Date("2026-09-10T08:00:00Z");
    // Newest first, as the query orders them.
    mockPrisma.auditLog.findMany.mockResolvedValue([
      { targetId: "b", action: "lesson.import.update", createdAt: new Date("2026-09-12") },
      { targetId: "a", action: "lesson.update", createdAt: edited },
      { targetId: "b", action: "lesson.update", createdAt: new Date("2026-09-09") },
      { targetId: "a", action: "lesson.import.success", createdAt: new Date(0) },
    ]);
    const edits = await lessonFileRepository.consoleEditsSinceFile(["a", "b"]);
    expect([...edits]).toEqual([["a", edited]]);
  });

  it("reads nothing for no lesson", async () => {
    expect((await lessonFileRepository.consoleEditsSinceFile([])).size).toBe(0);
    expect(mockPrisma.auditLog.findMany).not.toHaveBeenCalled();
  });
});

describe("quizAnswerCounts", () => {
  it("counts the answers of each quiz of each lesson", async () => {
    mockPrisma.lessonQuizAnswer.groupBy.mockResolvedValue([
      { lessonId: "a", quizId: "q1", _count: { _all: 3 } },
    ]);
    expect(await lessonFileRepository.quizAnswerCounts(["a"])).toEqual([
      { lessonId: "a", quizId: "q1", answers: 3 },
    ]);
  });
});

describe("refCodesByIds", () => {
  it("names each lesson found by its refCode", async () => {
    mockPrisma.lesson.findMany.mockResolvedValue([
      { id: LESSON, refCode: "CL-LSN-001-V01" },
      { id: PREREQ, refCode: "CL-LSN-002-V01" },
    ]);
    const named = await lessonFileRepository.refCodesByIds([LESSON, PREREQ]);
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith({
      where: { id: { in: [LESSON, PREREQ] } },
      select: { id: true, refCode: true },
    });
    expect([...named]).toEqual([
      [LESSON, "CL-LSN-001-V01"],
      [PREREQ, "CL-LSN-002-V01"],
    ]);
  });

  it("reads nothing for no lesson", async () => {
    expect((await lessonFileRepository.refCodesByIds([])).size).toBe(0);
    expect(mockPrisma.lesson.findMany).not.toHaveBeenCalled();
  });
});

describe("catalogueLessonsOutside", () => {
  it("asks for the catalogue's lessons that no file names, by refCode", async () => {
    const outside = [
      { id: LESSON, refCode: "CL-LSN-900-V01", title: "Écrite ici", status: "DRAFT" },
    ];
    mockPrisma.lesson.findMany.mockResolvedValue(outside);
    expect(await lessonFileRepository.catalogueLessonsOutside(["CL-LSN-001-V01"])).toEqual(outside);
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledWith({
      where: { audience: "CATALOGUE", refCode: { notIn: ["CL-LSN-001-V01"] } },
      orderBy: { refCode: "asc" },
      select: { id: true, refCode: true, title: true, status: true },
    });
  });
});
