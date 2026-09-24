import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  screen: vi.fn(),
  attachContent: vi.fn(),
  createTopic: vi.fn(),
  reply: vi.fn(),
  editPost: vi.fn(),
  hidePost: vi.fn(),
  findUser: vi.fn(),
  createNotification: vi.fn(),
  checkQaSubmission: vi.fn(),
  recordQuestProgress: vi.fn(),
  announceModeration: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("@cyberlearn/db", () => ({
  MODERATION_SURFACE: { forumTopic: "FORUM_TOPIC", forumPost: "FORUM_POST" },
  moderationRepository: { screen: m.screen, attachContent: m.attachContent },
  forumRepository: {
    createTopic: m.createTopic,
    reply: m.reply,
    editPost: m.editPost,
    hidePost: m.hidePost,
  },
  notificationRepository: { create: m.createNotification },
  prisma: { user: { findUnique: m.findUser } },
}));
vi.mock("@cyberlearn/lib", () => ({
  FLAG_BUDGET_MESSAGE: "Trop de messages signalés.",
  excerpt: (text: string) => text,
}));
vi.mock("@/lib/rate-limit", () => ({ checkQaSubmission: m.checkQaSubmission }));
vi.mock("@/lib/quests/progress", () => ({ recordQuestProgress: m.recordQuestProgress }));
vi.mock("@/lib/moderation/announce", () => ({ announceModeration: m.announceModeration }));

const { createForumTopic, editForumPost, hideForumPost, isForumAdmin, replyInForum } = await import(
  "../forum-service"
);

const TOPIC_ID = "8f7c9a52-7d3e-4c1b-9a6e-2b5d4c3a1f00";
const POST_ID = "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b";
const CLEAN = { flagged: false, throttled: false, eventId: null };
const FLAGGED = { flagged: true, throttled: false, eventId: "event-1" };

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.checkQaSubmission.mockResolvedValue({ success: true });
  m.screen.mockResolvedValue(CLEAN);
  m.findUser.mockResolvedValue({ role: "LEARNER", displayName: "Alex", username: "alex" });
});

describe("createForumTopic", () => {
  const input = {
    categorySlug: "reseau",
    title: "Subnetting en /27",
    content: "Comment on calcule ?",
  };

  it("refuses over the rate limit, before reading anything", async () => {
    m.checkQaSubmission.mockResolvedValue({ success: false });
    expect(await createForumTopic("user-1", input)).toEqual({
      ok: false,
      error: "Trop de messages. Réessaie dans une minute.",
    });
    expect(m.screen).not.toHaveBeenCalled();
  });

  it.each([
    [{ ...input, title: "Court" }],
    [{ ...input, content: "court" }],
    [{ ...input, categorySlug: "" }],
    [null],
    ["texte"],
  ])("refuses a malformed input (%#)", async (bad) => {
    const result = await createForumTopic("user-1", bad);
    expect(result.ok).toBe(false);
    expect(m.createTopic).not.toHaveBeenCalled();
  });

  it("screens the title with the body, links allowed", async () => {
    m.createTopic.mockResolvedValue({ id: "topic-1", slug: "subnetting-en-27" });
    await createForumTopic("user-1", input);
    expect(m.screen).toHaveBeenCalledWith({
      text: "Subnetting en /27\n\nComment on calcule ?",
      surface: "FORUM_TOPIC",
      userId: "user-1",
      allowLinks: true,
    });
  });

  it("writes nothing over the flag budget", async () => {
    m.screen.mockResolvedValue({ flagged: true, throttled: true, eventId: "event-1" });
    expect(await createForumTopic("user-1", input)).toEqual({
      ok: false,
      error: "Trop de messages signalés.",
    });
    expect(m.createTopic).not.toHaveBeenCalled();
  });

  it("publishes a clean thread and credits the quest", async () => {
    m.createTopic.mockResolvedValue({ id: "topic-1", slug: "subnetting-en-27" });
    expect(await createForumTopic("user-1", input)).toEqual({
      ok: true,
      href: "/forum/reseau/subnetting-en-27",
      heldForReview: false,
    });
    expect(m.createTopic).toHaveBeenCalledWith(
      expect.objectContaining({ authorId: "user-1", isHidden: false }),
    );
    expect(m.recordQuestProgress).toHaveBeenCalledWith("user-1", "FORUM_POST", expect.any(Date), {
      amount: 1,
    });
    expect(m.announceModeration).not.toHaveBeenCalled();
  });

  it("holds a flagged thread, tells its author, and credits nothing", async () => {
    m.screen.mockResolvedValue(FLAGGED);
    m.createTopic.mockResolvedValue({ id: "topic-1", slug: "subnetting-en-27" });
    const result = await createForumTopic("user-1", input);
    expect(result.heldForReview).toBe(true);
    expect(m.createTopic).toHaveBeenCalledWith(expect.objectContaining({ isHidden: true }));
    expect(m.attachContent).toHaveBeenCalledWith("event-1", "topic-1");
    expect(m.announceModeration).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", surface: "FORUM_TOPIC", stage: "held" }),
    );
    expect(m.recordQuestProgress).not.toHaveBeenCalled();
  });

  it("says so when the section does not exist", async () => {
    m.createTopic.mockResolvedValue(null);
    expect(await createForumTopic("user-1", input)).toEqual({
      ok: false,
      error: "Cette section n'existe pas.",
    });
  });
});

