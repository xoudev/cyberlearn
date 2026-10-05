import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAction = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdminAction }));

const refresh = vi.fn();
const issue = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  lessonPreviewRepository: { refresh, issue },
  LESSON_PREVIEW_TOKEN: /^[A-Za-z0-9_-]{43}$/,
}));

vi.mock("@/lib/learner-url", () => ({
  learnerUrl: (path: string) => `https://cyberlearn.fr${path}`,
}));

const { refreshLessonPreviewAction } = await import("../preview-actions");

const TOKEN = "a".repeat(43);
const FRESH = "b".repeat(43);
const DRAFT = '## un\n\n<Callout type="info">\nBonjour.\n</Callout>\n';

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminAction.mockResolvedValue({ id: "admin-1", email: undefined, role: "ADMIN" });
  refresh.mockResolvedValue(true);
  issue.mockResolvedValue(FRESH);
});

describe("refreshLessonPreviewAction", () => {
  it("checks the caller is an admin before anything else", async () => {
    requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(refreshLessonPreviewAction({ token: null, contentMdx: DRAFT })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(issue).not.toHaveBeenCalled();
  });

  it("refreshes the editor's own preview in place", async () => {
    const result = await refreshLessonPreviewAction({ token: TOKEN, contentMdx: DRAFT });
    expect(result).toEqual({
      ok: true,
      token: TOKEN,
      url: `https://cyberlearn.fr/preview/${TOKEN}`,
    });
    expect(refresh).toHaveBeenCalledWith("admin-1", TOKEN, DRAFT, expect.any(Date));
    expect(issue).not.toHaveBeenCalled();
  });

  it("issues a token when the editor has none yet", async () => {
    const result = await refreshLessonPreviewAction({ token: null, contentMdx: DRAFT });
    expect(result).toEqual({
      ok: true,
      token: FRESH,
      url: `https://cyberlearn.fr/preview/${FRESH}`,
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(issue).toHaveBeenCalledWith("admin-1", DRAFT, expect.any(Date));
  });

  it("issues a new token when the old one is gone or somebody else's", async () => {
    refresh.mockResolvedValue(false);
    const result = await refreshLessonPreviewAction({ token: TOKEN, contentMdx: DRAFT });
    expect(result).toMatchObject({ ok: true, token: FRESH });
    expect(issue).toHaveBeenCalledTimes(1);
  });

  it("refuses a draft that does not render, naming the problem, and stores nothing", async () => {
    const result = await refreshLessonPreviewAction({
      token: TOKEN,
      // A Python True in a prop: valid MDX, invalid JavaScript (the Sentry case).
      contentMdx: '<Quiz id="q" question="?" options={["a", "b"]} correct={True} />',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
    expect(refresh).not.toHaveBeenCalled();
    expect(issue).not.toHaveBeenCalled();
  });

  it("refuses a token of the wrong shape without touching the database", async () => {
    const result = await refreshLessonPreviewAction({ token: "short", contentMdx: DRAFT });
    expect(result).toEqual({ ok: false, error: "Aperçu impossible : contenu invalide." });
    expect(refresh).not.toHaveBeenCalled();
    expect(issue).not.toHaveBeenCalled();
  });
});
