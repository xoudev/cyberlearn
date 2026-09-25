import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  request:
    vi.fn<
      (
        a: string,
        b: string,
      ) => Promise<
        { ok: true; status: "PENDING" | "ACCEPTED" } | { ok: false; reason: "SELF" | "ALREADY" }
      >
    >(),
  accept: vi.fn<(a: string, b: string) => Promise<boolean>>(),
  remove: vi.fn<(a: string, b: string) => Promise<boolean>>(),
  listIncoming: vi.fn<(u: string, n: number) => Promise<unknown[]>>(),
  listFriends: vi.fn<(u: string, n: number) => Promise<unknown[]>>(),
  listOutgoing: vi.fn<(u: string, n: number) => Promise<unknown[]>>(),
  createNotification: vi.fn<(data: unknown) => Promise<void>>(),
  findUser: vi.fn<(args: unknown) => Promise<unknown>>(),
  resolveAvatarSrcMany: vi.fn<(values: (string | null)[]) => Promise<(string | null)[]>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  friendshipRepository: {
    request: m.request,
    accept: m.accept,
    remove: m.remove,
    listIncoming: m.listIncoming,
    listFriends: m.listFriends,
    listOutgoing: m.listOutgoing,
  },
  notificationRepository: { create: m.createNotification },
  prisma: { user: { findUnique: m.findUser } },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrcMany: m.resolveAvatarSrcMany }));

const { acceptFriendship, listFriendsFor, removeFriendship, requestFriendship } = await import(
  "../friends-service"
);
const { toMobileFriendLists } = await import("../mobile-view");

const ME = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";
const THEM = "1c0b9a8d-7e6f-4b5a-8c3d-2e1f0a9b8c7d";

function edge(id: string, avatarUrl: string | null, displayName = `Nom ${id}`) {
  return {
    id: `edge-${id}`,
    status: "PENDING" as const,
    requestedById: id,
    createdAt: new Date("2026-09-20T10:00:00Z"),
    person: { id, username: `u${id}`, displayName, avatarUrl, level: 3, xpTotal: 420 },
  };
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.findUser.mockResolvedValue({
    displayName: "Alex",
    username: "alex",
    preferences: { publicProfile: true },
  });
});

describe("requestFriendship", () => {
  it("refuses an id that is not one, before touching the table", async () => {
    expect(await requestFriendship(ME, "nope")).toEqual({
      ok: false,
      error: "Compte introuvable.",
    });
    expect(await requestFriendship(ME, undefined)).toMatchObject({ ok: false });
    expect(m.request).not.toHaveBeenCalled();
  });

  it("asks, and tells the other person with a link to the asker's profile", async () => {
    m.request.mockResolvedValue({ ok: true, status: "PENDING" });
    expect(await requestFriendship(ME, THEM)).toEqual({ ok: true, becameFriends: false });
    expect(m.request).toHaveBeenCalledWith(ME, THEM);
    expect(m.createNotification.mock.calls[0]?.[0]).toMatchObject({
      userId: THEM,
      type: "FRIEND_REQUEST",
      body: "Alex souhaite t'ajouter.",
      actionUrl: "/u/alex",
    });
  });

  it("leaves the link out when the asker's profile is closed to a stranger", async () => {
    m.request.mockResolvedValue({ ok: true, status: "PENDING" });
    m.findUser.mockResolvedValue({
      displayName: "",
      username: "alex",
      preferences: { publicProfile: false },
    });
    await requestFriendship(ME, THEM);
    const sent = m.createNotification.mock.calls[0]?.[0];
    expect(sent).toMatchObject({ body: "alex souhaite t'ajouter." });
    expect(sent).not.toHaveProperty("actionUrl");
  });

  it("turns into agreeing when they had already asked, and says so", async () => {
    m.request.mockResolvedValue({ ok: true, status: "ACCEPTED" });
    m.findUser.mockResolvedValue({
      displayName: "Alex",
      username: "alex",
      preferences: { publicProfile: false },
    });
    expect(await requestFriendship(ME, THEM)).toEqual({ ok: true, becameFriends: true });
    // Friends by the time it is read, so the closed profile opens for them.
    expect(m.createNotification.mock.calls[0]?.[0]).toMatchObject({
      type: "FRIEND_ACCEPTED",
      actionUrl: "/u/alex",
    });
  });

  it.each([
    ["SELF", "Tu ne peux pas t'ajouter toi-même."],
    ["ALREADY", "Vous êtes déjà en relation."],
  ] as const)("explains a refusal (%s) and tells nobody", async (reason, error) => {
    m.request.mockResolvedValue({ ok: false, reason });
    expect(await requestFriendship(ME, THEM)).toEqual({ ok: false, error });
    expect(m.createNotification).not.toHaveBeenCalled();
  });
});

