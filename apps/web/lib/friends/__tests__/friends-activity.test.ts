import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  friendIds: vi.fn<(u: string) => Promise<Set<string>>>(),
  recentFriendActivity:
    vi.fn<(u: string, limit: number, friends?: ReadonlySet<string>) => Promise<unknown[]>>(),
  openOpponentsOf: vi.fn<(u: string) => Promise<Set<string>>>(),
  resolveAvatarSrcMany: vi.fn<(values: (string | null)[]) => Promise<(string | null)[]>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  friendshipRepository: {
    friendIds: m.friendIds,
    recentFriendActivity: m.recentFriendActivity,
  },
  duelRepository: { openOpponentsOf: m.openOpponentsOf },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrcMany: m.resolveAvatarSrcMany }));

const { activityLimitSchema, friendsActivityFor } = await import("../friends-activity");

const ME = "11111111-1111-4111-8111-111111111111";
const ALEX = "22222222-2222-4222-8222-222222222222";
const SAM = "33333333-3333-4333-8333-333333333333";

function actor(id: string, displayName: string, username: string | null, avatarUrl: string | null) {
  return { id, displayName, username, avatarUrl };
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.openOpponentsOf.mockResolvedValue(new Set());
  m.resolveAvatarSrcMany.mockImplementation((values) =>
    Promise.resolve(values.map((v) => (v === null ? null : `https://signed/${v}`))),
  );
});

describe("friendsActivityFor", () => {
  it("reads nothing more for a reader without friends, and says so", async () => {
    m.friendIds.mockResolvedValue(new Set());
    expect(await friendsActivityFor(ME)).toEqual({ hasFriends: false, items: [] });
    expect(m.recentFriendActivity).not.toHaveBeenCalled();
  });

  it("tells friends who have been quiet apart from no friends at all", async () => {
    m.friendIds.mockResolvedValue(new Set([ALEX]));
    m.recentFriendActivity.mockResolvedValue([]);
    expect(await friendsActivityFor(ME)).toEqual({ hasFriends: true, items: [] });
  });

  it("signs each friend's picture once, and says who a duel is open with", async () => {
    const friends = new Set([ALEX, SAM]);
    m.friendIds.mockResolvedValue(friends);
    m.openOpponentsOf.mockResolvedValue(new Set([SAM]));
    const alex = actor(ALEX, "Alex", "alex", "__upload:a.png");
    const sam = actor(SAM, "", "sam", null);
    m.recentFriendActivity.mockResolvedValue([
      {
        kind: "badge",
        key: "badge:1",
        at: new Date("2026-10-12T10:00:00Z"),
        title: "Premier pas",
        friend: alex,
      },
      {
        kind: "lesson",
        key: "lesson:1",
        at: new Date("2026-10-11T10:00:00Z"),
        title: "Les ports",
        friend: sam,
      },
      {
        kind: "duel",
        key: "duel:1",
        at: new Date("2026-10-10T10:00:00Z"),
        title: "Réseau",
        friend: alex,
      },
    ]);

    const { hasFriends, items } = await friendsActivityFor(ME, 6);
    // The friends already read are handed on rather than read again.
    expect(m.recentFriendActivity).toHaveBeenCalledWith(ME, 6, friends);
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledTimes(1);
    expect(m.resolveAvatarSrcMany).toHaveBeenCalledWith(["__upload:a.png", null]);
    expect(hasFriends).toBe(true);
    expect(items[0]).toEqual({
      key: "badge:1",
      kind: "badge",
      at: "2026-10-12T10:00:00.000Z",
      title: "Premier pas",
      friend: {
        id: ALEX,
        name: "Alex",
        username: "alex",
        avatarSrc: "https://signed/__upload:a.png",
        profileOpen: true,
        duelOpen: false,
      },
    });
    // An empty display name falls through to the handle.
    expect(items[1]?.friend).toMatchObject({ name: "sam", duelOpen: true });
    // The stored value stays on the server: only the signed one is sent.
    expect(JSON.stringify(items)).not.toContain("avatarUrl");
  });

  it("leaves a friend without a handle unlinked", async () => {
    m.friendIds.mockResolvedValue(new Set([ALEX]));
    m.recentFriendActivity.mockResolvedValue([
      {
        kind: "badge",
        key: "badge:1",
        at: new Date("2026-10-12T10:00:00Z"),
        title: "Premier pas",
        friend: actor(ALEX, "Alex", null, null),
      },
    ]);
    const { items } = await friendsActivityFor(ME);
    expect(items[0]?.friend.profileOpen).toBe(false);
  });
});

describe("activityLimitSchema", () => {
  it("reads the app's limit, six without one, and refuses one out of bounds", () => {
    expect(activityLimitSchema.parse(undefined)).toBe(6);
    expect(activityLimitSchema.parse("3")).toBe(3);
    expect(activityLimitSchema.safeParse("0").success).toBe(false);
    expect(activityLimitSchema.safeParse("21").success).toBe(false);
    expect(activityLimitSchema.safeParse("abc").success).toBe(false);
  });
});
