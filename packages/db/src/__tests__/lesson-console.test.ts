/**
 * What the console's lesson pages read and write, moved out of their server
 * actions into lessonRepository and pathRepository. Prisma is mocked: what
 * this checks is the query each read sends, and that each write lands with
 * its audit row in one transaction, through that transaction's client, under
 * the names and with the metadata the actions wrote before.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { pathRepository } from "../repositories/path.repository.js";
import type { LessonContent } from "../repositories/lesson-version.repository.js";

const { tx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    lesson: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    lessonPrerequisite: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    mockPrisma: {
      $transaction: vi.fn((run: (client: typeof tx) => Promise<unknown>) => run(tx)),
      lesson: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
      path: { findMany: vi.fn(), findUnique: vi.fn() },
      auditLog: { create: vi.fn() },
    },
  };
});

vi.mock("../prisma.js", () => ({ prisma: mockPrisma }));

const LESSON = "11111111-1111-4111-8111-111111111111";
const LINUX = "22222222-2222-4222-8222-222222222222";
const NETWORK = "33333333-3333-4333-8333-333333333333";
const A = "44444444-4444-4444-8444-444444444444";
const B = "55555555-5555-4555-8555-555555555555";

const FIELDS: LessonContent = {
  refCode: "CL-LSN-02081-V01",
  slug: "nouvelle-lecon",
  title: "Une nouvelle leçon",
  description: "Ce que la leçon apprend, en une phrase ou deux.",
  category: "DEV",
  difficulty: "BEGINNER",
  estimatedMinutes: 20,
  xpReward: 100,
  contentMdx: "## S\n\nUn mot, puis un autre.",
  coverImageUrl: null,
};

/** The audit rows written through the transaction's client, as the table got them. */
function auditRows(): Record<string, unknown>[] {
  return tx.auditLog.create.mock.calls.map(
    (call) => (call[0] as { data: Record<string, unknown> }).data,
  );
}

// Where a lesson lands in a path, and how the gap closes, is
// path-lessons.test.ts's: here, only which path, which lesson, which client.
const attachLesson = vi.spyOn(pathRepository, "attachLesson");
const detachLesson = vi.spyOn(pathRepository, "detachLesson");

beforeEach(() => {
  vi.clearAllMocks();
  attachLesson.mockResolvedValue(undefined);
  detachLesson.mockResolvedValue(undefined);
  tx.auditLog.create.mockResolvedValue({});
  tx.lessonPrerequisite.findMany.mockResolvedValue([]);
});

// ── Reads ────────────────────────────────────────────────────────────────────

