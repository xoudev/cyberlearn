import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A moderator hiding, showing again or deleting published content, and
 * closing its reports: an admin first, a checked input, the author told in
 * the words of the screen's notices, and every page that shows it redrawn.
 * The repository (and its transaction) is mocked.
 */

const requireAdminAction = vi.fn();
vi.mock("@/lib/auth", () => ({ requireAdminAction }));

const apply = vi.fn();
const dismissReports = vi.fn();
vi.mock("@cyberlearn/db", () => ({
  CONTENT_SURFACES: [
    "FORUM_POST",
    "LESSON_QUESTION",
    "LESSON_ANSWER",
    "CHALLENGE_WRITEUP",
    "CLASS_RESOURCE",
  ],
  contentModerationRepository: { apply, dismissReports },
}));

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath }));

const { moderateContentAction, dismissContentReportsAction } = await import("../content-actions");

const POST = "33333333-3333-4333-8333-333333333333";
const AUTHOR = { id: "author-1", username: "ada", displayName: "Ada" };

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

function applied(author: typeof AUTHOR | null = AUTHOR, reportsClosed = 0): unknown {
  return { ok: true, content: { id: POST, author }, reportsClosed };
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminAction.mockResolvedValue({ id: "admin-1", email: undefined, role: "ADMIN" });
  apply.mockResolvedValue(applied());
  dismissReports.mockResolvedValue(2);
});

describe("moderateContentAction", () => {
  it("checks the caller is an admin before anything else", async () => {
    requireAdminAction.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(
      moderateContentAction({}, form({ surface: "FORUM_POST", contentId: POST, gesture: "hide" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(apply).not.toHaveBeenCalled();
  });

  it("hides the content and hands the author's notice to the repository", async () => {
    apply.mockResolvedValue(applied(AUTHOR, 3));
    const state = await moderateContentAction(
      {},
      form({ surface: "LESSON_QUESTION", contentId: POST, gesture: "hide" }),
    );
    expect(apply).toHaveBeenCalledWith({
      surface: "LESSON_QUESTION",
      id: POST,
      gesture: "hide",
      actorId: "admin-1",
      notice: expect.objectContaining({ title: "Ta question n'est plus visible" }) as unknown,
    });
    expect(state).toEqual({
      ok: true,
      message: "Contenu masqué, son auteur est prévenu. 3 signalements classés.",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/moderation/content");
    expect(revalidatePath).toHaveBeenCalledWith("/moderation/reports");
    expect(revalidatePath).toHaveBeenCalledWith("/users/author-1");
  });

  it("tells the author of a deleted message in the masculine", async () => {
    await moderateContentAction(
      {},
      form({ surface: "FORUM_POST", contentId: POST, gesture: "delete" }),
    );
    const [args] = apply.mock.calls[0] as [{ notice: { title: string } }];
    expect(args.notice.title).toBe("Ton message a été supprimé");
  });

  it("does not claim to have told an erased account", async () => {
    apply.mockResolvedValue(applied(null));
    const state = await moderateContentAction(
      {},
      form({ surface: "CHALLENGE_WRITEUP", contentId: POST, gesture: "restore" }),
    );
    expect(state).toEqual({ ok: true, message: "Contenu réaffiché." });
  });

  it("says why nothing changed, and redraws the lists", async () => {
    apply.mockResolvedValue({ ok: false, reason: "PENDING_REVIEW" });
    const state = await moderateContentAction(
      {},
      form({ surface: "FORUM_POST", contentId: POST, gesture: "restore" }),
    );
    expect(state.error).toContain("file de relecture");
    expect(revalidatePath).toHaveBeenCalledWith("/moderation/content");

    apply.mockResolvedValue({ ok: false, reason: "UNCHANGED" });
    const again = await moderateContentAction(
      {},
      form({ surface: "FORUM_POST", contentId: POST, gesture: "hide" }),
    );
    expect(again.error).toContain("déjà dans cet état");
  });

  it("refuses a surface, a gesture or an id it does not know", async () => {
    for (const fields of [
      { surface: "NOTE", contentId: POST, gesture: "hide" },
      { surface: "FORUM_POST", contentId: POST, gesture: "ban" },
      { surface: "FORUM_POST", contentId: "abc", gesture: "hide" },
    ]) {
      expect(await moderateContentAction({}, form(fields))).toEqual({
        error: "Paramètres invalides.",
      });
    }
    expect(apply).not.toHaveBeenCalled();
  });
});

describe("dismissContentReportsAction", () => {
  it("closes the reports as the caller and says how many", async () => {
    const state = await dismissContentReportsAction(
      {},
      form({ surface: "CLASS_RESOURCE", contentId: POST }),
    );
    expect(dismissReports).toHaveBeenCalledWith({
      surface: "CLASS_RESOURCE",
      id: POST,
      actorId: "admin-1",
    });
    expect(state).toEqual({ ok: true, message: "Classé sans suite. 2 signalements classés." });
  });

  it("says so when somebody closed them first", async () => {
    dismissReports.mockResolvedValue(0);
    const state = await dismissContentReportsAction(
      {},
      form({ surface: "FORUM_POST", contentId: POST }),
    );
    expect(state.error).toContain("Plus aucun signalement ouvert");
  });

  it("refuses a malformed request before any write", async () => {
    expect(
      await dismissContentReportsAction({}, form({ surface: "FORUM_POST", contentId: "1" })),
    ).toEqual({ error: "Paramètres invalides." });
    expect(dismissReports).not.toHaveBeenCalled();
  });
});
