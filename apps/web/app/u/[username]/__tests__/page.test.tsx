import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The profile page itself: whose actions it offers to whom, and whose look
 * it wears. The data, the session and the friendship are stubbed; who may
 * open a private profile is the repository's rule (findPublicProfile).
 */

const db = vi.hoisted(() => ({
  userRepository: { findPublicProfile: vi.fn(), profileAccess: vi.fn() },
  friendshipRepository: { between: vi.fn() },
  cosmeticRepository: { findLoadout: vi.fn() },
  streakRepository: { getOverview: vi.fn() },
  duelRepository: { recordFor: vi.fn(), recordBetween: vi.fn(), findOpenBetween: vi.fn() },
  profileRepository: { badgeCandidates: vi.fn(), pathsOf: vi.fn(), contributionsOf: vi.fn() },
}));
vi.mock("@cyberlearn/db", () => db);

const auth = vi.hoisted(() => ({
  getRequestUser: vi.fn<() => Promise<{ id: string } | null>>(),
  getActiveBan: vi.fn<() => Promise<{ id: string } | null>>(),
}));
vi.mock("@/lib/auth", () => auth);

vi.mock("@/lib/avatar/storage", () => ({
  resolveAvatarSrc: (stored: string | null) => Promise.resolve(stored),
}));