describe("the console's reads", () => {
  it("reads every refCode of the CL-LSN- series, whatever the audience", async () => {
    mockPrisma.lesson.findMany.mockResolvedValue([
      { refCode: "CL-LSN-02001-V01" },
      { refCode: "CL-LSN-17091-V01" },
    ]);
    expect(await lessonRepository.findLessonRefCodes()).toEqual([
      "CL-LSN-02001-V01",
      "CL-LSN-17091-V01",
    ]);
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { refCode: { startsWith: "CL-LSN-" } },
      select: { refCode: true },
    });
  });

  it("keeps only the catalogue lessons among the prerequisites chosen", async () => {
    mockPrisma.lesson.findMany.mockResolvedValue([{ id: A }]);
    expect(await lessonRepository.findCatalogueIds([A, B])).toEqual([A]);
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: { in: [A, B] }, audience: "CATALOGUE" },
      select: { id: true },
    });
  });

  it("reads the lessons chosen as prerequisites with their audience", async () => {
    const chosen = [{ id: A, refCode: "CL-LSN-02008-V01", audience: "CLASS" }];
    mockPrisma.lesson.findMany.mockResolvedValue(chosen);
    expect(await lessonRepository.findPrerequisiteChoices([A])).toEqual(chosen);
    expect(mockPrisma.lesson.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: { in: [A] } },
      select: { id: true, refCode: true, audience: true },
    });
  });

  it("asks nothing of the database for no id", async () => {
    expect(await lessonRepository.findCatalogueIds([])).toEqual([]);
    expect(await lessonRepository.findPrerequisiteChoices([])).toEqual([]);
    expect(await pathRepository.findCatalogueRefCodes([])).toEqual([]);
    expect(mockPrisma.lesson.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.path.findMany).not.toHaveBeenCalled();
  });

  it("says which of a refCode and a slug another lesson holds", async () => {
    mockPrisma.lesson.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "other" });
    expect(
      await lessonRepository.findTaken({ refCode: FIELDS.refCode, slug: FIELDS.slug }, LESSON),
    ).toEqual({ refCode: false, slug: true });
    // The lesson being published is not in its own way.
    expect(mockPrisma.lesson.findFirst.mock.calls).toEqual([
      [{ where: { refCode: FIELDS.refCode, NOT: { id: LESSON } }, select: { id: true } }],
      [{ where: { slug: FIELDS.slug, NOT: { id: LESSON } }, select: { id: true } }],
    ]);
  });

  it("reads a lesson's catalogue paths only, a class's left out", async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(null);
    expect(await lessonRepository.findCataloguePaths(LESSON)).toBeNull();
    const [query] = mockPrisma.lesson.findUnique.mock.calls[0] as [
      { where: unknown; select: { pathLessons: { where: unknown } } },
    ];
    expect(query.where).toEqual({ id: LESSON });
    expect(query.select.pathLessons.where).toEqual({ path: { audience: "CATALOGUE" } });
  });

  it("reads the refCodes of a lesson's prerequisites", async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue(null);
    await lessonRepository.findPrerequisites(LESSON);
    expect(mockPrisma.lesson.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: LESSON },
      select: {
        id: true,
        refCode: true,
        audience: true,
        prerequisites: { select: { prerequisite: { select: { refCode: true } } } },
      },
    });
  });

  it("reads a lesson's status", async () => {
    mockPrisma.lesson.findUnique.mockResolvedValue({ id: LESSON, status: "DRAFT" });
    expect(await lessonRepository.findStatus(LESSON)).toEqual({ id: LESSON, status: "DRAFT" });
    expect(mockPrisma.lesson.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: LESSON },
      select: { id: true, status: true },
    });
  });

  it("counts every path that holds a lesson before it is deleted, class paths included", async () => {
    mockPrisma.lesson.findUnique.mockResolvedValueOnce({
      id: LESSON,
      title: "Brouillon",
      status: "DRAFT",
      _count: { pathLessons: 2 },
    });
    expect(await lessonRepository.findForDeletion(LESSON)).toEqual({
      id: LESSON,
      title: "Brouillon",
      status: "DRAFT",
      pathCount: 2,
    });
    expect(mockPrisma.lesson.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: LESSON },
      select: { id: true, title: true, status: true, _count: { select: { pathLessons: true } } },
    });

    mockPrisma.lesson.findUnique.mockResolvedValueOnce(null);
    expect(await lessonRepository.findForDeletion(LESSON)).toBeNull();
  });

  it("deletes the lesson by its id", async () => {
    await lessonRepository.delete(LESSON);
    expect(mockPrisma.lesson.delete).toHaveBeenCalledExactlyOnceWith({ where: { id: LESSON } });
  });

  it("keeps only the catalogue paths among those chosen, with their refCode", async () => {
    mockPrisma.path.findMany.mockResolvedValue([{ id: LINUX, refCode: "CL-PATH-102-V01" }]);
    expect(await pathRepository.findCatalogueRefCodes([LINUX, NETWORK])).toEqual([
      { id: LINUX, refCode: "CL-PATH-102-V01" },
    ]);
    expect(mockPrisma.path.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: { in: [LINUX, NETWORK] }, audience: "CATALOGUE" },
      select: { id: true, refCode: true },
    });
  });

  it("reads a path's refCode and those of every lesson it holds", async () => {
    mockPrisma.path.findUnique.mockResolvedValueOnce({
      refCode: "CL-PATH-102-V01",
      lessons: [
        { lesson: { refCode: "CL-LSN-02001-V01" } },
        { lesson: { refCode: "CL-LSN-02901-V01" } },
      ],
    });
    expect(await pathRepository.findLessonRefCodes(LINUX)).toEqual({
      refCode: "CL-PATH-102-V01",
      lessonRefCodes: ["CL-LSN-02001-V01", "CL-LSN-02901-V01"],
    });
    expect(mockPrisma.path.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { id: LINUX },
      select: { refCode: true, lessons: { select: { lesson: { select: { refCode: true } } } } },
    });

    mockPrisma.path.findUnique.mockResolvedValueOnce(null);
    expect(await pathRepository.findLessonRefCodes(LINUX)).toBeNull();
  });
});

