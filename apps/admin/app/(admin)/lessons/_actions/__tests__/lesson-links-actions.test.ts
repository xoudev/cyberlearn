/**
 * A lesson's paths and prerequisites, saved from its page. Prisma and the
 * repositories are mocked: where a lesson lands in a path and how the gap
 * closes are pathRepository's, tested in packages/db. What this checks is
 * what the actions ask of them, and what they refuse.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const tx = { auditLog: { create: vi.fn() } };
  return {
    tx,
    requireAdminAction: vi.fn(),
    lessonFindUnique: vi.fn(),
    lessonFindMany: vi.fn(),
    pathFindMany: vi.fn(),
    attachLesson: vi.fn(),
    detachLesson: vi.fn(),
    findPrerequisiteEdges: vi.fn(),
    replacePrerequisites: vi.fn(),
    transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  pathRepository: { attachLesson: m.attachLesson, detachLesson: m.detachLesson },
  lessonRepository: {
    findPrerequisiteEdges: m.findPrerequisiteEdges,
    replacePrerequisites: m.replacePrerequisites,
  },
  prisma: {
    lesson: { findUnique: m.lessonFindUnique, findMany: m.lessonFindMany },
    path: { findMany: m.pathFindMany },
    $transaction: m.transaction,
  },
}));
vi.mock("@cyberlearn/lib/logger", () => ({
  logger: { error: vi.fn() },
  errorMessage: (error: unknown) => String(error),
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));

const { setLessonPathsAction, setLessonPrerequisitesAction } = await import(
  "../lesson-links-actions"
);

const LESSON = "11111111-1111-4111-8111-111111111111";
const LINUX = "22222222-2222-4222-8222-222222222222";
const NETWORK = "33333333-3333-4333-8333-333333333333";
const WEB = "44444444-4444-4444-8444-444444444444";
const A = "55555555-5555-4555-8555-555555555555";
const B = "66666666-6666-4666-8666-666666666666";

/** The data of the n-th audit line written in the transaction. */
function audit(n = 0): Record<string, unknown> {
  const call = m.tx.auditLog.create.mock.calls[n] as [{ data: Record<string, unknown> }];
  return call[0].data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
});