describe("acceptFriendship", () => {
  it("accepts and tells the asker", async () => {
    m.accept.mockResolvedValue(true);
    expect(await acceptFriendship(ME, THEM)).toEqual({ ok: true });
    expect(m.accept).toHaveBeenCalledWith(ME, THEM);
    expect(m.createNotification.mock.calls[0]?.[0]).toMatchObject({
      userId: THEM,
      type: "FRIEND_ACCEPTED",
      body: "Alex a accepté ta demande.",
    });
  });

  it("says so when the request is no longer waiting, and tells nobody", async () => {
    m.accept.mockResolvedValue(false);
    expect(await acceptFriendship(ME, THEM)).toEqual({
      ok: false,
      error: "Cette demande n'est plus en attente.",
    });
    expect(m.createNotification).not.toHaveBeenCalled();
  });
});

describe("removeFriendship", () => {
  it("removes the row between the two, and tells nobody", async () => {
    m.remove.mockResolvedValue(true);
    expect(await removeFriendship(ME, THEM)).toEqual({ ok: true });
    expect(m.remove).toHaveBeenCalledWith(ME, THEM);
    expect(m.createNotification).not.toHaveBeenCalled();
  });

  it("refuses an id that is not one", async () => {
    expect(await removeFriendship(ME, 42)).toMatchObject({ ok: false });
    expect(m.remove).not.toHaveBeenCalled();
  });
});

describe("listFriendsFor", () => {
  it("signs every avatar in one call and keeps each list in its place", async () => {
    m.listIncoming.mockResolvedValue([edge("a", "__upload:a.png")]);
    m.listFriends.mockResolvedValue([edge("b", "__glyph:skull"), edge("c", null)]);
    m.listOutgoing.mockResolvedValue([edge("d", "/avatars/d.svg")]);
    m.resolveAvatarSrcMany.mockResolvedValue([
      "https://signed/a",
      "__glyph:skull",
      null,
      "/avatars/d.svg",
    ]);

    const lists = await listFriendsFor(ME);
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledTimes(1);
    expect(lists.incoming.map((e) => e.avatarSrc)).toEqual(["https://signed/a"]);
    expect(lists.friends.map((e) => e.person.id)).toEqual(["b", "c"]);
    expect(lists.outgoing.map((e) => e.avatarSrc)).toEqual(["/avatars/d.svg"]);
  });

  it("reaches the app without the stored avatar value", async () => {
    m.listIncoming.mockResolvedValue([edge("a", "__upload:a.png", "")]);
    m.listFriends.mockResolvedValue([]);
    m.listOutgoing.mockResolvedValue([]);
    m.resolveAvatarSrcMany.mockResolvedValue(["https://signed/a"]);

    const app = toMobileFriendLists(await listFriendsFor(ME));
    expect(app.incoming).toEqual([
      {
        id: "a",
        username: "ua",
        // An empty display name falls through to the handle.
        name: "ua",
        level: 3,
        xpTotal: 420,
        avatar: "https://signed/a",
        since: "2026-09-20T10:00:00.000Z",
      },
    ]);
    expect(JSON.stringify(app)).not.toContain("__upload:");
  });
});
