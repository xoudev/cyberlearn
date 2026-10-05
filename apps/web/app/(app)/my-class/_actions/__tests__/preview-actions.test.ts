import { beforeEach, describe, expect, it, vi } from "vitest";

const requireRequestUser = vi.fn();
vi.mock("@/lib/auth", () => ({ requireRequestUser }));

const unlocksEveryLesson = vi.fn();
vi.mock("@/lib/lessons/access", () => ({ unlocksEveryLesson }));

const teachesAnyClass = vi.fn();
const refresh = vi.fn();
const issue = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  classRepository: { teachesAnyClass },
  lessonPreviewRepository: { refresh, issue },
  LESSON_PREVIEW_TOKEN: /^[A-Za-z0-9_-]{43}$/,
}));

const { refreshLessonPreviewAction } = await import("../preview-actions");

const TOKEN = "a".repeat(43);
const FRESH = "b".repeat(43);
const DRAFT = "## un\n\nUne phrase.\n";

beforeEach(() => {
  vi.clearAllMocks();
  requireRequestUser.mockResolvedValue({ id: "u1" });
  teachesAnyClass.mockResolvedValue(true);
  unlocksEveryLesson.mockResolvedValue(false);
  refresh.mockResolvedValue(true);
  issue.mockResolvedValue(FRESH);
});

describe("refreshLessonPreviewAction (teacher)", () => {
  it("refreshes the teacher's preview and answers an address on this site", async () => {
    const result = await refreshLessonPreviewAction({ token: TOKEN, contentMdx: DRAFT });
    expect(result).toEqual({ ok: true, token: TOKEN, url: `/preview/${TOKEN}` });
    expect(refresh).toHaveBeenCalledWith("u1", TOKEN, DRAFT, expect.any(Date));
  });

  it("issues a token when the editor has none, or when its token no longer matches", async () => {
    await expect(
      refreshLessonPreviewAction({ token: null, contentMdx: DRAFT }),
    ).resolves.toMatchObject({ ok: true, token: FRESH, url: `/preview/${FRESH}` });
    refresh.mockResolvedValue(false);
    await expect(
      refreshLessonPreviewAction({ token: TOKEN, contentMdx: DRAFT }),
    ).resolves.toMatchObject({ ok: true, token: FRESH });
    expect(issue).toHaveBeenCalledTimes(2);
  });

  it("is for teachers and administrators, not for every signed-in account", async () => {
    teachesAnyClass.mockResolvedValue(false);
    await expect(refreshLessonPreviewAction({ token: null, contentMdx: DRAFT })).resolves.toEqual({
      ok: false,
      error: "L'aperçu est réservé aux enseignants.",
    });
    expect(issue).not.toHaveBeenCalled();

    unlocksEveryLesson.mockResolvedValue(true);
    await expect(
      refreshLessonPreviewAction({ token: null, contentMdx: DRAFT }),
    ).resolves.toMatchObject({ ok: true });
  });

  it("refuses a draft that does not render, and stores nothing", async () => {
    const result = await refreshLessonPreviewAction({
      token: null,
      contentMdx: '<Quiz id="q" question="?" options={["a", "b"]} correct={True} />',
    });
    expect(result.ok).toBe(false);
    expect(issue).not.toHaveBeenCalled();
  });
});
