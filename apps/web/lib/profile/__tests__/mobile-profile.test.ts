import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  findPublicProfile: vi.fn<(username: string, viewerId: string | null) => Promise<unknown>>(),
  between:
    vi.fn<
      (
        a: string,
        b: string,
      ) => Promise<{ status: "PENDING" | "ACCEPTED"; requestedById: string } | null>
    >(),
  resolveAvatarSrc: vi.fn<(value: string | null) => Promise<string | null>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  userRepository: { findPublicProfile: m.findPublicProfile },
  friendshipRepository: { between: m.between },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrc: m.resolveAvatarSrc }));

const { mobileProfileView } = await import("../mobile-profile");

const ME = "0b9a8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";
const THEM = "1c0b9a8d-7e6f-4b5a-8c3d-2e1f0a9b8c7d";

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: THEM,
    username: "alex",
    displayName: "Alex",
    email: "alex@example.test",
    role: "STUDENT",
    bio: "Réseaux avant tout.",
    avatarUrl: "__upload:alex.png",
    createdAt: new Date("2026-01-15T09:00:00Z"),
    xpTotal: 0,
    streakDays: 4,
    preferences: { publicProfile: true },
    badges: [
      {
        id: "ub-1",
        earnedAt: new Date(),
        badge: { name: "Premier pas", rarity: "COMMON", iconUrl: "/badges/first.svg" },
      },
    ],
    lessonProgress: [
      {
        completedAt: new Date("2026-09-01T08:00:00Z"),
        lesson: { title: "TCP", slug: "tcp", category: "NETWORK" },
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.resolveAvatarSrc.mockResolvedValue("https://signed/alex");
  m.between.mockResolvedValue(null);
});

describe("mobileProfileView", () => {
  it("reads through the site's gate, with the reader as viewer", async () => {
    m.findPublicProfile.mockResolvedValue(row());
    await mobileProfileView(ME, " alex ");
    expect(m.findPublicProfile).toHaveBeenCalledWith("alex", ME);
  });

  it("answers not found for a closed or missing profile, as the site's 404 does", async () => {
    m.findPublicProfile.mockResolvedValue(null);
    expect(await mobileProfileView(ME, "alex")).toEqual({
      ok: false,
      error: "Profil introuvable.",
    });
  });

  it.each([[null], [""], ["x".repeat(65)]])("refuses a handle that is not one (%j)", async (u) => {
    expect(await mobileProfileView(ME, u)).toMatchObject({ ok: false });
    expect(m.findPublicProfile).not.toHaveBeenCalled();
  });

  it("sends only what the page shows: no e-mail, no role, no stored avatar key", async () => {
    m.findPublicProfile.mockResolvedValue(row());
    const result = await mobileProfileView(ME, "alex");
    expect(result).toEqual({
      ok: true,
      profile: {
        id: THEM,
        username: "alex",
        displayName: "Alex",
        bio: "Réseaux avant tout.",
        avatar: "https://signed/alex",
        joinedAt: "2026-01-15T09:00:00.000Z",
        xpTotal: 0,
        streakDays: 4,
        level: { level: 1, current: 0, needed: expect.any(Number) as number },
        isPrivate: false,
        isSelf: false,
        friendship: "none",
        badges: [
          { id: "ub-1", name: "Premier pas", rarity: "COMMON", iconUrl: "/badges/first.svg" },
        ],
        recentLessons: [
          {
            title: "TCP",
            slug: "tcp",
            category: "NETWORK",
            completedAt: "2026-09-01T08:00:00.000Z",
          },
        ],
      },
    });
    const text = JSON.stringify(result);
    expect(text).not.toContain("alex@example.test");
    expect(text).not.toContain("__upload:");
    expect(text).not.toContain("STUDENT");
  });

  it.each([
    [{ status: "ACCEPTED" as const, requestedById: ME }, "friends"],
    [{ status: "PENDING" as const, requestedById: ME }, "outgoing"],
    [{ status: "PENDING" as const, requestedById: THEM }, "incoming"],
  ])("says where the reader stands (%j → %s)", async (friendship, view) => {
    m.findPublicProfile.mockResolvedValue(row({ preferences: { publicProfile: false } }));
    m.between.mockResolvedValue(friendship);
    const result = await mobileProfileView(ME, "alex");
    expect(result).toMatchObject({ ok: true, profile: { friendship: view, isPrivate: true } });
  });

  it("offers no friend button on the reader's own page", async () => {
    m.findPublicProfile.mockResolvedValue(row({ id: ME }));
    const result = await mobileProfileView(ME, "alex");
    expect(result).toMatchObject({ ok: true, profile: { isSelf: true, friendship: "none" } });
    expect(m.between).not.toHaveBeenCalled();
  });
});
