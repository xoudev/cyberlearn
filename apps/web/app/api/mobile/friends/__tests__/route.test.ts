import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  userFromBearer: vi.fn<(r: Request) => Promise<{ id: string; email: string | null } | null>>(),
  listFriendsFor: vi.fn<(u: string) => Promise<unknown>>(),
  toMobileFriendLists: vi.fn<(lists: unknown) => unknown>(),
  requestFriendship: vi.fn<(u: string, other: unknown) => Promise<unknown>>(),
  acceptFriendship: vi.fn<(u: string, other: unknown) => Promise<unknown>>(),
  removeFriendship: vi.fn<(u: string, other: unknown) => Promise<unknown>>(),
  declineFriendship: vi.fn<(u: string, other: unknown) => Promise<unknown>>(),
  requestFriendshipByHandle: vi.fn<(u: string, username: unknown) => Promise<unknown>>(),
  friendsActivityFor: vi.fn<(u: string, limit: number) => Promise<unknown>>(),
  mobileProfileView: vi.fn<(viewer: string, username: unknown) => Promise<unknown>>(),
}));

vi.mock("../../_lib/auth", () => ({ userFromBearer: m.userFromBearer }));
vi.mock("@/lib/friends/friends-service", () => ({
  listFriendsFor: m.listFriendsFor,
  requestFriendship: m.requestFriendship,
  acceptFriendship: m.acceptFriendship,
  removeFriendship: m.removeFriendship,
  declineFriendship: m.declineFriendship,
  requestFriendshipByHandle: m.requestFriendshipByHandle,
}));
vi.mock("@/lib/friends/friends-activity", async () => {
  const { z } = await import("zod");
  return {
    friendsActivityFor: m.friendsActivityFor,
    activityLimitSchema: z.coerce.number().int().min(1).max(20).default(6),
  };
});
vi.mock("@/lib/friends/mobile-view", () => ({ toMobileFriendLists: m.toMobileFriendLists }));
vi.mock("@/lib/profile/mobile-profile", () => ({ mobileProfileView: m.mobileProfileView }));

const { GET: LISTS } = await import("../route");
const { POST: REQUEST } = await import("../request/route");
const { POST: ACCEPT } = await import("../accept/route");
const { POST: REMOVE } = await import("../remove/route");
const { POST: DECLINE } = await import("../decline/route");
const { GET: ACTIVITY } = await import("../activity/route");
const { GET: PROFILE } = await import("../../profile/route");

const THEM = "1c0b9a8d-7e6f-4b5a-8c3d-2e1f0a9b8c7d";

function get(url: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/${url}`);
}
function post(url: string, body: string): NextRequest {
  return new NextRequest(`https://cyberlearn.fr/api/mobile/${url}`, { method: "POST", body });
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.userFromBearer.mockResolvedValue({ id: "user-1", email: null });
});

describe("every friends and profile route", () => {
  it.each([
    ["lists", () => LISTS(get("friends"))],
    ["request", () => REQUEST(post("friends/request", "{}"))],
    ["accept", () => ACCEPT(post("friends/accept", "{}"))],
    ["remove", () => REMOVE(post("friends/remove", "{}"))],
    ["decline", () => DECLINE(post("friends/decline", "{}"))],
    ["activity", () => ACTIVITY(get("friends/activity"))],
    ["profile", () => PROFILE(get("profile?username=alex"))],
  ])("refuses a caller the gate turns away (%s): no token, or banned", async (_n, call) => {
    m.userFromBearer.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    expect(m.listFriendsFor).not.toHaveBeenCalled();
    expect(m.requestFriendship).not.toHaveBeenCalled();
    expect(m.acceptFriendship).not.toHaveBeenCalled();
    expect(m.removeFriendship).not.toHaveBeenCalled();
    expect(m.declineFriendship).not.toHaveBeenCalled();
    expect(m.friendsActivityFor).not.toHaveBeenCalled();
    expect(m.mobileProfileView).not.toHaveBeenCalled();
  });
});

describe("GET /api/mobile/friends", () => {
  it("reads the caller's own lists and sends the app's view of them", async () => {
    m.listFriendsFor.mockResolvedValue({ raw: true });
    m.toMobileFriendLists.mockReturnValue({ incoming: [], friends: [{ id: THEM }], outgoing: [] });
    const res = await LISTS(get("friends"));
    expect(m.listFriendsFor).toHaveBeenCalledWith("user-1");
    expect(m.toMobileFriendLists).toHaveBeenCalledWith({ raw: true });
    expect(await res.json()).toEqual({
      ok: true,
      incoming: [],
      friends: [{ id: THEM }],
      outgoing: [],
    });
  });
});

