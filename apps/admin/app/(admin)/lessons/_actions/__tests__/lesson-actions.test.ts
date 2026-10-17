/**
 * Creating a lesson with its paths and prerequisites, and the refCode the form
 * proposes for it. Prisma, the repositories and the MDX check are mocked.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => {
  const tx = {
    lesson: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  };
  return {
    tx,
    requireAdminAction: vi.fn(),
    lessonFindMany: vi.fn(),
    pathFindMany: vi.fn(),
    pathFindUnique: vi.fn(),
    attachLesson: vi.fn(),
    replacePrerequisites: vi.fn(),
    transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
  };
});

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  pathRepository: { attachLesson: m.attachLesson },
  lessonRepository: { replacePrerequisites: m.replacePrerequisites },
  prisma: {
    lesson: { findMany: m.lessonFindMany },
    path: { findMany: m.pathFindMany, findUnique: m.pathFindUnique },
    $transaction: m.transaction,
  },
}));
vi.mock("@cyberlearn/lib/mdx-check", () => ({
  checkLessonMdx: vi.fn().mockResolvedValue({ ok: true }),
  describeLessonMdxProblem: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { createLessonAction, getNextRefCodeAction } = await import("../lesson-actions");

const LINUX = "22222222-2222-4222-8222-222222222222";
const WEB = "44444444-4444-4444-8444-444444444444";
const A = "55555555-5555-4555-8555-555555555555";
const NEW_LESSON = "99999999-9999-4999-8999-999999999999";

function form(links: { pathIds?: string[]; prerequisiteIds?: string[] } = {}): FormData {
  const data = new FormData();
  const fields: Record<string, string> = {
    refCode: "CL-LSN-02091-V01",
    slug: "nouvelle-lecon",
    title: "Une nouvelle leçon",
    description: "Ce que la leçon apprend, en une phrase ou deux.",
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedMinutes: "20",
    xpReward: "100",
    contentMdx: "# Titre\n\nUn paragraphe.",
    coverImageUrl: "",
  };
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  for (const id of links.pathIds ?? []) data.append("pathIds", id);
  for (const id of links.prerequisiteIds ?? []) data.append("prerequisiteIds", id);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.tx.lesson.create.mockResolvedValue({
    id: NEW_LESSON,
    title: "Une nouvelle leçon",
    status: "DRAFT",
  });
});

describe("createLessonAction", () => {
  it("puts the new lesson at the end of each path chosen, in order, with its prerequisites", async () => {
    m.pathFindMany.mockResolvedValue([
      { id: WEB, refCode: "CL-PATH-110-V01" },
      { id: LINUX, refCode: "CL-PATH-102-V01" },
    ]);
    m.lessonFindMany.mockResolvedValue([{ id: A }]);

    await expect(
      createLessonAction({}, form({ pathIds: [LINUX, WEB], prerequisiteIds: [A] })),
    ).rejects.toThrow("REDIRECT /lessons");

    expect(m.attachLesson.mock.calls).toEqual([
      [LINUX, NEW_LESSON, m.tx],
      [WEB, NEW_LESSON, m.tx],
    ]);
    expect(m.replacePrerequisites).toHaveBeenCalledExactlyOnceWith(NEW_LESSON, [A], m.tx);
    const [audit] = m.tx.auditLog.create.mock.calls[0] as [{ data: Record<string, unknown> }];
    expect(audit.data).toMatchObject({
      action: "lesson.create",
      metadata: { paths: ["CL-PATH-102-V01", "CL-PATH-110-V01"], prerequisites: 1 },
    });
  });

  it("creates a lesson in no path, as before", async () => {
    await expect(createLessonAction({}, form())).rejects.toThrow("REDIRECT /lessons");
    expect(m.pathFindMany).not.toHaveBeenCalled();
    expect(m.attachLesson).not.toHaveBeenCalled();
    expect(m.replacePrerequisites).toHaveBeenCalledExactlyOnceWith(NEW_LESSON, [], m.tx);
  });

  it("refuses a path that is not a catalogue path, before creating anything", async () => {
    m.pathFindMany.mockResolvedValue([]);
    const state = await createLessonAction({}, form({ pathIds: [LINUX] }));
    expect(state.fieldErrors?.pathIds).toBe("Un des parcours choisis n'existe plus.");
    expect(m.pathFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [LINUX] }, audience: "CATALOGUE" } }),
    );
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses the same prerequisite twice", async () => {
    const state = await createLessonAction({}, form({ prerequisiteIds: [A, A] }));
    expect(state.fieldErrors?.prerequisiteIds).toBe("Un prérequis figure deux fois.");
    expect(m.transaction).not.toHaveBeenCalled();
  });
});

describe("getNextRefCodeAction", () => {
  beforeEach(() => {
    m.lessonFindMany.mockResolvedValue([
      { refCode: "CL-LSN-02001-V01" },
      { refCode: "CL-LSN-17091-V01" },
    ]);
  });

  it("follows the catalogue without a path", async () => {
    expect(await getNextRefCodeAction()).toEqual({ nextRefCode: "CL-LSN-17092-V01" });
    expect(m.pathFindUnique).not.toHaveBeenCalled();
  });

  it("takes the first path's prefix and the place the lesson will have at its end", async () => {
    m.pathFindUnique.mockResolvedValue({ refCode: "CL-PATH-102-V01", _count: { lessons: 90 } });
    expect(await getNextRefCodeAction(LINUX)).toEqual({ nextRefCode: "CL-LSN-02091-V01" });
  });

  it("falls back on the catalogue for a path without a prefix", async () => {
    m.pathFindUnique.mockResolvedValue({ refCode: "CL-PATH-004-V01", _count: { lessons: 3 } });
    expect(await getNextRefCodeAction(LINUX)).toEqual({ nextRefCode: "CL-LSN-17092-V01" });
  });

  it("ignores a path id that is not one", async () => {
    expect(await getNextRefCodeAction("linux")).toEqual({ nextRefCode: "CL-LSN-17092-V01" });
    expect(m.pathFindUnique).not.toHaveBeenCalled();
  });
});
