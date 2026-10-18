/**
 * Creating a lesson with its paths and prerequisites, and the refCode the form
 * proposes for it, and the checks a lesson passes before it is stored.
 * Prisma and the repositories are mocked; the MDX check runs for real.
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

/** U+2014, built rather than written: the typography check reads this file. */
const EM_DASH = String.fromCharCode(0x2014);

function form(
  links: { pathIds?: string[]; prerequisiteIds?: string[] } = {},
  contentMdx = "## S\n\nUn mot, puis un autre.\n",
): FormData {
  const data = new FormData();
  const fields: Record<string, string> = {
    refCode: "CL-LSN-02081-V01",
    slug: "nouvelle-lecon",
    title: "Une nouvelle leçon",
    description: "Ce que la leçon apprend, en une phrase ou deux.",
    category: "DEV",
    difficulty: "BEGINNER",
    estimatedMinutes: "20",
    xpReward: "100",
    contentMdx,
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

  it("opens the lesson it created in its studio", async () => {
    await expect(createLessonAction({}, form())).rejects.toThrow(
      `REDIRECT /lessons/${NEW_LESSON}?saved=created`,
    );
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

  // The schema trims the lesson before it is checked; the editor marks the
  // text as typed, blank lines at the top included.
  it("marks each problem at its line in the text as typed, and stores nothing", async () => {
    const state = await createLessonAction(
      {},
      form(
        {},
        `\n\n  <Quiz id="q" question="?" options={["a", "b"]} correct={True} />\n\n## Suite\n\nUn mot ${EM_DASH} un autre.\n`,
      ),
    );
    expect(state.error).toBe("Le contenu ne s'affiche pas.");
    expect(state.problems?.map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 3, column: 59 },
      { line: 7, column: 8 },
    ]);
    expect(state.problems?.[0]?.message).toMatch(/^Ne s'afficherait pas : /);
    expect(state.problems?.[1]?.message).toContain("Tiret cadratin");
    expect(state.fieldErrors?.contentMdx).toContain("(ligne 3, colonne 59)");
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("says what to correct when the lesson renders but breaks a rule", async () => {
    const state = await createLessonAction({}, form({}, `\n## S\n\nUn mot ${EM_DASH} un autre.\n`));
    expect(state.error).toBe("Le contenu est à corriger.");
    expect(state.problems?.map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 4, column: 8 },
    ]);
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses an em dash in the title, which is published with the lesson", async () => {
    const data = form();
    data.set("title", `Une leçon ${EM_DASH} la suite`);
    const state = await createLessonAction({}, data);
    expect(state.fieldErrors?.title).toMatch(/^Le titre contient un tiret cadratin/);
    // The content went unchecked: the editor keeps what it marks.
    expect(state.problems).toBeUndefined();
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses a lesson too short once trimmed, before the content check", async () => {
    const state = await createLessonAction({}, form({}, "\n\n  ## S  \n\n"));
    expect(state.fieldErrors?.contentMdx).toBeDefined();
    expect(state.problems).toBeUndefined();
    expect(m.transaction).not.toHaveBeenCalled();
  });

  // The empty list takes down what an earlier save marked in the editor.
  it("says the content passed when the save fails after the check", async () => {
    m.tx.lesson.create.mockRejectedValue(
      new Error("Unique constraint failed on the fields: (`slug`)"),
    );
    const state = await createLessonAction({}, form());
    expect(state.fieldErrors?.slug).toBe("Déjà utilisé");
    expect(state.problems).toEqual([]);
  });

  it("stores the text trimmed", async () => {
    await expect(
      createLessonAction({}, form({}, "\n\n## S\n\nUn mot, puis un autre.\n")),
    ).rejects.toThrow("REDIRECT /lessons");
    expect(m.tx.lesson.create.mock.lastCall).toMatchObject([
      { data: { contentMdx: "## S\n\nUn mot, puis un autre." } },
    ]);
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

  it("takes the first path's prefix and the rank the lesson will have at its end", async () => {
    // Linux as content/paths/linux.json lists it: 80 lessons and a recap
    // closing each of its ten modules. The recaps are not ranked: 02081.
    const rows: { lesson: { refCode: string } }[] = [];
    for (let n = 1; n <= 80; n++) {
      rows.push({ lesson: { refCode: `CL-LSN-02${String(n).padStart(3, "0")}-V01` } });
      if (n % 8 === 0) rows.push({ lesson: { refCode: `CL-LSN-02${String(900 + n / 8)}-V01` } });
    }
    expect(rows).toHaveLength(90);
    m.pathFindUnique.mockResolvedValue({ refCode: "CL-PATH-102-V01", lessons: rows });
    expect(await getNextRefCodeAction(LINUX)).toEqual({ nextRefCode: "CL-LSN-02081-V01" });
  });

  it("falls back on the catalogue for a path without a prefix", async () => {
    m.pathFindUnique.mockResolvedValue({
      refCode: "CL-PATH-004-V01",
      lessons: [{ lesson: { refCode: "CL-LSN-042-V01" } }],
    });
    expect(await getNextRefCodeAction(LINUX)).toEqual({ nextRefCode: "CL-LSN-17092-V01" });
  });

  it("ignores a path id that is not one", async () => {
    expect(await getNextRefCodeAction("linux")).toEqual({ nextRefCode: "CL-LSN-17092-V01" });
    expect(m.pathFindUnique).not.toHaveBeenCalled();
  });
});
