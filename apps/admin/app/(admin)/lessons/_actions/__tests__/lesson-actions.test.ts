import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAction = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdminAction }));

const lessonCreate = vi.fn();
const auditCreate = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  prisma: { lesson: { create: lessonCreate }, auditLog: { create: auditCreate } },
}));

const redirect = vi.fn();
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { createLessonAction } = await import("../lesson-actions");

/** U+2014, built rather than written: the typography check reads this file. */
const EM_DASH = String.fromCharCode(0x2014);

/** The new-lesson form, as the browser posts it. */
function lessonForm(contentMdx: string): FormData {
  const form = new FormData();
  form.set("refCode", "CL-LSN-001-V01");
  form.set("slug", "une-lecon");
  form.set("title", "Une leçon");
  form.set("description", "Une description assez longue.");
  form.set("category", "DEV");
  form.set("difficulty", "BEGINNER");
  form.set("estimatedMinutes", "10");
  form.set("xpReward", "50");
  form.set("contentMdx", contentMdx);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminAction.mockResolvedValue({ id: "admin-1", email: undefined, role: "ADMIN" });
  lessonCreate.mockResolvedValue({ id: "l1", title: "Une leçon", status: "DRAFT" });
});

describe("createLessonAction", () => {
  // The schema trims the lesson before it is checked; the editor marks the
  // text as typed, blank lines at the top included.
  it("marks each problem at its line in the text as typed, and stores nothing", async () => {
    const state = await createLessonAction(
      {},
      lessonForm(
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
    expect(lessonCreate).not.toHaveBeenCalled();
  });

  it("says what to correct when the lesson renders but breaks a rule", async () => {
    const state = await createLessonAction(
      {},
      lessonForm(`\n## S\n\nUn mot ${EM_DASH} un autre.\n`),
    );
    expect(state.error).toBe("Le contenu est à corriger.");
    expect(state.problems?.map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 4, column: 8 },
    ]);
    expect(lessonCreate).not.toHaveBeenCalled();
  });

  it("refuses an em dash in the title, which is published with the lesson", async () => {
    const form = lessonForm("## S\n\nUn mot, puis un autre.\n");
    form.set("title", `Une leçon ${EM_DASH} la suite`);
    const state = await createLessonAction({}, form);
    expect(state.fieldErrors?.title).toMatch(/^Le titre contient un tiret cadratin/);
    // The content went unchecked: the editor keeps what it marks.
    expect(state.problems).toBeUndefined();
    expect(lessonCreate).not.toHaveBeenCalled();
  });

  it("refuses a lesson too short once trimmed, before the content check", async () => {
    const state = await createLessonAction({}, lessonForm("\n\n  ## S  \n\n"));
    expect(state.fieldErrors?.contentMdx).toBeDefined();
    expect(state.problems).toBeUndefined();
    expect(lessonCreate).not.toHaveBeenCalled();
  });

  // The empty list takes down what an earlier save marked in the editor.
  it("says the content passed when the save fails after the check", async () => {
    lessonCreate.mockRejectedValue(new Error("Unique constraint failed on the fields: (`slug`)"));
    const state = await createLessonAction({}, lessonForm("## S\n\nUn mot, puis un autre.\n"));
    expect(state.fieldErrors?.slug).toBe("Déjà utilisé");
    expect(state.problems).toEqual([]);
  });

  it("creates a lesson that renders and keeps the rules, with its text trimmed", async () => {
    await createLessonAction({}, lessonForm("\n\n## S\n\nUn mot, puis un autre.\n"));
    expect(lessonCreate.mock.lastCall).toMatchObject([
      { data: { contentMdx: "## S\n\nUn mot, puis un autre." } },
    ]);
    expect(redirect).toHaveBeenCalledWith("/lessons");
  });
});
