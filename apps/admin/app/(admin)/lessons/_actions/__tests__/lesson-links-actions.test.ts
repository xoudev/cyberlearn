/**
 * A lesson's paths and prerequisites, saved from its page. The repositories
 * are mocked: where a lesson lands in a path and how the gap closes are
 * pathRepository's, and the transaction that writes the links with their
 * audit row is lessonRepository's, both tested in packages/db. What this
 * checks is what the actions ask of them, and what they refuse.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

interface Edge {
  lessonId: string;
  prerequisiteId: string;
}

interface PrerequisitesChange {
  lesson: { id: string; refCode: string };
  findCycle: (edges: Edge[]) => string[] | null;
}

const m = vi.hoisted(() => ({
  requireAdminAction: vi.fn(),
  findCataloguePaths: vi.fn(),
  findPrerequisites: vi.fn(),
  findPrerequisiteChoices: vi.fn(),
  changePaths: vi.fn(),
  changePrerequisites: vi.fn(),
  catalogueRefCodes: vi.fn(),
  refCodesByIds: vi.fn(),
  /** The catalogue's links, as the prerequisites' transaction reads them. */
  edges: vi.fn<() => Promise<Edge[]>>(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requireAdminAction: m.requireAdminAction }));
vi.mock("@cyberlearn/db", () => ({
  lessonRepository: {
    findCataloguePaths: m.findCataloguePaths,
    findPrerequisites: m.findPrerequisites,
    findPrerequisiteChoices: m.findPrerequisiteChoices,
    changePaths: m.changePaths,
    changePrerequisites: m.changePrerequisites,
  },
  pathRepository: { findCatalogueRefCodes: m.catalogueRefCodes },
  lessonFileRepository: { refCodesByIds: m.refCodesByIds },
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

beforeEach(() => {
  vi.clearAllMocks();
  m.requireAdminAction.mockResolvedValue({ id: "admin-1" });
  m.changePaths.mockResolvedValue(undefined);
  // As the repository does: the loop found among the links it read, or the
  // prerequisites saved and null.
  m.changePrerequisites.mockImplementation(async (change: PrerequisitesChange) =>
    change.findCycle(await m.edges()),
  );
});

describe("setLessonPathsAction", () => {
  beforeEach(() => {
    m.findCataloguePaths.mockResolvedValue({
      id: LESSON,
      refCode: "CL-LSN-17092-V01",
      audience: "CATALOGUE",
      pathLessons: [
        { pathId: LINUX, path: { refCode: "CL-PATH-102-V01" } },
        { pathId: NETWORK, path: { refCode: "CL-PATH-103-V01" } },
      ],
    });
    m.catalogueRefCodes.mockResolvedValue([{ id: WEB, refCode: "CL-PATH-110-V01" }]);
  });

  it("checks the caller is an admin before anything else", async () => {
    m.requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(setLessonPathsAction(LESSON, [LINUX])).rejects.toThrow("NEXT_REDIRECT");
    expect(m.findCataloguePaths).not.toHaveBeenCalled();
  });

  it("leaves the paths it stays in, takes it out of one and puts it in another", async () => {
    expect(await setLessonPathsAction(LESSON, [LINUX, WEB])).toEqual({ ok: true });

    expect(m.findCataloguePaths).toHaveBeenCalledExactlyOnceWith(LESSON);
    expect(m.catalogueRefCodes).toHaveBeenCalledExactlyOnceWith([WEB]);
    expect(m.changePaths).toHaveBeenCalledExactlyOnceWith({
      lesson: { id: LESSON, refCode: "CL-LSN-17092-V01" },
      added: [{ id: WEB, refCode: "CL-PATH-110-V01" }],
      removed: [{ id: NETWORK, refCode: "CL-PATH-103-V01" }],
      actorId: "admin-1",
    });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/lessons/${LESSON}`);
    expect(m.revalidatePath).toHaveBeenCalledWith(`/paths/${WEB}/edit`);
    expect(m.revalidatePath).toHaveBeenCalledWith(`/paths/${NETWORK}/edit`);
  });

  it("joins the paths it is put in in the order chosen", async () => {
    m.catalogueRefCodes.mockResolvedValue([
      { id: WEB, refCode: "CL-PATH-110-V01" },
      { id: NETWORK, refCode: "CL-PATH-103-V01" },
    ]);
    m.findCataloguePaths.mockResolvedValue({
      id: LESSON,
      refCode: "CL-LSN-17092-V01",
      audience: "CATALOGUE",
      pathLessons: [],
    });
    await setLessonPathsAction(LESSON, [NETWORK, WEB]);
    expect(m.changePaths.mock.lastCall?.[0]).toMatchObject({
      added: [
        { id: NETWORK, refCode: "CL-PATH-103-V01" },
        { id: WEB, refCode: "CL-PATH-110-V01" },
      ],
      removed: [],
    });
  });

  it("writes nothing when nothing changes", async () => {
    expect(await setLessonPathsAction(LESSON, [NETWORK, LINUX])).toEqual({ ok: true });
    expect(m.changePaths).not.toHaveBeenCalled();
  });

  it("refuses a path that is gone or is a class's", async () => {
    m.catalogueRefCodes.mockResolvedValue([]);
    const result = await setLessonPathsAction(LESSON, [LINUX, NETWORK, WEB]);
    expect(result.error).toMatch(/n'existe plus/u);
    expect(m.catalogueRefCodes).toHaveBeenCalledExactlyOnceWith([WEB]);
    expect(m.changePaths).not.toHaveBeenCalled();
  });

  it("refuses a class lesson", async () => {
    m.findCataloguePaths.mockResolvedValue({
      id: LESSON,
      refCode: "CL-CLS-00042-V01",
      audience: "CLASS",
      pathLessons: [],
    });
    const result = await setLessonPathsAction(LESSON, [WEB]);
    expect(result.error).toMatch(/leçon de classe/u);
    expect(m.changePaths).not.toHaveBeenCalled();
  });

  it("refuses a lesson that is gone", async () => {
    m.findCataloguePaths.mockResolvedValue(null);
    expect(await setLessonPathsAction(LESSON, [WEB])).toEqual({ error: "Leçon introuvable." });
    expect(m.changePaths).not.toHaveBeenCalled();
  });

  it("refuses a list it cannot trust", async () => {
    expect((await setLessonPathsAction(LESSON, [LINUX, LINUX])).error).toBe(
      "Un parcours figure deux fois.",
    );
    expect((await setLessonPathsAction(LESSON, ["linux"])).error).toBe("Parcours invalide.");
    expect((await setLessonPathsAction("x", [])).error).toBe("Leçon invalide.");
    expect(m.findCataloguePaths).not.toHaveBeenCalled();
  });

  it("says so when the transaction fails", async () => {
    m.changePaths.mockRejectedValueOnce(new Error("deadlock"));
    const result = await setLessonPathsAction(LESSON, [LINUX, WEB]);
    expect(result).toEqual({ error: "Les parcours n'ont pas pu être enregistrés." });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("setLessonPrerequisitesAction", () => {
  beforeEach(() => {
    m.findPrerequisites.mockResolvedValue({
      id: LESSON,
      refCode: "CL-LSN-02010-V01",
      audience: "CATALOGUE",
      prerequisites: [{ prerequisite: { refCode: "CL-LSN-02001-V01" } }],
    });
    m.findPrerequisiteChoices.mockResolvedValue([
      { id: A, refCode: "CL-LSN-02008-V01", audience: "CATALOGUE" },
      { id: B, refCode: "CL-LSN-02009-V01", audience: "CATALOGUE" },
    ]);
    m.edges.mockResolvedValue([{ lessonId: A, prerequisiteId: B }]);
  });

  it("replaces the prerequisites in the order chosen, with what they were before", async () => {
    expect(await setLessonPrerequisitesAction(LESSON, [B, A])).toEqual({ ok: true });

    expect(m.findPrerequisiteChoices).toHaveBeenCalledExactlyOnceWith([B, A]);
    expect(m.changePrerequisites).toHaveBeenCalledExactlyOnceWith({
      lesson: { id: LESSON, refCode: "CL-LSN-02010-V01" },
      before: ["CL-LSN-02001-V01"],
      prerequisites: [
        { id: B, refCode: "CL-LSN-02009-V01" },
        { id: A, refCode: "CL-LSN-02008-V01" },
      ],
      actorId: "admin-1",
      findCycle: expect.any(Function) as unknown,
    });
    expect(m.revalidatePath).toHaveBeenCalledWith(`/lessons/${LESSON}`);
  });

  it("refuses a loop, names it, and writes nothing", async () => {
    // B already requires the lesson: requiring A, which requires B, loops.
    m.edges.mockResolvedValue([
      { lessonId: A, prerequisiteId: B },
      { lessonId: B, prerequisiteId: LESSON },
    ]);
    m.findPrerequisiteChoices.mockResolvedValue([
      { id: A, refCode: "CL-LSN-02008-V01", audience: "CATALOGUE" },
    ]);
    m.refCodesByIds.mockResolvedValue(
      new Map([
        [LESSON, "CL-LSN-02010-V01"],
        [A, "CL-LSN-02008-V01"],
        [B, "CL-LSN-02009-V01"],
      ]),
    );

    const result = await setLessonPrerequisitesAction(LESSON, [A]);

    expect(result.error).toContain(
      "CL-LSN-02010-V01 → CL-LSN-02008-V01 → CL-LSN-02009-V01 → CL-LSN-02010-V01",
    );
    expect(m.refCodesByIds).toHaveBeenCalledExactlyOnceWith([LESSON, A, B, LESSON]);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses the lesson as its own prerequisite before reading anything", async () => {
    const result = await setLessonPrerequisitesAction(LESSON, [LESSON]);
    expect(result.error).toBe("Une leçon ne peut pas être son propre prérequis.");
    expect(m.findPrerequisites).not.toHaveBeenCalled();
  });

  it("refuses a class lesson as the prerequisite of a catalogue lesson", async () => {
    m.findPrerequisiteChoices.mockResolvedValue([
      { id: A, refCode: "CL-CLS-00042-V01", audience: "CLASS" },
    ]);
    const result = await setLessonPrerequisitesAction(LESSON, [A]);
    expect(result.error).toMatch(/leçon de classe/u);
    expect(m.changePrerequisites).not.toHaveBeenCalled();
  });

  it("refuses a lesson that is gone", async () => {
    m.findPrerequisiteChoices.mockResolvedValue([]);
    const result = await setLessonPrerequisitesAction(LESSON, [A]);
    expect(result.error).toBe("Une des leçons choisies n'existe plus.");
    expect(m.changePrerequisites).not.toHaveBeenCalled();
  });

  it("clears every prerequisite with an empty list", async () => {
    m.findPrerequisiteChoices.mockResolvedValue([]);
    expect(await setLessonPrerequisitesAction(LESSON, [])).toEqual({ ok: true });
    expect(m.changePrerequisites.mock.lastCall?.[0]).toMatchObject({ prerequisites: [] });
  });

  it("says so when the transaction fails", async () => {
    m.changePrerequisites.mockRejectedValueOnce(new Error("deadlock"));
    const result = await setLessonPrerequisitesAction(LESSON, [A, B]);
    expect(result).toEqual({ error: "Les prérequis n'ont pas pu être enregistrés." });
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
