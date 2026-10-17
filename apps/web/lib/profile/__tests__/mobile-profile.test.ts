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
  findLoadout: vi.fn<(userId: string) => Promise<Record<string, string | null>>>(),
  getOverview: vi.fn<(userId: string) => Promise<unknown>>(),
  recordFor: vi.fn<(userId: string) => Promise<Record<string, number>>>(),
  recordBetween: vi.fn<(a: string, b: string) => Promise<Record<string, number>>>(),
  findOpenBetween: vi.fn<(a: string, b: string) => Promise<{ id: string } | null>>(),
  badgeCandidates: vi.fn<(userId: string) => Promise<unknown[]>>(),
  pathsOf: vi.fn<(userId: string) => Promise<unknown[]>>(),
  contributionsOf: vi.fn<(userId: string) => Promise<Record<string, number>>>(),
}));

vi.mock("@cyberlearn/db", () => ({
  userRepository: { findPublicProfile: m.findPublicProfile },
  friendshipRepository: { between: m.between },
  cosmeticRepository: { findLoadout: m.findLoadout },
  streakRepository: { getOverview: m.getOverview },
  duelRepository: {
    recordFor: m.recordFor,
    recordBetween: m.recordBetween,
    findOpenBetween: m.findOpenBetween,
  },
  profileRepository: {
    badgeCandidates: m.badgeCandidates,
    pathsOf: m.pathsOf,
    contributionsOf: m.contributionsOf,
  },
}));
vi.mock("@/lib/avatar/storage", () => ({ resolveAvatarSrc: m.resolveAvatarSrc }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const LOADOUT = {
  terminalTheme: null,
  hexagonStyle: "hex-neon",
  profileFrame: null,
  accentColor: "accent-violet",
};
const NO_CONTRIBUTIONS = { posts: 0, topics: 0, answers: 0, acceptedAnswers: 0, writeups: 0 };

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
    lessonsByCategory: [],
    pathProgress: [],
    certificates: [],
    challengeProgress: [],
    counts: { badges: 14, lessons: 1, challenges: 0, certificates: 0, paths: 0 },
    ...overrides,
  };
}

