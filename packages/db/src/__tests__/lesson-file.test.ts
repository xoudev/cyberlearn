/**
 * The writes that bring a lesson file into the database, and what the console
 * reads before them. Prisma is mocked, and the publish they go through is the
 * real one: what this checks is that a row which moved since the comparison
 * is left alone, logged or not, and that every write leaves one version and
 * one audit line, with the source it came from.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  lessonFileRepository,
  type LessonFileCreate,
  type LessonFileWrite,
} from "../repositories/lesson-file.repository.js";
import type { LessonContent } from "../repositories/lesson-version.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    lesson: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    lessonVersion: { findUnique: vi.fn(), create: vi.fn() },
    lessonPrerequisite: { deleteMany: vi.fn(), createMany: vi.fn() },
    lessonDraft: { findUnique: vi.fn(), updateMany: vi.fn(), delete: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      lesson: { findMany: vi.fn(), findUnique: vi.fn() },
      lessonQuizAnswer: { groupBy: vi.fn() },
      lessonDraft: { findMany: vi.fn() },
      auditLog: { findMany: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const LESSON = "11111111-1111-4111-8111-111111111111";
const PREREQ = "22222222-2222-4222-8222-222222222222";
const SEEN = new Date("2026-09-01T10:00:00Z");

/** The lesson as the comparison read it, at version 3. */
const LESSON_CONTENT: LessonContent = {
  refCode: "CL-LSN-005-V01",
  slug: "listes-et-tuples",
  title: "Listes",
  description: "Ranger plusieurs valeurs dans une seule variable.",
  category: "DEV",
  difficulty: "BEGINNER",
  estimatedMinutes: 20,
  xpReward: 50,
  contentMdx: "# Les listes",
  coverImageUrl: null,
};

/** What a file declares: the lesson's fields a file can change, two of them changed. */
const FILE_FIELDS: LessonFileWrite["fields"] = {
  contentMdx: "# Les listes\n\nUne liste garde ses éléments dans l'ordre.",
  title: "Listes et tuples",
  description: LESSON_CONTENT.description,
  category: LESSON_CONTENT.category,
  difficulty: LESSON_CONTENT.difficulty,
  estimatedMinutes: LESSON_CONTENT.estimatedMinutes,
  xpReward: LESSON_CONTENT.xpReward,
};

/** The lesson's own fields, as a file that changes only the prerequisites declares them. */
const SAME_FIELDS: LessonFileWrite["fields"] = {
  ...FILE_FIELDS,
  contentMdx: LESSON_CONTENT.contentMdx,
  title: LESSON_CONTENT.title,
};

function write(over: Partial<LessonFileWrite> = {}): LessonFileWrite {
  return {
    lessonId: LESSON,
    expectedUpdatedAt: SEEN,
    fields: FILE_FIELDS,
    prerequisiteIds: [PREREQ],
    audit: { actorId: "admin-1", action: "lesson.import.update", metadata: { refCode: "X" } },
    ...over,
  };
}

/** The data of every row a mocked create was called with, in order. */
function created(mock: { mock: { calls: unknown[][] } }): unknown[] {
  return mock.mock.calls.map(([arg]) => (arg as { data: unknown }).data);
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.lesson.findUnique.mockResolvedValue({
    ...LESSON_CONTENT,
    version: 3,
    updatedAt: SEEN,
    publishedAt: SEEN,
  });
  tx.lesson.updateMany.mockResolvedValue({ count: 1 });
  // Version 3 is recorded already: an update adds its own and no baseline.
  tx.lessonVersion.findUnique.mockResolvedValue({ id: "v3" });
  tx.lessonVersion.create.mockResolvedValue({});
  tx.lessonDraft.findUnique.mockResolvedValue(null);
  tx.auditLog.create.mockResolvedValue({});
});