describe("setLessonPathsAction", () => {
  beforeEach(() => {
    m.lessonFindUnique.mockResolvedValue({
      id: LESSON,
      refCode: "CL-LSN-17092-V01",
      audience: "CATALOGUE",
      pathLessons: [
        { pathId: LINUX, path: { refCode: "CL-PATH-102-V01" } },
        { pathId: NETWORK, path: { refCode: "CL-PATH-103-V01" } },
      ],
    });
    m.pathFindMany.mockResolvedValue([{ id: WEB, refCode: "CL-PATH-110-V01" }]);
  });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(setLessonPathsAction(LESSON, [LINUX])).rejects.toThrow("NEXT_REDIRECT");
    expect(m.lessonFindUnique).not.toHaveBeenCalled();
  });

  it("leaves the paths it stays in, takes it out of one and puts it in another", async () => {
    expect(await setLessonPathsAction(LESSON, [LINUX, WEB])).toEqual({ ok: true });

    expect(m.detachLesson).toHaveBeenCalledExactlyOnceWith(NETWORK, LESSON, m.tx);
    expect(m.attachLesson).toHaveBeenCalledExactlyOnceWith(WEB, LESSON, m.tx);
    expect(audit()).toMatchObject({
      actorId: "admin-1",
      action: "lesson.paths",
      targetId: LESSON,
      metadata: {
        refCode: "CL-LSN-17092-V01",
        added: ["CL-PATH-110-V01"],
        removed: ["CL-PATH-103-V01"],
      },
    });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/lessons/${LESSON}`);
    expect(m.revalidatePath).toHaveBeenCalledWith(`/paths/${WEB}/edit`);
    expect(m.revalidatePath).toHaveBeenCalledWith(`/paths/${NETWORK}/edit`);
  });

  it("only reads, and only touches, the lesson's catalogue paths", async () => {
    await setLessonPathsAction(LESSON, [LINUX, NETWORK]);
    const [query] = m.lessonFindUnique.mock.calls[0] as [
      { select: { pathLessons: { where: unknown } } },
    ];
    expect(query.select.pathLessons.where).toEqual({ path: { audience: "CATALOGUE" } });
  });

  it("writes nothing when nothing changes", async () => {
    expect(await setLessonPathsAction(LESSON, [NETWORK, LINUX])).toEqual({ ok: true });
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses a path that is gone or is a class's", async () => {
    m.pathFindMany.mockResolvedValue([]);
    const result = await setLessonPathsAction(LESSON, [LINUX, NETWORK, WEB]);
    expect(result.error).toMatch(/n'existe plus/u);
    expect(m.pathFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [WEB] }, audience: "CATALOGUE" } }),
    );
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses a class lesson", async () => {
    m.lessonFindUnique.mockResolvedValue({
      id: LESSON,
      refCode: "CL-CLS-00042-V01",
      audience: "CLASS",
      pathLessons: [],
    });
    const result = await setLessonPathsAction(LESSON, [WEB]);
    expect(result.error).toMatch(/leçon de classe/u);
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses a list it cannot trust", async () => {
    expect((await setLessonPathsAction(LESSON, [LINUX, LINUX])).error).toBe(
      "Un parcours figure deux fois.",
    );
    expect((await setLessonPathsAction(LESSON, ["linux"])).error).toBe("Parcours invalide.");
    expect((await setLessonPathsAction("x", [])).error).toBe("Leçon invalide.");
    expect(m.lessonFindUnique).not.toHaveBeenCalled();
  });

  it("says so when the transaction fails", async () => {
    m.transaction.mockRejectedValueOnce(new Error("deadlock"));
    const result = await setLessonPathsAction(LESSON, [LINUX, WEB]);
    expect(result).toEqual({ error: "Les parcours n'ont pas pu être enregistrés." });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setLessonPrerequisitesAction", () => {
  beforeEach(() => {
    m.lessonFindUnique.mockResolvedValue({
      id: LESSON,
      refCode: "CL-LSN-02010-V01",
      audience: "CATALOGUE",
      prerequisites: [{ prerequisite: { refCode: "CL-LSN-02001-V01" } }],
    });
    m.lessonFindMany.mockResolvedValue([
      { id: A, refCode: "CL-LSN-02008-V01", audience: "CATALOGUE" },
      { id: B, refCode: "CL-LSN-02009-V01", audience: "CATALOGUE" },
    ]);
    m.findPrerequisiteEdges.mockResolvedValue([{ lessonId: A, prerequisiteId: B }]);
  });

  it("replaces the prerequisites in one transaction, and logs before and after", async () => {
    expect(await setLessonPrerequisitesAction(LESSON, [B, A])).toEqual({ ok: true });

    expect(m.findPrerequisiteEdges).toHaveBeenCalledWith(m.tx);
    expect(m.replacePrerequisites).toHaveBeenCalledExactlyOnceWith(LESSON, [B, A], m.tx);
    expect(audit()).toMatchObject({
      action: "lesson.prerequisites",
      targetId: LESSON,
      metadata: {
        refCode: "CL-LSN-02010-V01",
        before: ["CL-LSN-02001-V01"],
        after: ["CL-LSN-02008-V01", "CL-LSN-02009-V01"],
      },
    });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/lessons/${LESSON}`);
  });

  it("refuses a loop, names it, and writes nothing", async () => {
    // B already requires the lesson: requiring A, which requires B, loops.
    m.findPrerequisiteEdges.mockResolvedValue([
      { lessonId: A, prerequisiteId: B },
      { lessonId: B, prerequisiteId: LESSON },
    ]);
    m.lessonFindMany
      .mockResolvedValueOnce([{ id: A, refCode: "CL-LSN-02008-V01", audience: "CATALOGUE" }])
      .mockResolvedValueOnce([
        { id: LESSON, refCode: "CL-LSN-02010-V01" },
        { id: A, refCode: "CL-LSN-02008-V01" },
        { id: B, refCode: "CL-LSN-02009-V01" },
      ]);

    const result = await setLessonPrerequisitesAction(LESSON, [A]);

    expect(result.error).toContain(
      "CL-LSN-02010-V01 → CL-LSN-02008-V01 → CL-LSN-02009-V01 → CL-LSN-02010-V01",
    );
    expect(m.replacePrerequisites).not.toHaveBeenCalled();
    expect(m.tx.auditLog.create).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses the lesson as its own prerequisite before reading anything", async () => {
    const result = await setLessonPrerequisitesAction(LESSON, [LESSON]);
    expect(result.error).toBe("Une leçon ne peut pas être son propre prérequis.");
    expect(m.lessonFindUnique).not.toHaveBeenCalled();
  });

  it("refuses a class lesson as the prerequisite of a catalogue lesson", async () => {
    m.lessonFindMany.mockResolvedValue([{ id: A, refCode: "CL-CLS-00042-V01", audience: "CLASS" }]);
    const result = await setLessonPrerequisitesAction(LESSON, [A]);
    expect(result.error).toMatch(/leçon de classe/u);
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses a lesson that is gone", async () => {
    m.lessonFindMany.mockResolvedValue([]);
    const result = await setLessonPrerequisitesAction(LESSON, [A]);
    expect(result.error).toBe("Une des leçons choisies n'existe plus.");
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("clears every prerequisite with an empty list", async () => {
    expect(await setLessonPrerequisitesAction(LESSON, [])).toEqual({ ok: true });
    expect(m.lessonFindMany).not.toHaveBeenCalled();
    expect(m.replacePrerequisites).toHaveBeenCalledExactlyOnceWith(LESSON, [], m.tx);
  });
});