beforeEach(() => {
  for (const fn of Object.values(m)) fn.mockReset();
  m.resolveAvatarSrc.mockResolvedValue("https://signed/alex");
  m.between.mockResolvedValue(null);
  m.findLoadout.mockResolvedValue(LOADOUT);
  m.getOverview.mockResolvedValue({
    currentStreak: 4,
    longestStreak: 9,
    freezes: 1,
    active: true,
    daysThisYear: 30,
    activity: { "2026-09-01": 2 },
  });
  m.recordFor.mockResolvedValue({ win: 6, loss: 1, draw: 2, live: 1, wait: 3 });
  m.recordBetween.mockResolvedValue({ win: 2, loss: 1, draw: 0 });
  m.findOpenBetween.mockResolvedValue(null);
  m.badgeCandidates.mockResolvedValue([]);
  m.pathsOf.mockResolvedValue([]);
  m.contributionsOf.mockResolvedValue(NO_CONTRIBUTIONS);
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
        skills: [],
        certificates: [],
        challenges: [],
        counts: { badges: 14, lessons: 1, challenges: 0, certificates: 0, paths: 0 },
        activity: { days: { "2026-09-01": 2 }, daysThisYear: 30, longestStreak: 9 },
        // Results only: what the owner has going on is theirs alone.
        duelRecord: { win: 6, loss: 1, draw: 2 },
        headToHead: null,
        rarestBadges: [],
        timeline: [
          {
            kind: "badge",
            title: "Premier pas",
            at: expect.any(String) as string,
            key: "badge:ub-1",
          },
        ],
        paths: [],
        contributions: NO_CONTRIBUTIONS,
        ownerCosmetics: LOADOUT,
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

  it("shows the portfolio, with the LinkedIn link on the holder's own page only", async () => {
    const portfolio = {
      lessonsByCategory: [{ category: "DEV", count: 5 }],
      pathProgress: [
        { completedAt: new Date(), path: { title: "Linux", slug: "linux", category: "DEV" } },
      ],
      certificates: [
        {
          publicId: "c-1",
          issuedAt: new Date("2026-03-07T10:00:00Z"),
          score: 92,
          path: { title: "Linux", slug: "linux", category: "DEV" },
        },
      ],
      challengeProgress: [
        {
          completedAt: new Date("2026-04-01T00:00:00Z"),
          challenge: {
            title: "Premier flag",
            slug: "premier-flag",
            difficulty: "BEGINNER",
            category: "CYBERSEC",
          },
        },
      ],
    };
    m.findPublicProfile.mockResolvedValue(row(portfolio));
    const other = await mobileProfileView(ME, "alex");
    expect(other).toMatchObject({
      ok: true,
      profile: {
        skills: [{ category: "DEV", label: "Développement", lessons: 5, paths: ["Linux"] }],
        certificates: [
          {
            publicId: "c-1",
            pathTitle: "Linux",
            issuedAt: "2026-03-07T10:00:00.000Z",
            score: 92,
            verifyUrl: "https://cyberlearn.fr/verify/c-1",
            linkedInUrl: null,
          },
        ],
        challenges: [
          {
            title: "Premier flag",
            slug: "premier-flag",
            difficultyLabel: "Débutant",
            completedAt: "2026-04-01T00:00:00.000Z",
          },
        ],
      },
    });

    m.findPublicProfile.mockResolvedValue(row({ ...portfolio, id: ME }));
    const own = await mobileProfileView(ME, "alex");
    if (!own.ok) throw new Error("own profile refused");
    expect(own.profile.certificates[0]?.linkedInUrl).toContain("linkedin.com/profile/add?");
    expect(own.profile.certificates[0]?.linkedInUrl).toContain("certId=c-1");
  });

  it("offers no friend button on the reader's own page", async () => {
    m.findPublicProfile.mockResolvedValue(row({ id: ME }));
    const result = await mobileProfileView(ME, "alex");
    expect(result).toMatchObject({ ok: true, profile: { isSelf: true, friendship: "none" } });
    expect(m.between).not.toHaveBeenCalled();
  });

  it("sends the head-to-head to a friend only, from the reader's seat", async () => {
    m.findPublicProfile.mockResolvedValue(row());
    m.between.mockResolvedValue({ status: "ACCEPTED", requestedById: THEM });
    m.findOpenBetween.mockResolvedValue({ id: "duel-1" });
    const friend = await mobileProfileView(ME, "alex");
    expect(friend).toMatchObject({
      ok: true,
      profile: { headToHead: { win: 2, loss: 1, draw: 0, openDuelId: "duel-1" } },
    });
    expect(m.recordBetween).toHaveBeenCalledWith(ME, THEM);

    m.recordBetween.mockClear();
    m.between.mockResolvedValue({ status: "PENDING", requestedById: ME });
    const asked = await mobileProfileView(ME, "alex");
    expect(asked).toMatchObject({ ok: true, profile: { headToHead: null } });
    expect(m.recordBetween).not.toHaveBeenCalled();
  });

  it("sends the paths with their progress, the rarest badges and the contributions", async () => {
    m.findPublicProfile.mockResolvedValue(row());
    m.pathsOf.mockResolvedValue([
      {
        slug: "linux",
        title: "Linux",
        category: "DEV",
        completed: false,
        done: 6,
        total: 12,
        completedAt: null,
      },
    ]);
    m.badgeCandidates.mockResolvedValue([
      {
        id: "ub-1",
        name: "Premier pas",
        rarity: "COMMON",
        iconUrl: null,
        earnedAt: new Date(),
        holders: 40,
      },
      {
        id: "ub-2",
        name: "Légende",
        rarity: "LEGENDARY",
        iconUrl: "/l.svg",
        earnedAt: new Date(),
        holders: 2,
      },
    ]);
    m.contributionsOf.mockResolvedValue({ ...NO_CONTRIBUTIONS, answers: 3, acceptedAnswers: 1 });
    const result = await mobileProfileView(ME, "alex");
    if (!result.ok) throw new Error("profile refused");
    expect(result.profile.paths).toEqual([
      {
        slug: "linux",
        title: "Linux",
        category: "DEV",
        completed: false,
        done: 6,
        total: 12,
        percent: 50,
        completedAt: null,
      },
    ]);
    expect(result.profile.rarestBadges.map((b) => b.name)).toEqual(["Légende", "Premier pas"]);
    expect(result.profile.rarestBadges[0]).toEqual({
      id: "ub-2",
      name: "Légende",
      rarity: "LEGENDARY",
      rarityLabel: "Légendaire",
      iconUrl: "/l.svg",
      holders: 2,
    });
    expect(result.profile.contributions).toMatchObject({ answers: 3, acceptedAnswers: 1 });
  });

  it("draws the owner's look in the default one when it cannot be read", async () => {
    m.findPublicProfile.mockResolvedValue(row());
    m.findLoadout.mockRejectedValue(new Error("db down"));
    const result = await mobileProfileView(ME, "alex");
    expect(result).toMatchObject({
      ok: true,
      profile: {
        ownerCosmetics: {
          terminalTheme: null,
          hexagonStyle: null,
          profileFrame: null,
          accentColor: null,
        },
      },
    });
  });
});
