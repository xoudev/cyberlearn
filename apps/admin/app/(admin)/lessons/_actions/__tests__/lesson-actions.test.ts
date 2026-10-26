/**
 * Creating a lesson with its paths and prerequisites, the refCode the form
 * proposes for it, the checks a lesson passes before it is stored, and its
 * status and deletion from the list. The repositories are mocked; the MDX
 * check runs for real. What each write does, and in which transaction, is
 * lesson-console.test.ts's in packages/db.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  catalogueIds: vi.fn(),
  createFromConsole: vi.fn(),
  lessonRefCodes: vi.fn(),
  findStatus: vi.fn(),
  changeStatus: vi.fn(),
  changeStatuses: vi.fn(),
  findForDeletion: vi.fn(),
  deleteLesson: vi.fn(),
  catalogueRefCodes: vi.fn(),
  pathLessonRefCodes: vi.fn(),
  auditRecord: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  lessonRepository: {
    findCatalogueIds: m.catalogueIds,
    createFromConsole: m.createFromConsole,
    findLessonRefCodes: m.lessonRefCodes,
    findStatus: m.findStatus,
    changeStatus: m.changeStatus,
    changeStatuses: m.changeStatuses,
    findForDeletion: m.findForDeletion,
    delete: m.deleteLesson,
  },
  pathRepository: {
    findCatalogueRefCodes: m.catalogueRefCodes,
    findLessonRefCodes: m.pathLessonRefCodes,
  },
  auditLogRepository: { record: m.auditRecord },
}));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const {
  bulkUpdateLessonStatusAction,
  createLessonAction,
  deleteLessonAction,
  getNextRefCodeAction,
  updateLessonStatusAction,
} = await import("../lesson-actions");

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
  m.catalogueRefCodes.mockResolvedValue([]);
  m.catalogueIds.mockResolvedValue([]);
  m.createFromConsole.mockResolvedValue(NEW_LESSON);
});

describe("createLessonAction", () => {
  it("puts the new lesson at the end of each path chosen, in order, with its prerequisites", async () => {
    // In the database's order, not the one chosen.
    m.catalogueRefCodes.mockResolvedValue([
      { id: WEB, refCode: "CL-PATH-110-V01" },
      { id: LINUX, refCode: "CL-PATH-102-V01" },
    ]);
    m.catalogueIds.mockResolvedValue([A]);

    await expect(
      createLessonAction({}, form({ pathIds: [LINUX, WEB], prerequisiteIds: [A] })),
    ).rejects.toThrow("REDIRECT /lessons");

    expect(m.catalogueRefCodes).toHaveBeenCalledExactlyOnceWith([LINUX, WEB]);
    expect(m.catalogueIds).toHaveBeenCalledExactlyOnceWith([A]);
    expect(m.createFromConsole).toHaveBeenCalledExactlyOnceWith({
      fields: {
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
      },
      publish: false,
      actorId: "admin-1",
      paths: [
        { id: LINUX, refCode: "CL-PATH-102-V01" },
        { id: WEB, refCode: "CL-PATH-110-V01" },
      ],
      prerequisiteIds: [A],
    });
  });

  it("publishes it at once when asked", async () => {
    const data = form();
    data.set("publishNow", "true");
    await expect(createLessonAction({}, data)).rejects.toThrow("REDIRECT /lessons");
    expect(m.createFromConsole.mock.lastCall?.[0]).toMatchObject({ publish: true });
  });

  it("opens the lesson it created in its studio", async () => {
    await expect(createLessonAction({}, form())).rejects.toThrow(
      `REDIRECT /lessons/${NEW_LESSON}?saved=created`,
    );
  });

  it("creates a lesson in no path, as before", async () => {
    await expect(createLessonAction({}, form())).rejects.toThrow("REDIRECT /lessons");
    expect(m.createFromConsole.mock.lastCall?.[0]).toMatchObject({
      paths: [],
      prerequisiteIds: [],
    });
  });

  it("refuses a path that is not a catalogue path, before creating anything", async () => {
    // findCatalogueRefCodes leaves a class path out.
    m.catalogueRefCodes.mockResolvedValue([]);
    const state = await createLessonAction({}, form({ pathIds: [LINUX] }));
    expect(state.fieldErrors?.pathIds).toBe("Un des parcours choisis n'existe plus.");
    expect(m.catalogueRefCodes).toHaveBeenCalledExactlyOnceWith([LINUX]);
    expect(m.createFromConsole).not.toHaveBeenCalled();
  });

  it("refuses a prerequisite that is not a catalogue lesson, before creating anything", async () => {
    m.catalogueIds.mockResolvedValue([]);
    const state = await createLessonAction({}, form({ prerequisiteIds: [A] }));
    expect(state.fieldErrors?.prerequisiteIds).toBe(
      "Une des leçons choisies comme prérequis n'existe plus.",
    );
    expect(m.createFromConsole).not.toHaveBeenCalled();
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
    expect(m.createFromConsole).not.toHaveBeenCalled();
  });

  it("says what to correct when the lesson renders but breaks a rule", async () => {
    const state = await createLessonAction({}, form({}, `\n## S\n\nUn mot ${EM_DASH} un autre.\n`));
    expect(state.error).toBe("Le contenu est à corriger.");
    expect(state.problems?.map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 4, column: 8 },
    ]);
    expect(m.createFromConsole).not.toHaveBeenCalled();
  });

  it("refuses an em dash in the title, which is published with the lesson", async () => {
    const data = form();
    data.set("title", `Une leçon ${EM_DASH} la suite`);
    const state = await createLessonAction({}, data);
    expect(state.fieldErrors?.title).toMatch(/^Le titre contient un tiret cadratin/);
    // The content went unchecked: the editor keeps what it marks.
    expect(state.problems).toBeUndefined();
    expect(m.createFromConsole).not.toHaveBeenCalled();
  });

  it("refuses a lesson too short once trimmed, before the content check", async () => {
    const state = await createLessonAction({}, form({}, "\n\n  ## S  \n\n"));
    expect(state.fieldErrors?.contentMdx).toBeDefined();
    expect(state.problems).toBeUndefined();
    expect(m.createFromConsole).not.toHaveBeenCalled();
  });

  // The empty list takes down what an earlier save marked in the editor.
  it("says the content passed when the save fails after the check", async () => {
    m.createFromConsole.mockRejectedValue(
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
    expect(m.createFromConsole.mock.lastCall).toMatchObject([
      { fields: { contentMdx: "## S\n\nUn mot, puis un autre." } },
    ]);
  });

  it("refuses the same prerequisite twice", async () => {
    const state = await createLessonAction({}, form({ prerequisiteIds: [A, A] }));
    expect(state.fieldErrors?.prerequisiteIds).toBe("Un prérequis figure deux fois.");
    expect(m.createFromConsole).not.toHaveBeenCalled();
  });
});

describe("getNextRefCodeAction", () => {
  beforeEach(() => {
    m.lessonRefCodes.mockResolvedValue(["CL-LSN-02001-V01", "CL-LSN-17091-V01"]);
  });

  it("follows the catalogue without a path", async () => {
    expect(await getNextRefCodeAction()).toEqual({ nextRefCode: "CL-LSN-17092-V01" });
    expect(m.pathLessonRefCodes).not.toHaveBeenCalled();
  });

  it("takes the first path's prefix and the rank the lesson will have at its end", async () => {
    // Linux as content/paths/linux.json lists it: 80 lessons and a recap
    // closing each of its ten modules. The recaps are not ranked: 02081.
    const lessonRefCodes: string[] = [];
    for (let n = 1; n <= 80; n++) {
      lessonRefCodes.push(`CL-LSN-02${String(n).padStart(3, "0")}-V01`);
      if (n % 8 === 0) lessonRefCodes.push(`CL-LSN-02${String(900 + n / 8)}-V01`);
    }
    expect(lessonRefCodes).toHaveLength(90);
    m.pathLessonRefCodes.mockResolvedValue({ refCode: "CL-PATH-102-V01", lessonRefCodes });
    expect(await getNextRefCodeAction(LINUX)).toEqual({ nextRefCode: "CL-LSN-02081-V01" });
    expect(m.pathLessonRefCodes).toHaveBeenCalledExactlyOnceWith(LINUX);
  });

  it("falls back on the catalogue for a path without a prefix", async () => {
    m.pathLessonRefCodes.mockResolvedValue({
      refCode: "CL-PATH-004-V01",
      lessonRefCodes: ["CL-LSN-042-V01"],
    });
    expect(await getNextRefCodeAction(LINUX)).toEqual({ nextRefCode: "CL-LSN-17092-V01" });
  });

  it("ignores a path id that is not one", async () => {
    expect(await getNextRefCodeAction("linux")).toEqual({ nextRefCode: "CL-LSN-17092-V01" });
    expect(m.pathLessonRefCodes).not.toHaveBeenCalled();
  });
});

describe("updateLessonStatusAction", () => {
  it("changes the status with where it came from", async () => {
    m.findStatus.mockResolvedValue({ id: A, status: "DRAFT" });
    expect(await updateLessonStatusAction(A, "PUBLISHED")).toEqual({});
    expect(m.changeStatus).toHaveBeenCalledExactlyOnceWith({
      lessonId: A,
      from: "DRAFT",
      to: "PUBLISHED",
      actorId: "admin-1",
    });
    expect(m.revalidatePath).toHaveBeenCalledWith("/lessons/archives");
  });

  it("refuses a lesson that is gone", async () => {
    m.findStatus.mockResolvedValue(null);
    expect(await updateLessonStatusAction(A, "ARCHIVED")).toEqual({
      error: "Leçon introuvable.",
    });
    expect(m.changeStatus).not.toHaveBeenCalled();
  });
});

describe("bulkUpdateLessonStatusAction", () => {
  it("gives the selection one status and says how many changed", async () => {
    m.changeStatuses.mockResolvedValue(2);
    expect(await bulkUpdateLessonStatusAction([A, NEW_LESSON], "ARCHIVED")).toEqual({ count: 2 });
    expect(m.changeStatuses).toHaveBeenCalledExactlyOnceWith({
      lessonIds: [A, NEW_LESSON],
      to: "ARCHIVED",
      actorId: "admin-1",
    });
  });

  it("refuses an empty selection", async () => {
    expect(await bulkUpdateLessonStatusAction([], "ARCHIVED")).toEqual({
      error: "Sélection ou statut invalide.",
    });
    expect(m.changeStatuses).not.toHaveBeenCalled();
  });
});

describe("deleteLessonAction", () => {
  function deletion(lessonId = A): FormData {
    const data = new FormData();
    data.set("lessonId", lessonId);
    return data;
  }

  const DRAFT = { id: A, title: "Brouillon", status: "DRAFT", pathCount: 0 };

  it("deletes a draft no path holds, then records it", async () => {
    m.findForDeletion.mockResolvedValue(DRAFT);
    expect(await deleteLessonAction({}, deletion())).toEqual({ success: true });
    expect(m.deleteLesson).toHaveBeenCalledExactlyOnceWith(A);
    expect(m.auditRecord).toHaveBeenCalledExactlyOnceWith({
      actorId: "admin-1",
      action: "lesson.delete",
      targetType: "Lesson",
      targetId: A,
      metadata: { title: "Brouillon", status: "DRAFT" },
    });
    expect(m.deleteLesson.mock.invocationCallOrder[0]).toBeLessThan(
      m.auditRecord.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("refuses a published lesson, and one a path holds", async () => {
    m.findForDeletion.mockResolvedValueOnce({ ...DRAFT, status: "PUBLISHED" });
    expect((await deleteLessonAction({}, deletion())).error).toMatch(/publiée/u);
    m.findForDeletion.mockResolvedValueOnce({ ...DRAFT, status: "ARCHIVED", pathCount: 1 });
    expect((await deleteLessonAction({}, deletion())).error).toMatch(/parcours/u);
    expect(m.deleteLesson).not.toHaveBeenCalled();
    expect(m.auditRecord).not.toHaveBeenCalled();
  });

  it("says so when the delete fails, and records nothing", async () => {
    m.findForDeletion.mockResolvedValue(DRAFT);
    m.deleteLesson.mockRejectedValueOnce(new Error("foreign key"));
    expect(await deleteLessonAction({}, deletion())).toEqual({
      error: "Une erreur est survenue lors de la suppression.",
    });
    expect(m.auditRecord).not.toHaveBeenCalled();
  });
});
