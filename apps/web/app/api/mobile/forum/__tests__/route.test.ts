import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  listCategories: vi.fn<(viewerId: string) => Promise<unknown[]>>(),
  listRecentTopics: vi.fn<(viewerId: string) => Promise<unknown[]>>(),
  listTopics: vi.fn<(slug: string, viewerId: string, page: number) => Promise<unknown>>(),
  findTopic:
    vi.fn<(category: string, slug: string, viewerId: string, page: number) => Promise<unknown>>(),
  resolveAvatarSrcMany: vi.fn<(values: (string | null)[]) => Promise<(string | null)[]>>(),
  isForumAdmin: vi.fn<(userId: string) => Promise<boolean>>(),
  createForumTopic: vi.fn<(userId: string, input: unknown) => Promise<unknown>>(),
  replyInForum: vi.fn<(userId: string, input: unknown) => Promise<unknown>>(),
  editForumPost: vi.fn<(userId: string, input: unknown) => Promise<unknown>>(),
  hideForumPost: vi.fn<(userId: string, postId: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@cyberlearn/db", () => ({
  POSTS_PER_PAGE: 30,
  TOPICS_PER_PAGE: 25,
  forumRepository: {
    listCategories: m.listCategories,
    listRecentTopics: m.listRecentTopics,
    listTopics: m.listTopics,
    findTopic: m.findTopic,
  },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrcMany: m.resolveAvatarSrcMany }));
vi.mock("@/lib/forum/forum-service", () => ({
  isForumAdmin: m.isForumAdmin,
  createForumTopic: m.createForumTopic,
  replyInForum: m.replyInForum,
  editForumPost: m.editForumPost,
  hideForumPost: m.hideForumPost,
}));

const { GET: FRONT } = await import("../route");
const { GET: SECTION } = await import("../section/route");
const { GET: THREAD, POST: CREATE } = await import("../topic/route");
const { POST: REPLY } = await import("../reply/route");
const { POST: EDIT } = await import("../post/edit/route");
const { POST: HIDE } = await import("../post/hide/route");

const ME = { id: "user-1", email: null };
const AUTHOR = {
  id: "user-2",
  username: "sam",
  displayName: "Sam",
  avatarUrl: "__upload:user-2/a.png",
  level: 4,
  role: "LEARNER",
};
const SUMMARY = {
  id: "topic-1",
  slug: "subnetting",
  title: "Subnetting",
  pinned: false,
  locked: false,
  replyCount: 1,
  createdAt: new Date("2026-09-20T08:00:00.000Z"),
  lastPostAt: new Date("2026-09-24T09:30:00.000Z"),
  categorySlug: "reseau",
  categoryName: "Réseau",
  categoryAccent: "#4D8BFF",
  author: AUTHOR,
  preview: "Comment…",
};

function get(path: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/forum${path}`);
}

function post(path: string, body: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/forum${path}`, { method: "POST", body });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue(ME);
  m.isForumAdmin.mockResolvedValue(false);
});