describe("the three writes", () => {
  it.each([
    ["request", REQUEST, m.requestFriendship],
    ["accept", ACCEPT, m.acceptFriendship],
    ["remove", REMOVE, m.removeFriendship],
    ["decline", DECLINE, m.declineFriendship],
  ] as const)("%s: passes the caller and the other id to the service", async (name, route, fn) => {
    fn.mockResolvedValue({ ok: true });
    const res = await route(post(`friends/${name}`, JSON.stringify({ userId: THEM })));
    expect(res.status).toBe(200);
    expect(fn).toHaveBeenCalledWith("user-1", THEM);
  });

  it.each([
    ["request", REQUEST, m.requestFriendship],
    ["accept", ACCEPT, m.acceptFriendship],
    ["remove", REMOVE, m.removeFriendship],
  ] as const)("%s: answers 409 with the service's refusal", async (name, route, fn) => {
    fn.mockResolvedValue({ ok: false, error: "Vous êtes déjà en relation." });
    const res = await route(post(`friends/${name}`, JSON.stringify({ userId: THEM })));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ ok: false, error: "Vous êtes déjà en relation." });
  });

  it("hands a body without an id to the service as nothing, for it to refuse", async () => {
    m.requestFriendship.mockResolvedValue({ ok: false, error: "Compte introuvable." });
    await REQUEST(post("friends/request", JSON.stringify(["x"])));
    expect(m.requestFriendship).toHaveBeenCalledWith("user-1", null);
  });

  it("asks by handle from a line of the leaderboard, and by id as always", async () => {
    m.requestFriendshipByHandle.mockResolvedValue({ ok: true, becameFriends: false });
    const res = await REQUEST(post("friends/request", JSON.stringify({ username: "alex" })));
    expect(res.status).toBe(200);
    expect(m.requestFriendshipByHandle).toHaveBeenCalledWith("user-1", "alex");
    expect(m.requestFriendship).not.toHaveBeenCalled();

    // An id wins over a handle: the body an app has always sent.
    m.requestFriendship.mockResolvedValue({ ok: true });
    await REQUEST(post("friends/request", JSON.stringify({ userId: THEM, username: "alex" })));
    expect(m.requestFriendship).toHaveBeenCalledWith("user-1", THEM);
    expect(m.requestFriendshipByHandle).toHaveBeenCalledTimes(1);
  });

  it("takes no handle where only an id makes sense", async () => {
    m.acceptFriendship.mockResolvedValue({ ok: false, error: "Compte introuvable." });
    await ACCEPT(post("friends/accept", JSON.stringify({ username: "alex" })));
    expect(m.acceptFriendship).toHaveBeenCalledWith("user-1", null);
    expect(m.requestFriendshipByHandle).not.toHaveBeenCalled();
  });

  it("refuses a body that is not JSON", async () => {
    const res = await ACCEPT(post("friends/accept", "not json"));
    expect(res.status).toBe(400);
    expect(m.acceptFriendship).not.toHaveBeenCalled();
  });
});

describe("GET /api/mobile/friends/activity", () => {
  it("reads the caller's friends' recent moments, six unless asked", async () => {
    m.friendsActivityFor.mockResolvedValue({ hasFriends: true, items: [] });
    const res = await ACTIVITY(get("friends/activity"));
    expect(res.status).toBe(200);
    expect(m.friendsActivityFor).toHaveBeenCalledWith("user-1", 6);
    expect(await res.json()).toEqual({ ok: true, hasFriends: true, items: [] });

    await ACTIVITY(get("friends/activity?limit=3"));
    expect(m.friendsActivityFor).toHaveBeenLastCalledWith("user-1", 3);
  });

  it("refuses a limit out of bounds", async () => {
    const res = await ACTIVITY(get("friends/activity?limit=500"));
    expect(res.status).toBe(400);
    expect(m.friendsActivityFor).not.toHaveBeenCalled();
  });
});

describe("GET /api/mobile/profile", () => {
  it("reads the named profile as the caller", async () => {
    m.mobileProfileView.mockResolvedValue({ ok: true, profile: { username: "alex" } });
    const res = await PROFILE(get("profile?username=alex"));
    expect(res.status).toBe(200);
    expect(m.mobileProfileView).toHaveBeenCalledWith("user-1", "alex");
  });

  it("answers 404 for a closed or missing profile", async () => {
    m.mobileProfileView.mockResolvedValue({ ok: false, error: "Profil introuvable." });
    const res = await PROFILE(get("profile"));
    expect(res.status).toBe(404);
    expect(m.mobileProfileView).toHaveBeenCalledWith("user-1", null);
  });
});