vi.mock("@/app/(app)/_actions/friend-actions", () => ({
  sendFriendRequestAction: vi.fn(),
  removeFriendAction: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const { default: PublicProfilePage, generateMetadata } = await import("../page");

const OWNER = "11111111-1111-4111-8111-111111111111";
const READER = "22222222-2222-4222-8222-222222222222";

const EMPTY_LOADOUT = {
  accentColor: null,
  hexagonStyle: null,
  profileFrame: null,
  terminalTheme: null,
};

function profile(overrides: { publicProfile?: boolean } = {}): Record<string, unknown> {
  return {
    id: OWNER,
    username: "alex",
    displayName: "Alex",
    bio: "J'apprends le réseau.",
    avatarUrl: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    xpTotal: 1200,
    streakDays: 3,
    preferences: { publicProfile: overrides.publicProfile ?? true },
    badges: [],
    lessonProgress: [],
    pathProgress: [],
    certificates: [],
    challengeProgress: [],
    lessonsByCategory: [],
    counts: { badges: 0, lessons: 0, challenges: 0, certificates: 0, paths: 0 },
  };
}

const NO_CONTRIBUTIONS = { posts: 0, topics: 0, answers: 0, acceptedAnswers: 0, writeups: 0 };

async function render(): Promise<string> {
  return renderToStaticMarkup(
    await PublicProfilePage({ params: Promise.resolve({ username: "alex" }) }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.getActiveBan.mockResolvedValue(null);
  db.userRepository.findPublicProfile.mockResolvedValue(profile());
  db.userRepository.profileAccess.mockResolvedValue("public");
  db.friendshipRepository.between.mockResolvedValue(null);
  db.cosmeticRepository.findLoadout.mockResolvedValue(EMPTY_LOADOUT);
  db.streakRepository.getOverview.mockResolvedValue(null);
  db.duelRepository.recordFor.mockResolvedValue({ win: 0, loss: 0, draw: 0, live: 0, wait: 0 });
  db.duelRepository.recordBetween.mockResolvedValue({ win: 0, loss: 0, draw: 0 });
  db.duelRepository.findOpenBetween.mockResolvedValue(null);
  db.profileRepository.badgeCandidates.mockResolvedValue([]);
  db.profileRepository.pathsOf.mockResolvedValue([]);
  db.profileRepository.contributionsOf.mockResolvedValue(NO_CONTRIBUTIONS);
});

describe("the public profile page", () => {
  it("follows the page conventions: the breadcrumb, the eyebrow, the title", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const html = await render();

    expect(html).toContain('class="page-container"');
    expect(html).toContain("pg-crumb");
    expect(html).toContain('<p class="pg-eyebrow">Profil public · membre depuis');
    expect(html).toContain('<h1 class="pg-title pp-title"><em>Alex</em>.</h1>');
    expect(html).toContain('<p class="pg-lede pp-lede">J&#x27;apprends le réseau.</p>');
  });

  it("says a private profile is one, to the friend it opened to", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.userRepository.findPublicProfile.mockResolvedValue(profile({ publicProfile: false }));
    db.friendshipRepository.between.mockResolvedValue({
      status: "ACCEPTED",
      requestedById: OWNER,
    });
    const html = await render();

    expect(html).toContain("Profil privé, visible par ses amis");
  });

  it("offers nothing to do to a reader signed out", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const html = await render();

    expect(html).not.toContain("Ajouter en ami");
    expect(html).not.toContain("Modifier mon profil");
    expect(html).not.toContain("Copier le lien");
    expect(db.friendshipRepository.between).not.toHaveBeenCalled();
  });

  it("offers the owner their settings and their link, and no friendship with themselves", async () => {
    auth.getRequestUser.mockResolvedValue({ id: OWNER });
    const html = await render();

    expect(html).toMatch(/<a[^>]*href="\/settings\/profile"[^>]*>Modifier mon profil<\/a>/);
    expect(html).toContain(">Copier le lien<");
    expect(html).not.toContain("Ajouter en ami");
    expect(html).not.toContain("Défier en duel");
    expect(db.friendshipRepository.between).not.toHaveBeenCalled();
  });

  it("shows a friend the friendship and the duel, and not the owner's links", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.friendshipRepository.between.mockResolvedValue({
      status: "ACCEPTED",
      requestedById: READER,
    });
    const html = await render();

    expect(html).toContain(">Ami ✓<");
    expect(html).toContain(`href="/duels?ami=${OWNER}"`);
    expect(html).not.toContain("Retirer des amis");
    expect(html).not.toContain("Modifier mon profil");
    expect(html).not.toContain("Copier le lien");
  });

  it("lets a reader answer the owner's request either way", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.friendshipRepository.between.mockResolvedValue({
      status: "PENDING",
      requestedById: OWNER,
    });
    const html = await render();

    expect(html).toContain(">Accepter<");
    expect(html).toContain(">Refuser<");
    expect(html).not.toContain("Défier en duel");
  });

  it("wears the owner's cosmetics in its own scope, every slot stated", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.cosmeticRepository.findLoadout.mockResolvedValue({
      ...EMPTY_LOADOUT,
      accentColor: "accent-violet",
    });
    const html = await render();

    expect(db.cosmeticRepository.findLoadout).toHaveBeenCalledWith(OWNER);
    expect(html).toMatch(
      /<div class="pp-owner" data-accent="accent-violet" data-hex="hex-solid" data-frame="frame-standard" data-terminal="theme-midnight-ops">/,
    );
  });

  it("falls back to the default look when the owner's cosmetics cannot be read", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    db.cosmeticRepository.findLoadout.mockRejectedValue(new Error("db down"));
    const html = await render();

    expect(html).toContain('data-accent="accent-turquoise"');
  });

  it("offers a banned account nothing, since every button would send it to /banned", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    auth.getActiveBan.mockResolvedValue({ id: "ban" });
    const html = await render();

    expect(html).not.toContain("Ajouter en ami");
    expect(html).not.toContain("Défier en duel");
    // Read as a stranger reads it: a private profile does not open either.
    expect(db.userRepository.findPublicProfile).toHaveBeenCalledWith("alex", null);
    expect(db.friendshipRepository.between).not.toHaveBeenCalled();
  });

  it("does not offer a banned owner the settings they cannot open", async () => {
    auth.getRequestUser.mockResolvedValue({ id: OWNER });
    auth.getActiveBan.mockResolvedValue({ id: "ban" });
    const html = await render();

    expect(html).not.toContain("Modifier mon profil");
  });

  it("titles the tab with the handle of a profile the reader may open", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const meta = await generateMetadata({ params: Promise.resolve({ username: "alex" }) });
    expect(meta.title).toBe("@alex");
    // The layout's light check, not the profile: the title is not worth a full read.
    expect(db.userRepository.profileAccess).toHaveBeenCalledWith("alex", null);
    expect(db.userRepository.findPublicProfile).not.toHaveBeenCalled();
  });

  it("keeps a private profile out of search engines, and only a private one", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.userRepository.profileAccess.mockResolvedValue("private");
    const closed = await generateMetadata({ params: Promise.resolve({ username: "alex" }) });
    expect(closed.robots).toEqual({ index: false, follow: false });

    db.userRepository.profileAccess.mockResolvedValue("public");
    const open = await generateMetadata({ params: Promise.resolve({ username: "bob" }) });
    expect(open.robots).toBeUndefined();
  });

  it("does not title a 404 with the handle it hides", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    db.userRepository.profileAccess.mockResolvedValue("closed");
    await expect(
      generateMetadata({ params: Promise.resolve({ username: "fermé" }) }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("answers a profile it may not open with the 404", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    db.userRepository.findPublicProfile.mockResolvedValue(null);

    await expect(render()).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});

describe("the profile's link preview", () => {
  // "Copier le lien" hands out this address. Its preview used to be the home
  // page's, title, description and og:url included; now it is the profile's
  // own, for a profile the reader may open.
  it("is the profile's, at the profile's address", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    const metadata = await generateMetadata({ params: Promise.resolve({ username: "alex" }) });

    expect(metadata.title).toBe("@alex");
    expect(metadata.description).toContain("@alex");
    expect(metadata.alternates?.canonical).toBe("/u/alex");
    expect(metadata.openGraph).toMatchObject({ url: "/u/alex", siteName: "CyberLearn" });
  });

  it("leaves the picture to the profile's own card, drawn wide", async () => {
    // Next fills og:image from opengraph-image.tsx only when the page's own
    // openGraph names no images: the site's emblem would have hidden the card.
    auth.getRequestUser.mockResolvedValue(null);
    const metadata = await generateMetadata({ params: Promise.resolve({ username: "alex" }) });

    expect(metadata.openGraph).not.toHaveProperty("images");
    expect(metadata.twitter).toEqual({ card: "summary_large_image" });
  });
});

describe("the profile's content", () => {
  it("prints the counted figures, not the length of the bounded lists", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    db.userRepository.findPublicProfile.mockResolvedValue({
      ...profile(),
      badges: [
        {
          id: "ub-1",
          earnedAt: new Date("2026-05-01T00:00:00Z"),
          badge: { name: "Premier pas", rarity: "COMMON", iconUrl: "/b.svg" },
        },
      ],
      counts: { badges: 17, lessons: 48, challenges: 35, certificates: 0, paths: 2 },
    });
    const html = await render();

    expect(html).toMatch(/Leçons terminées<\/div>.*?48/s);
    expect(html).toMatch(/Défis résolus<\/div>.*?35/s);
    expect(html).toContain("trophées · 17");
    expect(html).toContain("et 16 autres");
  });

  it("shows a year of activity and the rarest badges, with how many hold them", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    db.streakRepository.getOverview.mockResolvedValue({
      currentStreak: 3,
      longestStreak: 21,
      freezes: 0,
      active: true,
      daysThisYear: 64,
      activity: { "2026-10-01": 2 },
    });
    db.userRepository.findPublicProfile.mockResolvedValue({
      ...profile(),
      badges: [
        {
          id: "ub-1",
          earnedAt: new Date("2026-05-01T00:00:00Z"),
          badge: { name: "Légende", rarity: "LEGENDARY", iconUrl: "/l.svg" },
        },
      ],
      counts: { badges: 1, lessons: 0, challenges: 0, certificates: 0, paths: 0 },
    });
    db.profileRepository.badgeCandidates.mockResolvedValue([
      {
        id: "ub-1",
        name: "Légende",
        rarity: "LEGENDARY",
        iconUrl: "/l.svg",
        earnedAt: new Date("2026-05-01T00:00:00Z"),
        holders: 3,
      },
    ]);
    const html = await render();

    expect(html).toContain("<b>64</b> jours actifs cette année");
    expect(html).toContain("dash-heat-grid");
    expect(html).toContain('aria-label="Ses badges les plus rares"');
    expect(html).toContain("Détenu par 3 personnes");
    expect(db.streakRepository.getOverview).toHaveBeenCalledWith(OWNER);
  });

  it("draws the paths with their bars, and the contributions and duels", async () => {
    auth.getRequestUser.mockResolvedValue(null);
    db.profileRepository.pathsOf.mockResolvedValue([
      {
        slug: "linux",
        title: "Linux",
        category: "DEV",
        completed: false,
        done: 3,
        total: 12,
        completedAt: null,
      },
    ]);
    db.profileRepository.contributionsOf.mockResolvedValue({
      ...NO_CONTRIBUTIONS,
      posts: 4,
      topics: 1,
    });
    db.duelRepository.recordFor.mockResolvedValue({ win: 5, loss: 2, draw: 0, live: 1, wait: 1 });
    const html = await render();

    expect(html).toContain('aria-label="Linux : 25 %"');
    expect(html).toContain("25 % · 3 / 12 missions");
    expect(html).toContain("messages au forum");
    expect(html).toContain("dont 1 sujet ouvert");
    expect(html).toContain("victoires");
    // A visitor sees results, not the duels its owner has going on.
    expect(html).not.toContain("en attente");
  });

  it("shows the head-to-head to a friend, from the friend's seat", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.friendshipRepository.between.mockResolvedValue({
      status: "ACCEPTED",
      requestedById: READER,
    });
    db.duelRepository.recordBetween.mockResolvedValue({ win: 3, loss: 2, draw: 1 });
    const html = await render();

    expect(html).toContain("Face à face.");
    expect(html).toContain("Tu mènes 3 à 2.");
    expect(html).toContain("1 égalité");
    expect(db.duelRepository.recordBetween).toHaveBeenCalledWith(READER, OWNER);
    expect(html).toMatch(/<a[^>]*href="\/duels\?ami=[^"]+"[^>]*>Défier<\/a>/);
  });

  it("points a friend at the duel going on rather than a new one", async () => {
    auth.getRequestUser.mockResolvedValue({ id: READER });
    db.friendshipRepository.between.mockResolvedValue({
      status: "ACCEPTED",
      requestedById: READER,
    });
    db.duelRepository.findOpenBetween.mockResolvedValue({ id: "duel-1" });
    const html = await render();

    expect(html).toContain('href="/duels/duel-1"');
    expect(html).toContain("Voir le duel en cours");
  });

  it.each([
    ["a stranger signed out", null, null],
    ["a reader who only asked", READER, { status: "PENDING", requestedById: READER }],
    ["the owner", OWNER, null],
  ])("shows no head-to-head to %s", async (_who, reader, friendship) => {
    auth.getRequestUser.mockResolvedValue(reader === null ? null : { id: reader });
    db.friendshipRepository.between.mockResolvedValue(friendship);
    const html = await render();

    expect(html).not.toContain("Face à face");
    expect(db.duelRepository.recordBetween).not.toHaveBeenCalled();
  });
});
