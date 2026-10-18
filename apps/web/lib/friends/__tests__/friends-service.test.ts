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
  decline: vi.fn<(a: string, b: string) => Promise<boolean>>(),
  openOpponentsOf: vi.fn<(u: string) => Promise<Set<string>>>(),
  findPublicPlayerId: vi.fn<(username: string) => Promise<string | null>>(),
  listIncoming: vi.fn<(u: string, n?: number) => Promise<unknown[]>>(),
  listFriends: vi.fn<(u: string, n?: number) => Promise<unknown[]>>(),
  listOutgoing: vi.fn<(u: string, n?: number) => Promise<unknown[]>>(),
  createNotification: vi.fn<(data: unknown) => Promise<void>>(),
  findUser: vi.fn<(args: unknown) => Promise<unknown>>(),
  resolveAvatarSrcMany: vi.fn<(values: (string | null)[]) => Promise<(string | null)[]>>(),
  notifyingWrite: vi.fn<(userId: string) => Promise<{ success: boolean }>>(),
  profilesOpenTo: vi.fn<(viewerId: string, ids: readonly string[]) => Promise<Set<string>>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  friendshipRepository: {
    request: m.request,
    accept: m.accept,
    remove: m.remove,
    decline: m.decline,
    listIncoming: m.listIncoming,
    listFriends: m.listFriends,
    listOutgoing: m.listOutgoing,
  },
  notificationRepository: { create: m.createNotification },
  duelRepository: { openOpponentsOf: m.openOpponentsOf },
  leaderboardRepository: { findPublicPlayerId: m.findPublicPlayerId },
  prisma: { user: { findUnique: m.findUser } },
  userRepository: { profilesOpenTo: m.profilesOpenTo },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrcMany: m.resolveAvatarSrcMany }));
vi.mock("@/lib/rate-limit", () => ({ checkNotifyingWrite: m.notifyingWrite }));

const {
  acceptFriendship,
  declineFriendship,
  listFriendsFor,
  removeFriendship,
  requestFriendship,
  requestFriendshipByHandle,
} = await import("../friends-service");
const { toMobileFriendLists } = await import("../mobile-view");

const ME = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";
const THEM = "1c0b9a8d-7e6f-4b5a-8c3d-2e1f0a9b8c7d";

function edge(
  id: string,
  avatarUrl: string | null,
  displayName = `Nom ${id}`,
  status: "PENDING" | "ACCEPTED" = "PENDING",
) {
  return {
    id: `edge-${id}`,
    status,
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
  m.profilesOpenTo.mockImplementation((_viewer, ids) => Promise.resolve(new Set(ids)));
  m.openOpponentsOf.mockResolvedValue(new Set());
});

