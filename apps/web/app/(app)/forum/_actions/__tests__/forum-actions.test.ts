import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireRequestUser: vi.fn(),
  editForumPost: vi.fn(),
  hideForumPost: vi.fn(),
  isForumAdmin: vi.fn(),
  setLocked: vi.fn(),
  setPinned: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@/lib/auth", () => ({ requireRequestUser: m.requireRequestUser }));
vi.mock("@cyberlearn/db", () => ({
  forumRepository: { setLocked: m.setLocked, setPinned: m.setPinned },
}));
vi.mock("@/lib/forum/forum-service", () => ({
  createForumTopic: vi.fn(),
  replyInForum: vi.fn(),
  editForumPost: m.editForumPost,
  hideForumPost: m.hideForumPost,
  isForumAdmin: m.isForumAdmin,
}));

const { editPostAction, hidePostAction, moderateTopicAction } = await import("../forum-actions");

/**
 * The forum's server actions: every field the browser sends goes through Zod,
 * the page to refresh included - it reached revalidatePath as it came.
 */

const USER = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";
const TOPIC = "8f7c9a52-7d3e-4c1b-9a6e-2b5d4c3a1f00";
const POST = "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b";
const THREAD = "/forum/reseau/subnetting-en-27";

beforeEach(() => {
  vi.clearAllMocks();
  m.requireRequestUser.mockResolvedValue({ id: USER });
  m.editForumPost.mockResolvedValue({ ok: true });
  m.hideForumPost.mockResolvedValue({ ok: true });
  m.isForumAdmin.mockResolvedValue(true);
});

describe("editPostAction and hidePostAction", () => {
  it("hand a forum page on to the service", async () => {
    expect(await editPostAction({ postId: POST, content: "Texte corrigé.", path: THREAD })).toEqual(
      { ok: true },
    );
    expect(m.editForumPost).toHaveBeenCalledWith(
      USER,
      { postId: POST, content: "Texte corrigé." },
      THREAD,
    );

    expect(await hidePostAction({ postId: POST, path: "/forum" })).toEqual({ ok: true });
    expect(m.hideForumPost).toHaveBeenCalledWith(USER, POST, "/forum");
  });

  it.each(["/dashboard", "/forum/../admin", "/forumx", "https://evil.test/forum", "/forum/a/b/c"])(
    "refuse a page outside the forum (%s) before anything is written or revalidated",
    async (path) => {
      expect(await editPostAction({ postId: POST, content: "Texte.", path })).toMatchObject({
        ok: false,
      });
      expect(await hidePostAction({ postId: POST, path })).toMatchObject({ ok: false });
      expect(m.editForumPost).not.toHaveBeenCalled();
      expect(m.hideForumPost).not.toHaveBeenCalled();
      expect(m.revalidatePath).not.toHaveBeenCalled();
    },
  );
});

describe("moderateTopicAction", () => {
  it("locks and pins, then refreshes the thread", async () => {
    expect(
      await moderateTopicAction({ topicId: TOPIC, locked: true, pinned: false, path: THREAD }),
    ).toEqual({ ok: true });
    expect(m.setLocked).toHaveBeenCalledWith(TOPIC, true);
    expect(m.setPinned).toHaveBeenCalledWith(TOPIC, false);
    expect(m.revalidatePath).toHaveBeenCalledWith(THREAD);
  });

  it("keeps the action to administrators", async () => {
    m.isForumAdmin.mockResolvedValue(false);
    expect(await moderateTopicAction({ topicId: TOPIC, locked: true, path: THREAD })).toEqual({
      ok: false,
      error: "Action réservée.",
    });
    expect(m.setLocked).not.toHaveBeenCalled();
  });

  it("says a topic id that is not one is not found", async () => {
    expect(await moderateTopicAction({ topicId: "nope", locked: true, path: THREAD })).toEqual({
      ok: false,
      error: "Sujet introuvable.",
    });
  });

  it("refuses a flag that is not a boolean instead of letting Prisma fail with a 500", async () => {
    // SAFETY: deliberately the wrong type, to stand for a call made by hand -
    // a server action is an endpoint, and the browser can send it anything.
    const locked = "yes" as unknown as boolean;
    const result = await moderateTopicAction({ topicId: TOPIC, locked, path: THREAD });
    expect(result).toMatchObject({ ok: false });
    expect(m.setLocked).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a page outside the forum", async () => {
    expect(await moderateTopicAction({ topicId: TOPIC, pinned: true, path: "/" })).toMatchObject({
      ok: false,
    });
    expect(m.setPinned).not.toHaveBeenCalled();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});