describe("writeFromFile", () => {
  it("publishes the file's fields over the row as it was compared, slug and status untouched", async () => {
    expect(await lessonFileRepository.writeFromFile(write())).toEqual({
      ok: true,
      version: 4,
      draftKept: false,
    });

    const [update] = tx.lesson.updateMany.mock.calls[0] as [
      { where: unknown; data: Record<string, unknown> },
    ];
    expect(update.where).toEqual({ id: LESSON, version: 3, updatedAt: SEEN });
    expect(update.data).toMatchObject({ ...FILE_FIELDS, version: 4 });
    expect(update.data["slug"]).toBe(LESSON_CONTENT.slug);
    expect(update.data["coverImageUrl"]).toBeNull();
    expect(update.data).not.toHaveProperty("status");
    expect(tx.lessonPrerequisite.deleteMany).toHaveBeenCalledWith({ where: { lessonId: LESSON } });
    expect(tx.lessonPrerequisite.createMany).toHaveBeenCalledWith({
      data: [{ lessonId: LESSON, prerequisiteId: PREREQ }],
    });
  });

  it("leaves one version row and one audit row for an import update", async () => {
    await lessonFileRepository.writeFromFile(write());

    expect(created(tx.lessonVersion.create)).toEqual([
      expect.objectContaining({ lessonId: LESSON, version: 4, source: "IMPORT" }),
    ]);
    expect(created(tx.auditLog.create)).toEqual([
      {
        actorId: "admin-1",
        action: "lesson.import.update",
        targetType: "Lesson",
        targetId: LESSON,
        metadata: { refCode: "X", version: 4 },
      },
    ]);
  });

  it("leaves one version row and one audit row for a sync update, from the repository", async () => {
    await lessonFileRepository.writeFromFile(
      write({
        audit: { actorId: "admin-1", action: "lesson.sync", metadata: { file: "python/05.mdx" } },
      }),
    );

    expect(created(tx.lessonVersion.create)).toEqual([
      expect.objectContaining({ lessonId: LESSON, version: 4, source: "SYNC" }),
    ]);
    expect(created(tx.auditLog.create)).toEqual([
      expect.objectContaining({
        action: "lesson.sync",
        targetId: LESSON,
        metadata: { file: "python/05.mdx", version: 4 },
      }),
    ]);
  });

  it("keeps a studio draft open on the lesson as it is, and says one is there", async () => {
    tx.lessonDraft.findUnique.mockResolvedValue({ lessonId: LESSON });
    expect(await lessonFileRepository.writeFromFile(write())).toMatchObject({
      ok: true,
      draftKept: true,
    });
    expect(tx.lessonDraft.updateMany).not.toHaveBeenCalled();
    expect(tx.lessonDraft.delete).not.toHaveBeenCalled();
  });

  it("refuses a row that changed since its diff was shown: nothing written or logged", async () => {
    tx.lesson.findUnique.mockResolvedValue({
      ...LESSON_CONTENT,
      version: 4,
      updatedAt: new Date("2026-09-02T08:00:00Z"),
      publishedAt: SEEN,
    });
    expect(await lessonFileRepository.writeFromFile(write())).toEqual({ ok: false });
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
    expect(tx.lessonVersion.create).not.toHaveBeenCalled();
    expect(tx.lessonPrerequisite.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("writes and logs nothing more when the row moves between the read and the write", async () => {
    tx.lesson.updateMany.mockResolvedValue({ count: 0 });
    expect(await lessonFileRepository.writeFromFile(write())).toEqual({ ok: false });
    expect(tx.lessonVersion.create).not.toHaveBeenCalled();
    expect(tx.lessonPrerequisite.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("makes no version of a file that only changes the prerequisites, and logs it once", async () => {
    expect(await lessonFileRepository.writeFromFile(write({ fields: SAME_FIELDS }))).toEqual({
      ok: true,
      version: 3,
      draftKept: false,
    });
    // Still conditional on the row as it was compared.
    expect(tx.lesson.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: LESSON, updatedAt: SEEN },
      data: { updatedAt: expect.any(Date) },
    });
    expect(tx.lessonVersion.create).not.toHaveBeenCalled();
    expect(tx.lessonPrerequisite.createMany).toHaveBeenCalled();
    expect(created(tx.auditLog.create)).toEqual([
      expect.objectContaining({
        action: "lesson.import.update",
        metadata: { refCode: "X", version: 3 },
      }),
    ]);
  });

  it("writes no prerequisite of such a file when the row moved", async () => {
    tx.lesson.updateMany.mockResolvedValue({ count: 0 });
    expect(await lessonFileRepository.writeFromFile(write({ fields: SAME_FIELDS }))).toEqual({
      ok: false,
    });
    expect(tx.lessonPrerequisite.deleteMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("clears the prerequisites of a file that has none", async () => {
    await lessonFileRepository.writeFromFile(write({ prerequisiteIds: [] }));
    expect(tx.lessonPrerequisite.deleteMany).toHaveBeenCalled();
    expect(tx.lessonPrerequisite.createMany).not.toHaveBeenCalled();
  });
});

describe("createFromFile", () => {
  function create(over: Partial<LessonFileCreate> = {}): LessonFileCreate {
    return {
      fields: LESSON_CONTENT,
      actorId: "admin-1",
      prerequisiteRefCodes: ["CL-LSN-004-V01"],
      auditMetadata: { refCode: LESSON_CONTENT.refCode, contentHash: "abc" },
      ...over,
    };
  }

  beforeEach(() => {
    tx.lesson.create.mockResolvedValue({ id: LESSON, refCode: LESSON_CONTENT.refCode });
    tx.lesson.findMany.mockResolvedValue([{ id: PREREQ }]);
    // The row the transaction has just created, at its first version.
    tx.lesson.findUnique.mockResolvedValue({
      ...LESSON_CONTENT,
      version: 1,
      updatedAt: SEEN,
      publishedAt: null,
    });
  });

  it("creates the lesson as DRAFT, by its importer, with the prerequisites the database has", async () => {
    expect(await lessonFileRepository.createFromFile(create())).toEqual({
      lessonId: LESSON,
      refCode: LESSON_CONTENT.refCode,
      version: 1,
    });
    expect(created(tx.lesson.create)).toEqual([
      { ...LESSON_CONTENT, status: "DRAFT", authorId: "admin-1" },
    ]);
    expect(tx.lesson.findMany).toHaveBeenCalledWith({
      where: { refCode: { in: ["CL-LSN-004-V01"] } },
      select: { id: true },
    });
    expect(tx.lessonPrerequisite.createMany).toHaveBeenCalledWith({
      data: [{ lessonId: LESSON, prerequisiteId: PREREQ }],
    });
  });

  it("records its first version from the import and one audit row, in the same transaction", async () => {
    await lessonFileRepository.createFromFile(create());
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(created(tx.lessonVersion.create)).toEqual([
      expect.objectContaining({ lessonId: LESSON, version: 1, source: "IMPORT" }),
    ]);
    expect(created(tx.auditLog.create)).toEqual([
      {
        actorId: "admin-1",
        action: "lesson.import.success",
        targetType: "Lesson",
        targetId: LESSON,
        metadata: { refCode: LESSON_CONTENT.refCode, contentHash: "abc", version: 1 },
      },
    ]);
    expect(tx.lesson.updateMany).not.toHaveBeenCalled();
  });

  it("links nothing for a lesson with no prerequisite", async () => {
    await lessonFileRepository.createFromFile(create({ prerequisiteRefCodes: [] }));
    expect(tx.lesson.findMany).not.toHaveBeenCalled();
    expect(tx.lessonPrerequisite.createMany).not.toHaveBeenCalled();
  });
});

describe("openDrafts", () => {
  it("says when each lesson's open draft was last saved", async () => {
    const saved = new Date("2026-10-18T09:00:00Z");
    mockPrisma.lessonDraft.findMany.mockResolvedValue([{ lessonId: "a", updatedAt: saved }]);
    expect([...(await lessonFileRepository.openDrafts(["a", "b"]))]).toEqual([["a", saved]]);
  });

  it("reads nothing for no lesson", async () => {
    expect((await lessonFileRepository.openDrafts([])).size).toBe(0);
    expect(mockPrisma.lessonDraft.findMany).not.toHaveBeenCalled();
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

  it("counts a publish from the lesson studio as a console edit", async () => {
    const published = new Date("2026-10-18T08:00:00Z");
    mockPrisma.auditLog.findMany.mockResolvedValue([
      { targetId: "a", action: "lesson.publish", createdAt: published },
      { targetId: "a", action: "lesson.sync", createdAt: new Date(0) },
    ]);
    const edits = await lessonFileRepository.consoleEditsSinceFile(["a"]);
    expect([...edits]).toEqual([["a", published]]);
    // The studio's publish, and the form's save it replaced, still in the log.
    const query = JSON.stringify(mockPrisma.auditLog.findMany.mock.lastCall);
    expect(query).toContain('"lesson.publish"');
    expect(query).toContain('"lesson.update"');
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