describe("every forum route", () => {
  it.each([
    ["front page", () => FRONT(get(""))],
    ["section", () => SECTION(get("/section?slug=reseau"))],
    ["thread", () => THREAD(get("/topic?category=reseau&slug=subnetting"))],
    ["new thread", () => CREATE(post("/topic", "{}"))],
    ["reply", () => REPLY(post("/reply", "{}"))],
    ["edit", () => EDIT(post("/post/edit", "{}"))],
    ["take down", () => HIDE(post("/post/hide", "{}"))],
  ])("refuses a caller the gate turns away (%s): no token, or banned", async (_name, call) => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    for (const fn of [
      m.listCategories,
      m.listTopics,
      m.findTopic,
      m.createForumTopic,
      m.replyInForum,
      m.editForumPost,
      m.hideForumPost,
    ]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it.each([
    ["new thread", () => CREATE(post("/topic", "pas du json"))],
    ["reply", () => REPLY(post("/reply", "pas du json"))],
    ["edit", () => EDIT(post("/post/edit", "pas du json"))],
    ["take down", () => HIDE(post("/post/hide", "pas du json"))],
  ])("refuses a body that is not JSON (%s)", async (_name, call) => {
    expect((await call()).status).toBe(400);
  });
});

describe("GET /api/mobile/forum", () => {
  it("lists the sections and the latest threads for the reader", async () => {
    m.listCategories.mockResolvedValue([
      {
        id: "c-1",
        slug: "reseau",
        name: "Réseau",
        description: "…",
        accent: "#4D8BFF",
        topicCount: 2,
        lastPostAt: null,
      },
    ]);
    m.listRecentTopics.mockResolvedValue([SUMMARY]);
    const res = await FRONT(get(""));
    expect(res.status).toBe(200);
    expect(m.listCategories).toHaveBeenCalledWith("user-1");
    expect(m.listRecentTopics).toHaveBeenCalledWith("user-1");
    const body = (await res.json()) as { categories: unknown[]; recent: { author: unknown }[] };
    expect(body.categories).toHaveLength(1);
    expect(body.recent[0]?.author).toEqual({
      id: "user-2",
      name: "Sam",
      level: 4,
      role: "LEARNER",
    });
  });
});

describe("GET /api/mobile/forum/section", () => {
  it("refuses a missing slug", async () => {
    expect((await SECTION(get("/section"))).status).toBe(400);
  });

  it("answers 404 for a section that does not exist", async () => {
    m.listTopics.mockResolvedValue(null);
    expect((await SECTION(get("/section?slug=nulle-part"))).status).toBe(404);
  });

  it("pages the threads, counting the pages", async () => {
    m.listTopics.mockResolvedValue({
      category: { id: "c", slug: "reseau", name: "Réseau", description: "…", accent: "#fff" },
      topics: [SUMMARY],
      total: 51,
    });
    const res = await SECTION(get("/section?slug=reseau&page=2"));
    expect(m.listTopics).toHaveBeenCalledWith("reseau", "user-1", 2);
    expect(await res.json()).toMatchObject({ page: 2, pages: 3, category: { topicCount: 51 } });
  });
});

describe("GET /api/mobile/forum/topic", () => {
  const VIEW = {
    ...SUMMARY,
    postCount: 2,
    posts: [
      {
        id: "p-1",
        content: "Question",
        createdAt: new Date("2026-09-20T08:00:00.000Z"),
        editedAt: null,
        isHidden: false,
        author: AUTHOR,
      },
      {
        id: "p-2",
        content: "Ma réponse, retirée",
        createdAt: new Date("2026-09-21T08:00:00.000Z"),
        editedAt: null,
        isHidden: true,
        author: { ...AUTHOR, id: "user-1", avatarUrl: "__glyph:skull" },
      },
    ],
  };

  it("refuses a thread named by half", async () => {
    expect((await THREAD(get("/topic?category=reseau"))).status).toBe(400);
  });

  it("answers 404 for a thread the reader cannot see", async () => {
    m.findTopic.mockResolvedValue(null);
    expect((await THREAD(get("/topic?category=reseau&slug=cache"))).status).toBe(404);
  });

  it("signs the avatars of the page's authors, and marks the reader's own posts", async () => {
    m.findTopic.mockResolvedValue(VIEW);
    m.resolveAvatarSrcMany.mockResolvedValue(["https://storage.example/signed", "__glyph:skull"]);
    const res = await THREAD(get("/topic?category=reseau&slug=subnetting"));
    expect(m.findTopic).toHaveBeenCalledWith("reseau", "subnetting", "user-1", 1);
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledWith(["__upload:user-2/a.png", "__glyph:skull"]);
    const body = (await res.json()) as {
      viewer: { isAdmin: boolean };
      posts: { mine: boolean; hidden: boolean; avatar: string | null }[];
      pages: number;
    };
    expect(body.viewer).toEqual({ isAdmin: false });
    expect(body.pages).toBe(1);
    expect(body.posts.map((p) => [p.mine, p.hidden, p.avatar])).toEqual([
      [false, false, "https://storage.example/signed"],
      [true, true, "__glyph:skull"],
    ]);
  });

  it("tells an administrator they may take posts down", async () => {
    m.findTopic.mockResolvedValue(VIEW);
    m.resolveAvatarSrcMany.mockResolvedValue([null, null]);
    m.isForumAdmin.mockResolvedValue(true);
    const body = (await (await THREAD(get("/topic?category=reseau&slug=subnetting"))).json()) as {
      viewer: { isAdmin: boolean };
    };
    expect(body.viewer.isAdmin).toBe(true);
  });
});

describe("writing", () => {
  it("opens a thread as the token's user, never as one named in the body", async () => {
    m.createForumTopic.mockResolvedValue({
      ok: true,
      href: "/forum/reseau/x",
      heldForReview: false,
    });
    const body = {
      categorySlug: "reseau",
      title: "Titre du sujet",
      content: "Contenu",
      userId: "x",
    };
    const res = await CREATE(post("/topic", JSON.stringify(body)));
    expect(res.status).toBe(200);
    expect(m.createForumTopic).toHaveBeenCalledWith("user-1", body);
  });

  it("replies as the token's user", async () => {
    m.replyInForum.mockResolvedValue({ ok: true, href: "/forum/reseau/x", heldForReview: true });
    const body = { topicId: "t", content: "Réponse" };
    const res = await REPLY(post("/reply", JSON.stringify(body)));
    expect(m.replyInForum).toHaveBeenCalledWith("user-1", body);
    expect(await res.json()).toMatchObject({ heldForReview: true });
  });

  it("edits as the token's user", async () => {
    m.editForumPost.mockResolvedValue({ ok: true, heldForReview: false });
    const body = { postId: "p", content: "Corrigé" };
    await EDIT(post("/post/edit", JSON.stringify(body)));
    expect(m.editForumPost).toHaveBeenCalledWith("user-1", body);
  });

  it("takes a post down as the token's user", async () => {
    m.hideForumPost.mockResolvedValue({ ok: true });
    await HIDE(post("/post/hide", JSON.stringify({ postId: "p-9" })));
    expect(m.hideForumPost).toHaveBeenCalledWith("user-1", "p-9");
  });

  it.each([
    ["new thread", () => CREATE(post("/topic", "{}")), m.createForumTopic],
    ["reply", () => REPLY(post("/reply", "{}")), m.replyInForum],
    ["edit", () => EDIT(post("/post/edit", "{}")), m.editForumPost],
    ["take down", () => HIDE(post("/post/hide", "{}")), m.hideForumPost],
  ])("passes a refusal on with its message (%s)", async (_name, call, service) => {
    service.mockResolvedValue({ ok: false, error: "Ce sujet est fermé ou n'existe plus." });
    const res = await call();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Ce sujet est fermé ou n'existe plus." });
  });
});
