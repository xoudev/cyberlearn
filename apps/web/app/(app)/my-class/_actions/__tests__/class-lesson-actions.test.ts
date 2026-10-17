import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRequestUser = vi.fn();
vi.mock("@/lib/auth", () => ({ requireRequestUser }));

const canEditClassLesson = vi.fn();
const updateClassLesson = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  classRepository: { canEditClassLesson, updateClassLesson },
  prisma: { auditLog: { create: vi.fn() } },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateClassLessonAction } = await import("../class-lesson-actions");

const LESSON_ID = "00000000-0000-4000-8000-000000000001";

/** U+2014, built rather than written: the typography check reads this file. */
const EM_DASH = String.fromCharCode(0x2014);

/** The teacher's editor, as the browser posts it. */
function lessonForm(contentMdx: string): FormData {
  const form = new FormData();
  form.set("lessonId", LESSON_ID);
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
  requireRequestUser.mockResolvedValue({ id: "u1" });
  canEditClassLesson.mockResolvedValue(true);
});

describe("updateClassLessonAction", () => {
  // The schema trims the lesson before it is checked; the editor marks the
  // text as the teacher typed it, blank lines at the top included.
  it("marks each problem at its line in the text as typed, and saves nothing", async () => {
    const state = await updateClassLessonAction(
      {},
      lessonForm(`\n\n## Suite\n\nUn mot ${EM_DASH} un autre.\n\n<Quiz correct={True} />\n`),
    );
    expect(state.problems?.map(({ line, column }) => ({ line, column }))).toEqual([
      { line: 7, column: 16 },
      { line: 5, column: 8 },
    ]);
    expect(state.error).toMatch(
      /^La section « Suite » ne s'afficherait pas \(ligne 7, colonne 16\)/,
    );
    expect(updateClassLesson).not.toHaveBeenCalled();
  });

  it("refuses an em dash in the description, which is published with the lesson", async () => {
    const form = lessonForm("## S\n\nUn mot, puis un autre.\n");
    form.set("description", `Une description ${EM_DASH} assez longue.`);
    const state = await updateClassLessonAction({}, form);
    expect(state.error).toMatch(/^La description contient un tiret cadratin/);
    expect(updateClassLesson).not.toHaveBeenCalled();
  });

  it("saves a lesson that renders and keeps the rules", async () => {
    const state = await updateClassLessonAction({}, lessonForm("## S\n\nUn mot, puis un autre.\n"));
    expect(state).toEqual({ ok: true });
    expect(updateClassLesson).toHaveBeenCalledTimes(1);
  });
});