describe("replyInForum", () => {
  const input = { topicId: TOPIC_ID, content: "Avec un masque en 255.255.255.224." };
  const written = {
    postId: "post-9",
    notify: ["user-2", "user-3"],
    topicTitle: "Subnetting en /27",
    url: "/forum/reseau/subnetting-en-27",
  };

  it("refuses a reply to a closed or missing thread", async () => {
    m.reply.mockResolvedValue(null);
    expect(await replyInForum("user-1", input)).toEqual({
      ok: false,
      error: "Ce sujet est fermé ou n'existe plus.",
    });
  });

  it("refuses a topic id that is not one", async () => {
    expect((await replyInForum("user-1", { ...input, topicId: "abc" })).ok).toBe(false);
    expect(m.reply).not.toHaveBeenCalled();
  });

  it("replies, credits the quest and tells the participants", async () => {
    m.reply.mockResolvedValue(written);
    expect(await replyInForum("user-1", input)).toEqual({
      ok: true,
      href: written.url,
      heldForReview: false,
    });
    expect(m.createNotification).toHaveBeenCalledTimes(2);
    expect(m.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-2",
        type: "FORUM_REPLY",
        body: "Alex a répondu dans « Subnetting en /27 ».",
        actionUrl: written.url,
      }),
    );
  });

  it("holds a flagged reply, and the repository tells nobody", async () => {
    m.screen.mockResolvedValue(FLAGGED);
    m.reply.mockResolvedValue({ ...written, notify: [] });
    const result = await replyInForum("user-1", input);
    expect(result.heldForReview).toBe(true);
    expect(m.reply).toHaveBeenCalledWith(expect.objectContaining({ isHidden: true }));
    expect(m.attachContent).toHaveBeenCalledWith("event-1", "post-9");
    expect(m.createNotification).not.toHaveBeenCalled();
  });
});

describe("editForumPost", () => {
  const input = { postId: POST_ID, content: "Correction : c'est un /28." };

  it("rewrites the author's own post", async () => {
    m.editPost.mockResolvedValue(true);
    expect(await editForumPost("user-1", input)).toEqual({ ok: true, heldForReview: false });
    expect(m.editPost).toHaveBeenCalledWith("user-1", POST_ID, input.content, false);
    expect(m.revalidatePath).toHaveBeenCalledWith("/forum");
  });

  it("refreshes the page the site gave", async () => {
    m.editPost.mockResolvedValue(true);
    await editForumPost("user-1", input, "/forum/reseau/subnetting");
    expect(m.revalidatePath).toHaveBeenCalledWith("/forum/reseau/subnetting");
  });

  it("takes the post down when the new text is flagged", async () => {
    m.screen.mockResolvedValue(FLAGGED);
    m.editPost.mockResolvedValue(true);
    expect((await editForumPost("user-1", input)).heldForReview).toBe(true);
    expect(m.editPost).toHaveBeenCalledWith("user-1", POST_ID, input.content, true);
  });

  it("finds nothing to edit in somebody else's post", async () => {
    m.editPost.mockResolvedValue(false);
    expect(await editForumPost("user-1", input)).toEqual({
      ok: false,
      error: "Message introuvable.",
    });
  });
});

describe("hideForumPost", () => {
  it("passes the reader's role, read from the database", async () => {
    m.findUser.mockResolvedValue({ role: "ADMIN" });
    m.hidePost.mockResolvedValue(true);
    expect(await hideForumPost("admin-1", POST_ID)).toEqual({ ok: true });
    expect(m.hidePost).toHaveBeenCalledWith(POST_ID, { id: "admin-1", isAdmin: true });
  });

  it("refuses what the repository refuses: somebody else's post", async () => {
    m.hidePost.mockResolvedValue(false);
    expect(await hideForumPost("user-1", POST_ID)).toEqual({
      ok: false,
      error: "Message introuvable.",
    });
    expect(m.hidePost).toHaveBeenCalledWith(POST_ID, { id: "user-1", isAdmin: false });
  });

  it("refuses an id that is not one, without asking", async () => {
    expect((await hideForumPost("user-1", 42)).ok).toBe(false);
    expect(m.hidePost).not.toHaveBeenCalled();
  });
});

describe("isForumAdmin", () => {
  it("is true for an administrator only", async () => {
    m.findUser.mockResolvedValue({ role: "ADMIN" });
    expect(await isForumAdmin("u")).toBe(true);
    m.findUser.mockResolvedValue({ role: "TEACHER" });
    expect(await isForumAdmin("u")).toBe(false);
    m.findUser.mockResolvedValue(null);
    expect(await isForumAdmin("u")).toBe(false);
  });
});