describe("requestFriendship", () => {
  beforeEach(() => {
    m.notifyingWrite.mockResolvedValue({ success: true });
  });

  it("stops asking once the hour's budget is spent, before touching the table", async () => {
    m.notifyingWrite.mockResolvedValue({ success: false });
    expect(await requestFriendship(ME, THEM)).toMatchObject({ ok: false });
    expect(m.notifyingWrite).toHaveBeenCalledWith(ME);
    expect(m.request).not.toHaveBeenCalled();
    expect(m.createNotification).not.toHaveBeenCalled();
  });

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
      // Who asked, so the notice can be answered in place.
      metadata: { fromUserId: ME },
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

describe("requestFriendshipByHandle", () => {
  beforeEach(() => {
    m.notifyingWrite.mockResolvedValue({ success: true });
    m.request.mockResolvedValue({ ok: true, status: "PENDING" });
  });

  it("finds the player among those the public board names, then asks them", async () => {
    m.findPublicPlayerId.mockResolvedValue(THEM);
    expect(await requestFriendshipByHandle(ME, " @Alex ")).toEqual({
      ok: true,
      becameFriends: false,
    });
    expect(m.findPublicPlayerId).toHaveBeenCalledWith("alex");
    expect(m.request).toHaveBeenCalledWith(ME, THEM);
  });

  it("refuses a handle the board does not show, or that cannot be one, and asks nobody", async () => {
    m.findPublicPlayerId.mockResolvedValue(null);
    expect(await requestFriendshipByHandle(ME, "anonyme")).toEqual({
      ok: false,
      error: "Compte introuvable.",
    });
    expect(await requestFriendshipByHandle(ME, "a")).toMatchObject({ ok: false });
    expect(await requestFriendshipByHandle(ME, 42)).toMatchObject({ ok: false });
    expect(m.findPublicPlayerId).toHaveBeenCalledTimes(1);
    expect(m.request).not.toHaveBeenCalled();
  });
});

describe("declineFriendship", () => {
  it("refuses the request, and tells nobody", async () => {
    m.decline.mockResolvedValue(true);
    expect(await declineFriendship(ME, THEM)).toEqual({ ok: true });
    expect(m.decline).toHaveBeenCalledWith(ME, THEM);
    expect(m.remove).not.toHaveBeenCalled();
    expect(m.createNotification).not.toHaveBeenCalled();
  });

  it("says so when nothing waits any more: a friendship made meanwhile stays", async () => {
    m.decline.mockResolvedValue(false);
    expect(await declineFriendship(ME, THEM)).toEqual({
      ok: false,
      error: "Cette demande n'est plus en attente.",
    });
    expect(await declineFriendship(ME, "nope")).toMatchObject({ ok: false });
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
    // Every list whole: no hidden cap left on any of the three.
    expect(m.listIncoming).toHaveBeenCalledWith(ME);
    expect(m.listFriends).toHaveBeenCalledWith(ME);
    expect(m.listOutgoing).toHaveBeenCalledWith(ME);
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
        profileOpen: true,
        duelOpen: false,
      },
    ]);
    expect(JSON.stringify(app)).not.toContain("__upload:");
  });

  it("says, per row, whether the reader would be let into the profile", async () => {
    // A private profile behind a pending request opens nothing: the reader is
    // still a stranger to it, so its name must not lead to a 404.
    m.listIncoming.mockResolvedValue([edge("a", null)]);
    m.listFriends.mockResolvedValue([edge("b", null)]);
    m.listOutgoing.mockResolvedValue([edge("c", null)]);
    m.resolveAvatarSrcMany.mockResolvedValue([null, null, null]);
    m.profilesOpenTo.mockResolvedValue(new Set(["b"]));

    const lists = await listFriendsFor(ME);
    expect(m.profilesOpenTo).toHaveBeenCalledTimes(1);
    expect(m.profilesOpenTo).toHaveBeenCalledWith(ME, ["a", "b", "c"]);
    expect(lists.incoming[0]?.profileOpen).toBe(false);
    expect(lists.friends[0]?.profileOpen).toBe(true);
    expect(lists.outgoing[0]?.profileOpen).toBe(false);
    expect(toMobileFriendLists(lists).incoming[0]?.profileOpen).toBe(false);
  });

  it("says which friend a duel is still open with, and never on a request", async () => {
    m.listIncoming.mockResolvedValue([edge("a", null)]);
    m.listFriends.mockResolvedValue([
      edge("b", null, "B", "ACCEPTED"),
      edge("c", null, "C", "ACCEPTED"),
    ]);
    m.listOutgoing.mockResolvedValue([]);
    m.resolveAvatarSrcMany.mockResolvedValue([null, null, null]);
    m.openOpponentsOf.mockResolvedValue(new Set(["a", "b"]));

    const lists = await listFriendsFor(ME);
    expect(m.openOpponentsOf).toHaveBeenCalledWith(ME);
    expect(lists.friends.map((e) => e.duelOpen)).toEqual([true, false]);
    expect(lists.incoming[0]?.duelOpen).toBe(false);
    expect(toMobileFriendLists(lists).friends[0]?.duelOpen).toBe(true);
  });
});