// ── Writes ───────────────────────────────────────────────────────────────────

describe("createFromConsole", () => {
  beforeEach(() => {
    tx.lesson.create.mockResolvedValue({ id: LESSON, title: FIELDS.title, status: "DRAFT" });
  });

  it("creates the lesson, puts it at the end of each path in order, and records it", async () => {
    const id = await lessonRepository.createFromConsole({
      fields: FIELDS,
      publish: false,
      actorId: "admin-1",
      paths: [
        { id: NETWORK, refCode: "CL-PATH-103-V01" },
        { id: LINUX, refCode: "CL-PATH-102-V01" },
      ],
      prerequisiteIds: [A],
    });

    expect(id).toBe(LESSON);
    expect(tx.lesson.create).toHaveBeenCalledExactlyOnceWith({
      data: { ...FIELDS, authorId: "admin-1", status: "DRAFT", publishedAt: null },
    });
    expect(attachLesson.mock.calls).toEqual([
      [NETWORK, LESSON, tx],
      [LINUX, LESSON, tx],
    ]);
    expect(tx.lessonPrerequisite.deleteMany).toHaveBeenCalledWith({ where: { lessonId: LESSON } });
    expect(tx.lessonPrerequisite.createMany).toHaveBeenCalledWith({
      data: [{ lessonId: LESSON, prerequisiteId: A }],
      skipDuplicates: true,
    });
    expect(auditRows()).toEqual([
      {
        actorId: "admin-1",
        action: "lesson.create",
        targetType: "Lesson",
        targetId: LESSON,
        metadata: {
          title: FIELDS.title,
          status: "DRAFT",
          paths: ["CL-PATH-103-V01", "CL-PATH-102-V01"],
          prerequisites: 1,
        },
      },
    ]);
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("publishes it at once, stamped, when asked", async () => {
    tx.lesson.create.mockResolvedValue({ id: LESSON, title: FIELDS.title, status: "PUBLISHED" });
    await lessonRepository.createFromConsole({
      fields: FIELDS,
      publish: true,
      actorId: "admin-1",
      paths: [],
      prerequisiteIds: [],
    });
    const [args] = tx.lesson.create.mock.calls[0] as [
      { data: { status: string; publishedAt: unknown } },
    ];
    expect(args.data.status).toBe("PUBLISHED");
    expect(args.data.publishedAt).toBeInstanceOf(Date);
    expect(attachLesson).not.toHaveBeenCalled();
    expect(tx.lessonPrerequisite.createMany).not.toHaveBeenCalled();
    expect(auditRows()[0]).toMatchObject({ metadata: { status: "PUBLISHED", paths: [] } });
  });

  it("writes nothing more once the lesson's refCode is taken", async () => {
    tx.lesson.create.mockRejectedValue(new Error("Unique constraint failed on (`refCode`)"));
    await expect(
      lessonRepository.createFromConsole({
        fields: FIELDS,
        publish: false,
        actorId: "admin-1",
        paths: [{ id: LINUX, refCode: "CL-PATH-102-V01" }],
        prerequisiteIds: [],
      }),
    ).rejects.toThrow("Unique constraint");
    expect(attachLesson).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});

describe("changeStatus", () => {
  it("sets the status and records where it came from, in one transaction", async () => {
    await lessonRepository.changeStatus({
      lessonId: LESSON,
      from: "PUBLISHED",
      to: "ARCHIVED",
      actorId: "admin-1",
    });
    expect(tx.lesson.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: LESSON },
      data: { status: "ARCHIVED" },
    });
    expect(auditRows()).toEqual([
      {
        actorId: "admin-1",
        action: "lesson.status",
        targetType: "Lesson",
        targetId: LESSON,
        metadata: { from: "PUBLISHED", to: "ARCHIVED" },
      },
    ]);
  });

  it("stamps publishedAt on a publish only", async () => {
    await lessonRepository.changeStatus({
      lessonId: LESSON,
      from: "DRAFT",
      to: "PUBLISHED",
      actorId: "admin-1",
    });
    const [args] = tx.lesson.update.mock.calls[0] as [{ data: { publishedAt?: unknown } }];
    expect(args.data.publishedAt).toBeInstanceOf(Date);
  });
});

describe("changeStatuses", () => {
  it("gives the selection one status, names the first lesson and how many were asked", async () => {
    tx.lesson.updateMany.mockResolvedValue({ count: 1 });
    expect(
      await lessonRepository.changeStatuses({
        lessonIds: [A, B],
        to: "DRAFT",
        actorId: "admin-1",
      }),
    ).toBe(1);
    expect(tx.lesson.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { id: { in: [A, B] } },
      data: { status: "DRAFT" },
    });
    expect(auditRows()).toEqual([
      {
        actorId: "admin-1",
        action: "lesson.status.bulk",
        targetType: "Lesson",
        targetId: A,
        metadata: { to: "DRAFT", count: 2 },
      },
    ]);
  });

  it("stamps publishedAt on a publish only", async () => {
    tx.lesson.updateMany.mockResolvedValue({ count: 2 });
    await lessonRepository.changeStatuses({ lessonIds: [A, B], to: "PUBLISHED", actorId: "a" });
    const [args] = tx.lesson.updateMany.mock.calls[0] as [{ data: { publishedAt?: unknown } }];
    expect(args.data.publishedAt).toBeInstanceOf(Date);
  });
});

describe("changePaths", () => {
  it("takes the lesson out, then puts it in, and records both by refCode", async () => {
    await lessonRepository.changePaths({
      lesson: { id: LESSON, refCode: "CL-LSN-17092-V01" },
      added: [{ id: LINUX, refCode: "CL-PATH-102-V01" }],
      removed: [{ id: NETWORK, refCode: "CL-PATH-103-V01" }],
      actorId: "admin-1",
    });
    expect(detachLesson).toHaveBeenCalledExactlyOnceWith(NETWORK, LESSON, tx);
    expect(attachLesson).toHaveBeenCalledExactlyOnceWith(LINUX, LESSON, tx);
    expect(detachLesson.mock.invocationCallOrder[0]).toBeLessThan(
      attachLesson.mock.invocationCallOrder[0] ?? 0,
    );
    expect(auditRows()).toEqual([
      {
        actorId: "admin-1",
        action: "lesson.paths",
        targetType: "Lesson",
        targetId: LESSON,
        metadata: {
          refCode: "CL-LSN-17092-V01",
          added: ["CL-PATH-102-V01"],
          removed: ["CL-PATH-103-V01"],
        },
      },
    ]);
  });
});

describe("changePrerequisites", () => {
  const change = {
    lesson: { id: LESSON, refCode: "CL-LSN-02010-V01" },
    before: ["CL-LSN-02005-V01", "CL-LSN-02001-V01"],
    prerequisites: [
      { id: B, refCode: "CL-LSN-02009-V01" },
      { id: A, refCode: "CL-LSN-02008-V01" },
    ],
    actorId: "admin-1",
  };

  it("checks for a loop among the links the transaction reads, then replaces them", async () => {
    const edges = [{ lessonId: A, prerequisiteId: B }];
    tx.lessonPrerequisite.findMany.mockResolvedValue(edges);
    const findCycle = vi.fn(() => null);

    expect(await lessonRepository.changePrerequisites({ ...change, findCycle })).toBeNull();

    expect(findCycle).toHaveBeenCalledExactlyOnceWith(edges);
    expect(tx.lessonPrerequisite.findMany).toHaveBeenCalledWith({
      select: { lessonId: true, prerequisiteId: true },
    });
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.lessonPrerequisite.createMany).toHaveBeenCalledWith({
      data: [
        { lessonId: LESSON, prerequisiteId: B },
        { lessonId: LESSON, prerequisiteId: A },
      ],
      skipDuplicates: true,
    });
    // Before and after, each sorted.
    expect(auditRows()).toEqual([
      {
        actorId: "admin-1",
        action: "lesson.prerequisites",
        targetType: "Lesson",
        targetId: LESSON,
        metadata: {
          refCode: "CL-LSN-02010-V01",
          before: ["CL-LSN-02001-V01", "CL-LSN-02005-V01"],
          after: ["CL-LSN-02008-V01", "CL-LSN-02009-V01"],
        },
      },
    ]);
  });

  it("hands back the loop and writes nothing", async () => {
    const loop = [LESSON, A, B, LESSON];
    expect(
      await lessonRepository.changePrerequisites({ ...change, findCycle: () => loop }),
    ).toEqual(loop);
    expect(tx.lessonPrerequisite.deleteMany).not.toHaveBeenCalled();
    expect(tx.lessonPrerequisite.createMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
